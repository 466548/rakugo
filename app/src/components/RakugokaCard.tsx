import Link from 'next/link';
import type { Rakugoka } from '@rakugo/agent';
import { BeginnerMeter, Chip } from './ui';
import { WatchButton } from './WatchButton';

export function RakugokaCard({
  rakugoka,
  isWatching,
  reason,
  score,
}: {
  rakugoka: Rakugoka;
  isWatching: boolean;
  reason?: string;
  score?: number;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/rakugoka/${rakugoka.id}`} className="block">
            <h3 className="text-[19px] font-semibold tracking-tight-apple text-ink hover:text-primary">
              {rakugoka.name}
            </h3>
          </Link>
          {rakugoka.association && (
            <p className="mt-0.5 text-[12px] text-ink-faint">{rakugoka.association}</p>
          )}
        </div>
        {typeof score === 'number' && (
          <span className="shrink-0 rounded-pill bg-primary/10 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-primary">
            マッチ {score}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {rakugoka.styleTags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>

      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        {reason ?? rakugoka.tagline}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <BeginnerMeter score={rakugoka.beginnerScore} />
        <WatchButton rakugokaId={rakugoka.id} initialWatching={isWatching} size="sm" />
      </div>
    </div>
  );
}
