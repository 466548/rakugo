/**
 * 師匠マッチング（F-01）。
 * 好み入力（自由文 / URL / 師匠名）→ 芸風の近い現役師匠を理由つきで提案。
 *
 * 設計（ハイブリッド）:
 *  - 候補選定は「ルールベース（芸風タグの一致＋初心者度）」で決定的に行う（精度が安定する）。
 *  - 理由文だけ Gemini(ADK) に生成させる（自然文・説明可能性）。AI 不可/失敗時は定型文。
 *  これにより flash の選定ブレに依存せず、芸風に忠実な候補＋自然な理由を両立する。
 */
import { z } from 'zod';
import type { Rakugoka, StyleTag } from '../domain/types';
import type { PreferenceInput } from '../domain/schema';
import { isAiEnabled, runStructuredAgent } from './provider';

export interface RakugokaMatch {
  rakugoka: Rakugoka;
  reason: string;
  score: number;
}

export interface MatchOutput {
  /** 理由文の生成元（候補選定は常にルールベース） */
  mode: 'gemini' | 'mock';
  inferredStyles: StyleTag[];
  matches: RakugokaMatch[];
}

/** 入力テキストから芸風タグを推定するためのキーワード辞書 */
const KEYWORD_TO_STYLES: { keywords: string[]; styles: StyleTag[] }[] = [
  { keywords: ['滑稽', '笑', 'おもしろ', '面白', 'コメディ', 'ばかばかし'], styles: ['滑稽噺'] },
  { keywords: ['テンポ', '短', 'スピード', 'さくっと', '軽い', 'リズム'], styles: ['テンポ重視'] },
  { keywords: ['人情', '泣', 'じっくり', '感動', 'しみじみ', '情'], styles: ['人情噺'] },
  { keywords: ['新作', 'モダン', '現代', 'オリジナル'], styles: ['新作'] },
  { keywords: ['古典', '王道', '本格', '伝統'], styles: ['古典'] },
  { keywords: ['正統', '端正', '丁寧', '安心'], styles: ['正統派'] },
  { keywords: ['怪談', '怖', 'ホラー', '夏'], styles: ['怪談噺'] },
  { keywords: ['色気', '廓', '艶', '粋', '大人'], styles: ['廓噺'] },
  { keywords: ['芝居', '情景', '描写'], styles: ['芝居噺'] },
  { keywords: ['まくら', '小噺', '掴み'], styles: ['まくら名人'] },
];

const DEFAULT_BEGINNER_STYLES: StyleTag[] = ['滑稽噺', 'テンポ重視'];

export function inferStylesFromText(text: string): StyleTag[] {
  const found = new Set<StyleTag>();
  for (const { keywords, styles } of KEYWORD_TO_STYLES) {
    if (keywords.some((k) => text.includes(k))) styles.forEach((s) => found.add(s));
  }
  return [...found];
}

interface ScoredCandidate {
  rakugoka: Rakugoka;
  score: number;
  overlap: StyleTag[];
}

