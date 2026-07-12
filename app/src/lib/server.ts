import 'server-only';
import { cookies } from 'next/headers';
import { getStore, seed, type StyleTag } from '@rakugo/agent';

/** デモ基準日（要件上の「今日」）。番組フィルタ等の起点 */
export const DEMO_TODAY = '2026-06-15';

/** middleware 等が未通過の場合のフォールバック ID */
const FALLBACK_UID = 'demo-user';

export function store() {
  return getStore();
}

/** ブラウザごとの user id（Cookie rakugo_uid）。middleware で発行される */
export async function currentUserId(): Promise<string> {
  const c = await cookies();
  return c.get('rakugo_uid')?.value || FALLBACK_UID;
}

/** 初回訪問のユーザーに、シードの開始状態（空き日・一之輔ウォッチ・初期推薦）をクローンする */
export async function ensureUser(uid: string): Promise<void> {
  const s = store();
  if (await s.getUser(uid)) return;
  await s.upsertUser({ ...seed.DEMO_USER, id: uid });
  await s.addWatch(uid, 'ichinosuke');
  for (const r of seed.SEED_RECOMMENDATIONS) {
    await s.addRecommendation({
      userId: uid,
      programId: r.programId,
      rakugokaId: r.rakugokaId,
      reason: r.reason,
      matchedAvailability: r.matchedAvailability,
    });
  }
}

/** uid を確定しつつ初回クローンも済ませる（ユーザーデータを読む画面/操作で使う） */
export async function currentUser(): Promise<string> {
  const uid = await currentUserId();
  await ensureUser(uid);
  return uid;
}

/** 芸風タグごとの該当師匠数（テーマ検索のチップ用）。在籍0のタグは除外し、多い順に返す */
export async function styleTagCounts(): Promise<{ tag: StyleTag; count: number }[]> {
  const catalog = await store().listRakugoka();
  const counts = new Map<StyleTag, number>();
  for (const r of catalog) for (const t of r.styleTags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}
