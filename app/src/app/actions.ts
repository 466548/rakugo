'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  PreferenceInputSchema,
  matchRakugoka,
  reseedCatalog,
  runIngestPipeline,
  type FeedbackResult,
  type MatchOutput,
  type RecommendationStatus,
  type Weekday,
} from '@rakugo/agent';
import { currentUser, store } from '@/lib/server';
import { ADMIN_COOKIE, isAdmin } from '@/lib/admin';

export interface PreferenceState {
  ok: boolean;
  error?: string;
  result?: MatchOutput;
  /** 現在ウォッチ中の師匠 ID（提案カードの初期状態用） */
  watchingIds?: string[];
}

// 公開アクションの簡易レート制限（Gemini コスト暴走/DoS 対策・インスタンス単位の固定ウィンドウ）
const RL = { windowStart: 0, count: 0 };
const RL_LIMIT = 20;
const RL_WINDOW_MS = 60_000;
function allowRequest(): boolean {
  const now = Date.now();
  if (now - RL.windowStart > RL_WINDOW_MS) {
    RL.windowStart = now;
    RL.count = 0;
  }
  if (RL.count >= RL_LIMIT) return false;
  RL.count++;
  return true;
}

/** 好み入力 → 師匠マッチング（F-01）。useActionState から呼ぶ */
export async function submitPreference(
  _prev: PreferenceState,
  formData: FormData,
): Promise<PreferenceState> {
  const raw = {
    text: (formData.get('text') as string)?.trim() || undefined,
    url: (formData.get('url') as string)?.trim() || undefined,
    rakugokaName: (formData.get('rakugokaName') as string)?.trim() || undefined,
  };

  if (!raw.text && !raw.url && !raw.rakugokaName) {
    return { ok: false, error: '好み・URL・師匠名のいずれかを入力してください。' };
  }

  const parsed = PreferenceInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'URL の形式が正しくありません。' };
  }

  // コスト暴走対策：短時間に集中したらAI呼び出しを抑制
  if (!allowRequest()) {
    return { ok: false, error: 'アクセスが集中しています。少し待ってから再度お試しください。' };
  }

  try {
    const s = store();
    const uid = await currentUser();
    const catalog = await s.listRakugoka();
    const result = await matchRakugoka(parsed.data, catalog);
    const watches = await s.listWatches(uid);
    return { ok: true, result, watchingIds: watches.map((w) => w.rakugokaId) };
  } catch (err) {
    return { ok: false, error: `マッチングに失敗しました: ${(err as Error).message}` };
  }
}

/** ウォッチ登録/解除（F-03） */
export async function toggleWatch(rakugokaId: string, watching: boolean): Promise<void> {
  const s = store();
  const uid = await currentUser();
  if (watching) await s.addWatch(uid, rakugokaId);
  else await s.removeWatch(uid, rakugokaId);
  revalidatePath('/watch');
  revalidatePath(`/rakugoka/${rakugokaId}`);
  revalidatePath('/');
}

/** 管理者ログイン（運用ダッシュボードのパスフレーズ認証） */
export async function loginAdmin(formData: FormData): Promise<void> {
  const key = process.env.RAKUGO_ADMIN_KEY;
  const input = String(formData.get('passphrase') ?? '');
  if (key && input === key) {
    (await cookies()).set(ADMIN_COOKIE, key, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  revalidatePath('/dashboard');
}

/** 自律パイプラインを即時実行（運用ダッシュボードの「今すぐ監視」・管理者のみ） */
export async function runPipelineNow(): Promise<{ created: number; status: string }> {
  if (!(await isAdmin())) return { created: 0, status: 'forbidden' };
  const { run, recommendationsCreated } = await runIngestPipeline(store());
  revalidatePath('/dashboard');
  revalidatePath('/feed');
  return { created: recommendationsCreated, status: run.status };
}

/** 最新シードを Firestore へ再投入（師匠・番組の拡充反映・管理者のみ） */
export async function reseedData(): Promise<{ ok: boolean; rakugoka?: number; programs?: number }> {
  if (!(await isAdmin())) return { ok: false };
  const res = await reseedCatalog(store());
  revalidatePath('/dashboard');
  revalidatePath('/map');
  return { ok: true, ...res };
}

/** 自分（このブラウザ）のウォッチ×番組×空き日で推薦を更新（公開・レート制限） */
export async function runMyPipeline(): Promise<{ created: number; limited?: boolean }> {
  if (!allowRequest()) return { created: 0, limited: true };
  const uid = await currentUser();
  const { recommendationsCreated } = await runIngestPipeline(store(), { userId: uid });
  revalidatePath('/feed');
  return { created: recommendationsCreated };
}

/** 空き日設定（F-05・手動入力） */
export async function saveAvailability(formData: FormData): Promise<void> {
  const weekdays = formData.getAll('weekdays').map(String) as Weekday[];
  const datesRaw = (formData.get('dates') as string) ?? '';
  const dates = datesRaw
    .split(/[\s,、]+/)
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  const s = store();
  const uid = await currentUser();
  const user = await s.getUser(uid);
  if (user) {
    await s.upsertUser({ ...user, availability: { weekdays, dates } });
  }
  revalidatePath('/availability');
  revalidatePath('/feed');
}

/** 通知の既読/却下（F-04） */
export async function setRecommendationStatus(
  id: string,
  status: RecommendationStatus,
): Promise<void> {
  await store().setRecommendationStatus(id, status);
  revalidatePath('/feed');
}

/** フィードバック記録（F-07） */
export async function submitFeedback(
  recommendationId: string,
  result: FeedbackResult,
): Promise<void> {
  const s = store();
  const uid = await currentUser();
  await s.addFeedback({ userId: uid, recommendationId, result });
  await s.setRecommendationStatus(recommendationId, 'read');
  revalidatePath('/feed');
}
