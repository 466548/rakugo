import Link from 'next/link';
import type { ReactNode } from 'react';

/** 芸風タグ等の小さなチップ */
export function Chip({ children, tone = 'pearl' }: { children: ReactNode; tone?: 'pearl' | 'primary' | 'dark' }) {
  const cls =
    tone === 'primary'
      ? 'bg-primary text-white'
      : tone === 'dark'
        ? 'bg-ink text-white'
        : 'bg-pearl text-ink-muted border border-hairline';
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-1 text-[13px] leading-none ${cls}`}>
      {children}
    </span>
  );
}

/** 初心者向き度メーター（0-100） */
export function BeginnerMeter({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-pill bg-divider">
        <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className="text-[13px] tabular-nums text-ink-faint">初心者向き {score}</span>
    </div>
  );
}

/** 「AIが公開情報から生成した推定」明示（要件 §12 / 説明可能性） */
export function AiNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-ink-faint ${className}`}>
      ※ このプロフィールは AI（Gemini）が公開情報から生成した推定です。出典をあわせてご確認ください。
    </p>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[13px] font-semibold tracking-wide text-ink-faint">{children}</p>;
}

/** ピル型のリンクボタン（Action Blue） */
export function PillLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-primary text-white'
      : 'bg-transparent text-primary border border-primary';
  return (
    <Link
      href={href}
      className={`press inline-flex items-center justify-center rounded-pill px-5 py-2.5 text-[15px] font-medium ${cls}`}
    >
      {children}
    </Link>
  );
}