/** ルールベースで好みを推定し、近い順に最大5名を選ぶ（決定的） */
function selectCandidates(
  input: PreferenceInput,
  catalog: Rakugoka[],
): { inferredStyles: StyleTag[]; ranked: ScoredCandidate[] } {
  const inferred = new Set<StyleTag>();
  let excludeId: string | undefined;

  if (input.text) inferStylesFromText(input.text).forEach((s) => inferred.add(s));

  if (input.rakugokaName) {
    const q = input.rakugokaName;
    const base = catalog.find(
      (r) => r.name === q || r.aliases.includes(q) || r.name.includes(q) || q.includes(r.name),
    );
    if (base) {
      base.styleTags.forEach((s) => inferred.add(s));
      excludeId = base.id;
    }
  }

  if (inferred.size === 0) DEFAULT_BEGINNER_STYLES.forEach((s) => inferred.add(s));
  const inferredStyles = [...inferred];

  const ranked = catalog
    .filter((r) => r.id !== excludeId)
    .map((r) => {
      const overlap = r.styleTags.filter((t) => inferred.has(t));
      const score = Math.min(100, Math.round(overlap.length * 28 + r.beginnerScore * 0.3));
      return { rakugoka: r, score, overlap };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || b.rakugoka.beginnerScore - a.rakugoka.beginnerScore)
    .slice(0, 5);

  return { inferredStyles, ranked };
}

/** 好み入力 → 近い師匠を提案（候補=ルール / 理由=AI or 定型） */
export async function matchRakugoka(
  input: PreferenceInput,
  catalog: Rakugoka[],
): Promise<MatchOutput> {
  const { inferredStyles, ranked } = selectCandidates(input, catalog);

  // 候補選定はルールベースで正確。理由文は即時の定型文を使う（対話検索は速度・信頼性優先。
  // 無料枠 Gemini への並列呼び出しはレート制限で詰まりやすいため）。Gemini は通知フィードの
  // 推薦理由（日次ジョブ）で活用する。
  return {
    mode: 'mock',
    inferredStyles,
    matches: ranked.map((c) => ({
      rakugoka: c.rakugoka,
      score: c.score,
      reason: mockReason(c, inferredStyles),
    })),
  };
}

const ReasonSchema = z.object({
  reason: z
    .string()
    .describe('この師匠がユーザーの好みに近い理由（前座さんの語り口で1〜2文・師匠名や固有名詞は書かない）'),
});

/**
 * 選定済み候補それぞれについて、Gemini に理由文を生成させる。
 * 1師匠=1コールに分け（id 対応づけの不確実性を排除）、並列実行する（レイテンシは実質1コール分）。
 * 個別に失敗した分は呼び出し側で定型文にフォールバックする。
 */
async function generateReasons(
  input: PreferenceInput,
  inferredStyles: StyleTag[],
  ranked: ScoredCandidate[],
): Promise<Map<string, string>> {
  const pref = [
    input.text ? `好み（自由文）: ${input.text}` : '',
    input.url ? `好きな落語動画のURL: ${input.url}` : '',
    input.rakugokaName ? `基準にしたい師匠: ${input.rakugokaName}` : '',
    `読み取った好みの芸風: ${inferredStyles.join('・') || '（初心者向けの定番）'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const entries = await Promise.all(
    ranked.map(async (c) => {
      try {
        const res = await runStructuredAgent({
          name: 'reason_writer',
          description: '1名の師匠について、ユーザーの好みに近い理由を述べるエージェント',
          instruction: [
            'あなたは寄席コンシェルジュ「前座さん」。控えめで親しみやすい語り口。',
            '指定された師匠の「芸風」が、なぜこのユーザーの好みに近いかを1〜2文で述べます。',
            '重要: 文中に師匠の名前・他の落語家名・固有名詞は一切書かないこと（芸風と魅力だけを述べる）。',
            '誇張を避け、初心者にも分かる言葉で。「〜な芸風で…」のように芸の特徴から書き始める。',
          ].join('\n'),
          schema: ReasonSchema,
          prompt: `${pref}\n\n師匠: ${c.rakugoka.name}（芸風: ${c.rakugoka.styleTags.join('・')} / ${c.rakugoka.tagline}）\nこの師匠を薦める理由を述べてください。`,
        });
        return [c.rakugoka.id, res.reason] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter((e): e is readonly [string, string] => e !== null));
}

function mockReason(c: ScoredCandidate, inferred: StyleTag[]): string {
  const r = c.rakugoka;
  const shared = c.overlap.length ? c.overlap.join('・') : inferred.join('・');
  const beginner =
    r.beginnerScore >= 85
      ? '初めての方にも特に入りやすい一人です。'
      : r.beginnerScore >= 75
        ? '初心者にもおすすめできます。'
        : 'じっくり味わいたくなったらぜひ。';
  return `あなたの好み（${shared}）に近い芸風。${r.tagline}。${beginner}`;
}
