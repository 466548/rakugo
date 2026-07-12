/**
 * zod スキーマ。
 * - LLM（ADK / Gemini）の構造化出力スキーマ（schema固定でパース）
 * - 入力バリデーション
 *
 * zod は ADK が依存する v4 系を使用。
 */
import { z } from 'zod';

export const STYLE_TAGS = [
  '滑稽噺',
  '人情噺',
  '怪談噺',
  '新作',
  '古典',
  '廓噺',
  '芝居噺',
  'まくら名人',
  'テンポ重視',
  '正統派',
] as const;

export const StyleTagSchema = z.enum(STYLE_TAGS);

/** parse_program: 番組表テキスト → 構造化番組 1件 */
export const ParsedProgramSchema = z.object({
  date: z
    .string()
    .describe('興行日。YYYY-MM-DD 形式。不明なら入力レンジの初日を使う'),
  part: z.enum(['day', 'night']).describe('昼席=day / 夜席=night'),
  lineup: z
    .array(
      z.object({
        order: z.number().int().describe('香盤の出演順。1が最初'),
        rawName: z.string().describe('番組表に書かれた出演者名（原文ママ）'),
        isIromono: z
          .boolean()
          .describe('漫才・曲芸・紙切り等の色物なら true、噺家なら false'),
      }),
    )
    .describe('香盤（出演順のリスト）'),
  toriRawName: z
    .string()
    .nullable()
    .describe('トリ（主任＝最後に上がる主役）の出演者名。判定不能なら null'),
});
export type ParsedProgram = z.infer<typeof ParsedProgramSchema>;

/** build_profile: 噺家名 → 芸風プロファイル推定 */
export const ProfileEstimateSchema = z.object({
  styleTags: z
    .array(StyleTagSchema)
    .min(1)
    .describe('芸風タグ。最も特徴的なものから1〜4個'),
  beginnerScore: z
    .number()
    .min(0)
    .max(100)
    .describe('初心者向き度 0–100。聞きやすさ・分かりやすさ・人気の総合'),
  description: z
    .string()
    .describe('芸風の特徴説明（2〜3文）。公開情報からの推定であることを前提に断定を避ける'),
  tagline: z.string().describe('提案カード用の一行キャッチ（30字以内目安）'),
});
export type ProfileEstimate = z.infer<typeof ProfileEstimateSchema>;

/** match: 好み入力 → 近い噺家の推薦（理由つき） */
export const MatchResultSchema = z.object({
  /** ユーザー入力から抽出した好みの芸風 */
  inferredStyles: z.array(StyleTagSchema).describe('入力から推定した好みの芸風タグ'),
  matches: z
    .array(
      z.object({
        rakugokaId: z.string().describe('候補の噺家 ID（与えられた一覧の id から選ぶ）'),
        reason: z
          .string()
          .describe('なぜこの師匠が好みに近いかの理由（1〜2文・説明可能性）'),
        score: z.number().min(0).max(100).describe('マッチ度 0–100'),
      }),
    )
    .describe('好みに近い順の候補。最大5件'),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

/** decide_recommendation: 候補（番組×ウォッチ×空き日） → 推薦可否＋理由 */
export const RecommendationDecisionSchema = z.object({
  recommend: z.boolean().describe('この席をユーザーに推薦すべきか'),
  reason: z
    .string()
    .describe('推薦理由。前座さんの語り口で、なぜこの席が良いかを1〜3文で。説明可能性の核'),
});
export type RecommendationDecision = z.infer<typeof RecommendationDecisionSchema>;

/** 好み入力 API のリクエスト */
export const PreferenceInputSchema = z.object({
  /** 自由文（キーワード/好み） */
  text: z.string().optional(),
  /** 好きな落語動画 URL（YouTube 等） */
  url: z.string().url().optional(),
  /** 既知の師匠名 */
  rakugokaName: z.string().optional(),
});
export type PreferenceInput = z.infer<typeof PreferenceInputSchema>;
