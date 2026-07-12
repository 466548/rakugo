/**
 * 推薦判断・理由生成（A-04 / decide_recommendation ツール）。
 * 「この席をなぜ推すか」を前座さんの語り口で生成（説明可能性の核）。
 */
import type { Program, Rakugoka } from '../domain/types';
import { PART_LABEL, VENUES } from '../domain/types';
import { RecommendationDecisionSchema, type RecommendationDecision } from '../domain/schema';
import { isAiEnabled, runStructuredAgent } from './provider';
import { formatJaDate } from '../util/date';

export interface RecommendationContext {
  rakugoka: Rakugoka;
  program: Program;
  /** 突き合わせた空き日（人間可読） */
  matchedAvailability: string;
}

/**
 * 推薦理由を生成する。
 * 事実（寄席名・日付・部・トリ）は決定的に組み立て、芸風の「魅力ひとこと」だけ Gemini に書かせる
 * （flash が日付・部・トリを取り違えて事実誤認を起こすため、事実は LLM に語らせない）。
 */
export async function decideRecommendation(
  ctx: RecommendationContext,
): Promise<RecommendationDecision> {
  const f = facts(ctx);
  const role = f.isTori
    ? `トリ（主任）として登場します。一番おいしい主役の枠ですよ`
    : `出演します`;
  const lead = `おっ、見つけましたよ。ウォッチ中の${ctx.rakugoka.name}師匠が、${ctx.matchedAvailability}の${f.venue}・${f.partLabel}に${role}。`;

  let flavor: string | undefined;
  if (isAiEnabled()) {
    try {
      flavor = await aiFlavor(ctx, f);
    } catch (err) {
      console.warn('[recommend] AI 失敗のため定型文にフォールバック:', (err as Error).message);
    }
  }
  return { recommend: true, reason: `${lead}${flavor ?? mockFlavor(f)}` };
}

function facts(ctx: RecommendationContext) {
  const { rakugoka, program } = ctx;
  return {
    venue: VENUES[program.venue].name,
    dateLabel: formatJaDate(program.date),
    partLabel: PART_LABEL[program.part],
    isTori: program.toriRakugokaId === rakugoka.id,
    styles: rakugoka.styleTags.join('・'),
    beginnerScore: rakugoka.beginnerScore,
  };
}

/** 芸風の魅力ひとこと（事実は書かせない）。 */
async function aiFlavor(ctx: RecommendationContext, f: ReturnType<typeof facts>): Promise<string> {
  const res = await runStructuredAgent({
    name: 'recommendation_flavor',
    description: '師匠の芸風の魅力を一言添えるエージェント',
    instruction: [
      'あなたは寄席コンシェルジュ「前座さん」。控えめで親しみやすい語り口。',
      '指定された師匠の芸風の魅力と、初心者にこの一席を薦める気持ちを1〜2文で添えます。',
      '重要: 日付・寄席名・部（昼夜）・トリの有無などの事実は書かない（別途表示済み）。固有名詞も書かない。',
      '芸風と「行ってみませんか」という気持ちだけを述べる。',
    ].join('\n'),
    schema: RecommendationDecisionSchema,
    prompt: `師匠の芸風: ${f.styles} / 初心者向き度: ${f.beginnerScore}\nこの高座をおすすめする一言を。`,
  });
  return res.reason;
}

function mockFlavor(f: ReturnType<typeof facts>): string {
  const beginner =
    f.beginnerScore >= 85
      ? '初めての寄席にもぴったりの一席かと存じます。'
      : f.beginnerScore >= 75
        ? '初心者にも入りやすい高座です。'
        : 'じっくり味わいたい方におすすめです。';
  return `${f.styles}が持ち味の師匠。${beginner}`;
}
