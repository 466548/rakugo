import { NextResponse, type NextRequest } from 'next/server';

/**
 * ブラウザごとに匿名の user id（rakugo_uid Cookie）を発行する。
 * これにより、ウォッチ・通知フィード・空き日・フィードバックがユーザーごとに分離される。
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has('rakugo_uid')) return NextResponse.next();

  const uid = `u_${crypto.randomUUID()}`;
  // 現在のリクエスト（SSR）からも見えるように request にも設定し、ブラウザにも保存する
  request.cookies.set('rakugo_uid', uid);
  const response = NextResponse.next({ request });
  response.cookies.set('rakugo_uid', uid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
