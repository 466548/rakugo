/**
 * 番組構造化（A-02 / parse_program ツール）。
 * 番組表の生テキスト → スキーマ固定の JSON（日付・部・香盤・トリ）。
 */
import { ParsedProgramSchema, type ParsedProgram } from '../domain/schema';
import { isAiEnabled, runStructuredAgent } from './provider';

export interface ParseProgramInput {
  rawText: string;
  /** 補助情報（不明な日付の補完などに使う） */
  hintDate?: string;
  /** 同一ページに昼夜が混在する場合、抽出する部を指定 */
  partHint?: 'day' | 'night';
  /** モデル上書き（実番組の構造化は flash では不安定なため Pro 等を指定） */
  model?: string;
}

export async function parseProgram(input: ParseProgramInput): Promise<ParsedProgram> {
  if (isAiEnabled()) {
    try {
      const ai = await parseWithAi(input);
      const cleaned = sanitizeParsed(ai, input.rawText);
      if (process.env.RAKUGO_DEBUG) {
        console.error(`[parse] AI lineup=${ai.lineup.length} → cleaned=${cleaned.lineup.length}`);
      }
      // 妥当な香盤が2名未満ならパース失敗とみなしモックにフォールバック
      if (cleaned.lineup.length < 2) return parseMock(input);
      return cleaned;
    } catch (err) {
      if (process.env.RAKUGO_DEBUG) console.error('[parse] AI THREW:', (err as Error).message);
      console.warn('[parse] AI 失敗のためモックにフォールバック:', (err as Error).message);
    }
  }
  return parseMock(input);
}

/** 入力テキストに出てこない名前（ハルシネーション）を除去する判定。
 *  実番組は全角スペース入り（例: 春風亭　一　之　輔）なので空白を除去して比較する。 */
function nameInText(name: string, text: string): boolean {
  const norm = (s: string) => s.replace(/[（(].*?[)）]/g, '').replace(/[\s　]/g, '');
  const core = norm(name);
  return core.length > 1 && norm(text).includes(core);
}

/**
 * LLM 出力の妥当性を補正（ハルシネーション対策）:
 *  - 香盤は入力テキストに実在する名前だけ残す
 *  - 部(昼/夜)は入力のキーワードを優先（決定的）
 *  - トリは残った香盤の実在名にする
 */
function sanitizeParsed(p: ParsedProgram, rawText: string): ParsedProgram {
  const lineup = p.lineup
    .filter((l) => nameInText(l.rawName, rawText))
    .map((l, idx) => ({ ...l, order: idx + 1 }));

  const part: 'day' | 'night' = NIGHT_HINTS.some((h) => rawText.includes(h))
    ? 'night'
    : DAY_HINTS.some((h) => rawText.includes(h))
      ? 'day'
      : p.part;

  const names = lineup.map((l) => l.rawName);
  const lastNeta = [...lineup].reverse().find((e) => !e.isIromono);
  const toriValid = p.toriRawName != null && names.includes(p.toriRawName);

  return {
    date: p.date,
    part,
    lineup,
    toriRawName: toriValid ? p.toriRawName : (lastNeta?.rawName ?? null),
  };
}

async function parseWithAi(input: ParseProgramInput): Promise<ParsedProgram> {
  return runStructuredAgent({
    name: 'program_parser',
    description: '寄席の番組表テキストを構造化するエージェント',
    instruction: [
      '寄席の番組表テキストから、出演者を出演順に抽出して構造化します。',
      'lineup の各要素: order(1始まりの出演順), rawName(演者名), isIromono(漫才・曲芸・紙切り・奇術・太神楽・曲独楽・浪曲・物まね等の色物なら true、落語家・講談師は false)。',
      'rawName には演者名のみを入れる。時刻・日付・「⑪」等の丸数字・「○日出演」「交互出演」「休演」「代演」「〃」などの注記、ジャンル名（落語/講談 等）、住所・料金は含めない。',
      '交互出演は先頭の1名を代表として入れる。',
      '「主任」と書かれた演者が toriRawName（トリ）。無ければ最後の落語家。',
      input.partHint ? `これは${input.partHint === 'night' ? '夜' : '昼'}の部の番組です。part は ${input.partHint} とする。` : 'part は昼席=day / 夜席=night。',
      input.hintDate ? `date は ${input.hintDate}。` : 'date は不明なら空文字でよい。',
    ]
      .filter(Boolean)
      .join('\n'),
    schema: ParsedProgramSchema,
    prompt: `次の番組表から出演者を抽出してください:\n\n${input.rawText}`,
    model: input.model,
  });
}

const IROMONO_HINTS = ['漫才', '曲芸', '紙切り', '奇術', '太神楽', '曲独楽', '手品', '音曲', '紙切'];
const NIGHT_HINTS = ['夜', '夜席', '夜の部'];
const DAY_HINTS = ['昼', '昼席', '昼の部'];

/** ルールベースの簡易パース（AI 無効時 / フォールバック） */
function parseMock(input: ParseProgramInput): ParsedProgram {
  const lines = input.rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const fullText = input.rawText;
  const part: 'day' | 'night' = NIGHT_HINTS.some((h) => fullText.includes(h))
    ? 'night'
    : DAY_HINTS.some((h) => fullText.includes(h))
      ? 'day'
      : 'day';

  // 日付らしき文字列を探す（YYYY-MM-DD / YYYY/MM/DD / M月D日）
  const date = extractDate(fullText) ?? input.hintDate ?? '';

  // 出演者行を抽出（"順. 名前" / "名前" 形式を許容、日付/部の見出し行は除外）
  const isDateLine = (l: string) =>
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(l) || /\d{4}年\s*\d{1,2}月\s*\d{1,2}日/.test(l);
  const isHeaderLine = (l: string) =>
    [...DAY_HINTS, ...NIGHT_HINTS].some((h) => l.includes(h)) || /番組|香盤|出演者?一覧/.test(l);
  const performerLines = lines.filter((l) => !isDateLine(l) && !isHeaderLine(l));

  const lineup = performerLines.map((raw, idx) => {
    const name = raw.replace(/^\s*\d+[.。)]\s*/, '').trim();
    return {
      order: idx + 1,
      rawName: name,
      isIromono: IROMONO_HINTS.some((h) => name.includes(h)),
    };
  });

  const lastNeta = [...lineup].reverse().find((e) => !e.isIromono);

  return ParsedProgramSchema.parse({
    date,
    part,
    lineup,
    toriRawName: lastNeta?.rawName ?? null,
  });
}

function extractDate(text: string): string | undefined {
  const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  const ja = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (ja) {
    const [, y, m, d] = ja;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return undefined;
}
