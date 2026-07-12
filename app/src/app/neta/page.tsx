import type { Metadata } from 'next';
import Link from 'next/link';
import { WORKS, listNeta } from '@rakugo/agent';
import { Chip } from '@/components/ui';

export const metadata: Metadata = {
  title: '演目から探す — 前座さん',
  description: 'あかね噺で観た噺から、その演目を得意とする現役師匠へ。演目で寄席の師匠を見つけられます。',
};

export default function NetaIndexPage() {
  const neta = listNeta();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">演目から探す</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          「観たあの噺、生で誰のを観よう？」 — 演目から、その噺を得意とする師匠へ繋ぎます。
        </p>
        <p className="mt-1 text-[12px] text-ink-faint">
          ■ = あかね噺 ／ ◆ = 昭和元禄落語心中 ／ ● = ちりとてちん に登場
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {neta.map((n) => (
          <Link
            key={n.id}
            href={`/neta/${n.id}`}
            className="press rounded-lg border border-hairline bg-canvas p-5 hover:border-primary"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <h2 className="text-[19px] font-semibold tracking-tight-apple text-ink">{n.title}</h2>
              <span className="flex gap-1">
                {(n.works ?? []).map((w) => (
                  <span
                    key={w}
                    title={WORKS[w].label}
                    className="rounded-pill bg-ink px-2 py-0.5 text-[11px] text-white"
                  >
                    {WORKS[w].mark}
                  </span>
                ))}
              </span>
            </div>
            {n.kana && <p className="text-[12px] text-ink-faint">{n.kana}</p>}
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{n.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {n.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
              <span className="ml-auto text-[12px] text-ink-faint">得意な師匠 {n.rakugokaIds.length}名</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
