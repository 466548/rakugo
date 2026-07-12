import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { currentUser, store } from '@/lib/server';
import { isAdmin } from '@/lib/admin';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700'] });
const noto = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-noto', weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: '前座さん — 寄席コンシェルジュ',
  description:
    'あなたの好みと行ける日から、観るべき寄席をエージェントが見つけて教える。落語初心者のための寄席レコメンド。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

// 全ページでローカルストアを読むため常に動的レンダリング
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uid = await currentUser();
  const recs = await store().listRecommendations(uid);
  const unread = recs.filter((r) => r.status === 'unread').length;
  const admin = await isAdmin();

  return (
    <html lang="ja" className={`${inter.variable} ${noto.variable}`}>
      <body className="min-h-screen bg-canvas text-ink">
        <Nav unreadCount={unread} isAdmin={admin} />
        <main className="mx-auto min-h-[60vh] max-w-5xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
        <footer className="border-t border-hairline bg-parchment px-4 py-10 text-ink-faint sm:px-6">
          <div className="mx-auto max-w-5xl space-y-2 text-[12px] leading-relaxed">
            <p className="text-[13px] font-semibold text-ink-muted">前座さん（寄席コンシェルジュ）</p>
            <p>
              師匠のプロフィール・芸風はいずれも AI（Gemini）が公開情報から生成した推定です。出演情報は番組発表時点のもので、
              代演（出演者変更）が生じる場合があります。お出かけ前に各定席の公式情報をご確認ください。
            </p>
            <p>
              対象定席（MVP）：新宿末廣亭・鈴本演芸場。番組表の取得は各定席の公式サイトを尊重し、適切な間隔・キャッシュで行います。
            </p>
            <p className="text-ink-faint/80">
              DevOps × AI Agent Hackathon 提出作品 / データはデモ用のローカルシードを含みます。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
