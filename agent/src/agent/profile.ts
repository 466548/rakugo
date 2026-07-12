/**
 * 師匠プロファイル生成 / 更新（A-03 / build_profile ツール）。
 * 公開情報から芸風タイプ・初心者向き度を推定（必ず AI生成の推定であることを明示）。
 */
import type { Rakugoka } from '../domain/types';
import { ProfileEstimateSchema, type ProfileEstimate } from '../domain/schema';
import { isAiEnabled, runStructuredAgent } from './provider';

/** 噺家名 → 芸風プロファイル推定。known があれば（既存プロファイル）モック時の素材に使う */
export async function buildProfile(
  name: string,
  known?: Pick<Rakugoka, 'styleTags' | 'beginnerScore' | 'description' | 'tagline'>,
): Promise<ProfileEstimate> {
  if (isAiEnabled()) {
    try {
      return await buildProfileWithAi(name);
    } catch (err) {
      console.warn('[profile] AI 失敗のためモックにフォールバック:', (err as Error).message);
    }
  }
  return buildProfileMock(name, known);
}

async function buildProfileWithAi(name: string): Promise<ProfileEstimate> {
  return runStructuredAgent({
    name: 'rakugoka_profiler',
    description: '噺家の芸風プロファイルを公開情報から推定するエージェント',
    instruction: [
      'あなたは落語に詳しいアシスタント。指定された噺家について、一般に公開されている',
      '情報の範囲で芸風タイプ（styleTags）・初心者向き度（beginnerScore 0-100）・特徴説明・一行キャッチを推定します。',
      '断定を避け、推定であることを踏まえた中立的な表現にすること。事実が不明な点は無理に作らない。',
    ].join('\n'),
    schema: ProfileEstimateSchema,
    prompt: `次の噺家のプロファイルを推定してください: ${name}`,
  });
}

function buildProfileMock(
  name: string,
  known?: Pick<Rakugoka, 'styleTags' | 'beginnerScore' | 'description' | 'tagline'>,
): ProfileEstimate {
  if (known) {
    return {
      styleTags: known.styleTags,
      beginnerScore: known.beginnerScore,
      description: known.description,
      tagline: known.tagline,
    };
  }
  return {
    styleTags: ['古典', '滑稽噺'],
    beginnerScore: 70,
    description: `${name}の芸風は公開情報からの推定です。詳細なプロファイルは AI（Gemini）接続時に生成されます。`,
    tagline: '芸風プロファイル（推定）',
  };
}
