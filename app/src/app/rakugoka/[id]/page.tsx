import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PART_LABEL, VENUES, VENUE_TYPE_LABEL, WORKS, addDays, formatJaDate, netasForRakugoka } from '@rakugo/agent';
import { currentUserId, DEMO_TODAY, store } from '@/lib/server';
import { WatchButton } from '@/components/WatchButton';
import { AiNotice, BeginnerMeter, Chip, SectionLabel } from '@/components/ui';

export default async function RakugokaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = store();
  const rakugoka = await s.getRakugoka(id);
  if (!rakugoka) notFound();

  const [isWatching, upcoming] = await Promise.all([
    currentUserId().then((uid) => s.isWatching(uid, id)),
    s.listPrograms({ rakugokaId: id, from: DEMO_TODAY, to: addDays(DEMO_TODAY, 31) }),
  ]);
  const netas = netasForRakugoka(id);

  return (
    <div className="space-y-8">
      <header className="rounded-lg border border-hairline bg-canvas p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[32px] font-semibold tracking-tight-apple text-ink">{rakugoka.name}</h1>
              {rakugoka.beginnerPick && <Chip tone="primary">入門おすすめ ◎</Chip>}
            </div>
            <p className="mt-1 text-[14px] text-ink-faint">
              {rakugoka.association}
              {rakugoka.association && ' ・ '}
              {VENUE_TYPE_LABEL[rakugoka.venueType]}
            </p>
          </div>
          <WatchButton rakugokaId={rakugoka.id} initialWatching={isWatching} />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {rakugoka.styleTags.map((t) => (
            <Chip key={t} tone="primary">
              {t}
            </Chip>
          ))}
        </div>

        <div className="mt-5">
          <BeginnerMeter score={rakugoka.beginnerScore} />
        </div>

        <p className="mt-5 text-[17px] leading-relaxed text-ink">{rakugoka.description}</p>
        <AiNotice className="mt-4" />
      </header>

      {/* 出典 */}
      <section>
        <SectionLabel>出典</SectionLabel>
        <ul className="space-y-1">
          {rakugoka.sources.map((src) => (
            <li key={src.url}>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-primary hover:underline"
              >
                {src.title} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* 得意ネタ */}
      {netas.length > 0 && (
        <section>
          <SectionLabel>得意ネタ（推定）</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {netas.map((n) => (
              <Link key={n.id} href={`/neta/${n.id}`}>
                <Chip>
                  {n.title}
                  {n.works?.length ? ` ${n.works.map((w) => WORKS[w].mark).join('')}` : ''}
                </Chip>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 出演予定 */}
      <section>
        <SectionLabel>今後31日の対象定席での出演（番組発表時点）</SectionLabel>
        {upcoming.length === 0 ? (
          <p className="text-[15px] text-ink-muted">対象期間の出演は見つかりませんでした。</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-canvas px-4 py-3"
              >
                <span className="text-[15px] font-semibold tracking-tight-apple text-ink">
                  {formatJaDate(p.date)}
                </span>
                <Chip>{VENUES[p.venue].name}</Chip>
                <Chip>{PART_LABEL[p.part]}</Chip>
                {p.toriRakugokaId === rakugoka.id && <Chip tone="dark">トリ（主任）</Chip>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
