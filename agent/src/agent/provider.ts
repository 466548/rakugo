/**
 * AI プロバイダ層。
 *
 * - ADK (@google/adk) の LlmAgent を InMemoryRunner で実行し、zod スキーマで
 *   構造化出力をパースする汎用ヘルパ `runStructuredAgent` を提供。
 * - GEMINI_API_KEY が無い／RAKUGO_FORCE_MOCK=true の場合は AI 無効（呼び出し側がモックに切替）。
 * - AI 呼び出しが失敗しても、呼び出し側で必ずモックにフォールバックできるよう例外を投げる。
 */
import { InMemoryRunner, LlmAgent, isFinalResponse } from '@google/adk';
import type { z } from 'zod';

export type AiMode = 'gemini' | 'mock';

export function isAiEnabled(): boolean {
  const forceMock = (process.env.RAKUGO_FORCE_MOCK ?? '').toLowerCase() === 'true';
  return !forceMock && !!process.env.GEMINI_API_KEY;
}

export function aiMode(): AiMode {
  return isAiEnabled() ? 'gemini' : 'mock';
}

export function geminiModel(): string {
  return process.env.RAKUGO_GEMINI_MODEL || 'gemini-flash-latest';
}

interface StructuredAgentParams<T extends z.ZodObject<z.ZodRawShape>> {
  /** スネークケースのエージェント名 */
  name: string;
  description: string;
  instruction: string;
  /** 構造化出力スキーマ（zod v4 object） */
  schema: T;
  /** ユーザーメッセージ（プロンプト本文） */
  prompt: string;
  /** モデル上書き（既定: RAKUGO_GEMINI_MODEL or gemini-flash-latest） */
  model?: string;
}

/**
 * 構造化出力エージェントを1回実行し、スキーマでパースした結果を返す。
 * AI 無効時はここを呼ばないこと（呼び出し側が isAiEnabled で分岐する）。
 */
// 呼び出しごとに一意のセッションにするためのカウンタ。
// 同一 appName/userId を使い回すと ADK が会話履歴を共有し、前の呼び出しの出力が
// 次の呼び出しに混入する（マッチング結果がパース結果に漏れる等）ため、毎回ユニークにする。
let callCounter = 0;

export async function runStructuredAgent<T extends z.ZodObject<z.ZodRawShape>>(
  params: StructuredAgentParams<T>,
): Promise<z.infer<T>> {
  const callId = `${++callCounter}_${Date.now()}`;

  const agent = new LlmAgent({
    name: params.name,
    model: params.model ?? geminiModel(),
    description: params.description,
    instruction: params.instruction,
    // outputSchema を指定すると Gemini が JSON 固定で出力する
    outputSchema: params.schema,
  });

  const runner = new InMemoryRunner({ agent, appName: `rakugo-${callId}` });

  const collect = async (): Promise<string> => {
    let text = '';
    for await (const event of runner.runEphemeral({
      userId: `u-${callId}`,
      newMessage: { parts: [{ text: params.prompt }] },
    })) {
      if (isFinalResponse(event) && event.content?.parts) {
        text = event.content.parts.map((p) => p.text ?? '').join('');
      }
    }
    return text;
  };

  // 無限待ち防止：タイムアウトしたら呼び出し側でモックにフォールバックさせる
  const finalText = await Promise.race([
    collect(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('LLM タイムアウト')), 12000),
    ),
  ]);

  if (!finalText.trim()) {
    throw new Error('LLM が空の応答を返しました');
  }

  if (process.env.RAKUGO_DEBUG) console.error('[runStructuredAgent raw]', finalText.slice(0, 400));
  const json = extractJson(finalText);
  return params.schema.parse(json);
}

/** ```json フェンスや前後のテキストを許容して JSON を取り出す */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('LLM 応答から JSON を抽出できませんでした');
  }
}
