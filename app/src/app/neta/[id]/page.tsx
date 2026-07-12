import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WORKS, getNeta } from '@rakugo/agent';
import { currentUserId, store } from '@/lib/server';
import { RakugokaCard } from '@/components/RakugokaCard';
import { Chip } from '@/components/ui';

export default async function NetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const neta = getNeta(id);
  if (!neta) notFound();

  const s = store();
  const [catalog, watches] = await Promise.all([
    s.listRakugoka(),
    currentUserId().then((uid) => s.listWatches(uid)),
  ]);
  const watchedIds = new Set(watches.map((w) => w.rakugokaId));
  const masters = neta.rakugokaIds
    .map((rid) => catalog.find((r) => r.id === rid))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => b.beginnerScore - a.beginnerScore);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/neta" className="text-[13px] text-primary">
          ← 演目一覧
        </Link>
      </div>

      <header className="rounded-lg border border-hairline bg-canvas p-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[32px] font-semibold tracking-tight-apple text-ink">{neta.title}</h1>
          {neta.kana && <span className="text-[14px] text-ink-faint">{neta.kana}</span>}
          {(neta.works ?? []).map((w) => (
            <span key={w} className="rounded-pill bg-ink px-2.5 py-1 text-[12px] text-white">
              {WORKS[w].mark} {WORKS[w].label}に登場
            </span>
          ))}
        </div>
        <p className="mt-3 text-[16px] leading-relaxed text-ink">{neta.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {neta.tags.map((t) => (
            <Chip key={t} tone="primary">
              {t}
            </Chip>
          ))}
        </div>
      </header>

      <section>
        <h2 className="mb-1 text-[19px] font-semibold tracking-tight-apple text-ink">この噺を得意とする師匠</h2>
        <p className="mb-4 text-[13px] text-ink-faint">
          ※ 得意ネタは公開情報からの推定です。実際にこの演目がかかるかは各席の番組でご確認ください。
        </p>
        {masters.length === 0 ? (
          <p className="text-[15px] text-ink-muted">該当する師匠が見つかりませんでした。</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {masters.map((r) => (
              <RakugokaCard key={r.id} rakugoka={r} isWatching={watchedIds.has(r.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
