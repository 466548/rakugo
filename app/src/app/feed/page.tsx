import Link from 'next/link';
import { PART_LABEL, VENUES } from '@rakugo/agent';
import { currentUser, store } from '@/lib/server';
import { FeedActions } from '@/components/FeedActions';
import { RefreshRecsButton } from '@/components/RefreshRecsButton';
import { Chip, PillLink } from '@/components/ui';

export default async function FeedPage() {
  const s = store();
  const uid = await currentUser();
  const [recs, feedbacks] = await Promise.all([s.listRecommendations(uid), s.listFeedback(uid)]);
  const fbMap = new Map(feedbacks.map((f) => [f.recommendationId, f.result]));
  const visible = recs.filter((r) => r.status !== 'dismissed');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">通知フィード</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            ウォッチ中の師匠が、あなたの行ける日に出演する席をお知らせします。
          </p>
        </div>
        <RefreshRecsButton />
      </header>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas p-8 text-center">
          <p className="text-[16px] text-ink-muted">まだ通知はありません。</p>
          <p className="mt-1 text-[14px] text-ink-faint">
            気になる師匠をウォッチして、「おすすめを更新」を押してみてください。
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <PillLink href="/">師匠を探す</PillLink>
            <PillLink href="/map" variant="ghost">
              見取り図
            </PillLink>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {await Promise.all(
            visible.map(async (rec) => {
              const rakugoka = await s.getRakugoka(rec.rakugokaId);
              const program = await s.getProgram(rec.programId);
              const venueName = program ? VENUES[program.venue].name : '';
              const partLabel = program ? PART_LABEL[program.part] : '';
              const isTori = program?.toriRakugokaId === rec.rakugokaId;
              return (
                <li
                  key={rec.id}
                  className={`rounded-lg border bg-canvas p-5 ${
                    rec.status === 'unread' ? 'border-primary/40' : 'border-hairline'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {rec.status === 'unread' && (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-label="未読" />
                    )}
                    <Chip tone="primary">{rec.matchedAvailability}</Chip>
                    {isTori && <Chip tone="dark">トリ（主任）</Chip>}
                    <span className="ml-auto text-[13px] text-ink-faint">
                      {venueName} {partLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-[17px] leading-relaxed text-ink">{rec.reason}</p>

                  <div className="mt-3 flex items-center gap-3 text-[14px] text-ink-faint">
                    {rakugoka && (
                      <Link href={`/rakugoka/${rakugoka.id}`} className="font-medium text-primary">
                        {rakugoka.name} のプロフィール →
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 border-t border-divider pt-4">
                    <FeedActions id={rec.id} status={rec.status} recordedFeedback={fbMap.get(rec.id)} />
                  </div>
                </li>
              );
            }),
          )}
        </ul>
      )}
    </div>
  );
}
