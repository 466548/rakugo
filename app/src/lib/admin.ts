import 'server-only';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'rakugo_admin';

/**
 * 運用ダッシュボード等の管理画面アクセス可否。
 * RAKUGO_ADMIN_KEY が未設定（ローカル開発）なら素通し、設定時はクッキー一致を要求。
 */
export async function isAdmin(): Promise<boolean> {
  const key = process.env.RAKUGO_ADMIN_KEY;
  if (!key) return true;
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === key;
}

export function adminEnabled(): boolean {
  return !!process.env.RAKUGO_ADMIN_KEY;
}
