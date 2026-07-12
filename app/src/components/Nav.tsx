'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { href: '/', label: 'ホーム' },
  { href: '/neta', label: '演目' },
  { href: '/map', label: '見取り図' },
  { href: '/feed', label: '通知フィード' },
  { href: '/programs', label: '番組' },
  { href: '/live', label: '公式番組' },
  { href: '/watch', label: 'ウォッチ' },
  { href: '/availability', label: '空き日' },
  { href: '/dashboard', label: '運用ダッシュボード', admin: true },
];

export function Nav({ unreadCount = 0, isAdmin = false }: { unreadCount?: number; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const sections = SECTIONS.filter((s) => !s.admin || isAdmin);

  return (
    <header className="sticky top-0 z-50">
      {/* グローバルナビ（黒・極薄） */}
      <div className="flex h-11 items-center justify-between bg-black px-4 text-white">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight-apple">
          <span aria-hidden>🎴</span>
          <span>前座さん</span>
          <span className="hidden text-[11px] font-normal text-body-muted sm:inline">寄席コンシェルジュ</span>
        </Link>
        <Link href="/feed" className="text-[12px] text-body-muted hover:text-white">
          通知{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Link>
      </div>

      {/* セクションナビ（パーチメント・フロスト） */}
      <nav className="border-b border-hairline bg-parchment/80 backdrop-blur-md backdrop-saturate-150">
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-3 py-2">
          {sections.map((s) => {
            const active = isActive(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`press relative whitespace-nowrap rounded-pill px-3.5 py-1.5 text-[13px] font-medium ${
                  active ? 'bg-ink text-white' : 'text-ink-muted hover:bg-pearl'
                }`}
              >
                {s.label}
                {s.href === '/feed' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
