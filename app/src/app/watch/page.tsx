import { addDays } from '@rakugo/agent';
import { currentUser, DEMO_TODAY, store } from '@/lib/server';
import { RakugokaCard } from '@/components/RakugokaCard';
import { PillLink } from '@/components/ui';

export default async function WatchPage() {
  const s = store();
  const uid = await currentUser();
  const watches = await s.listWatches(uid);
  const to = addDays(DEMO_TODAY, 31);

  const items = await Promise.all(
    watches.map(async (w) => {
      const rakugoka = await s.getRakugoka(w.rakugokaId);
      const upcoming = await s.listPrograms({ rakugokaId: w.rakugokaId, from: DEMO_TODAY, to });
      return rakugoka ? { rakugoka, upcoming: upcoming.length } : null;
    }),
  );
  const valid = items.filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">ウォッチリスト</h1>
        <p className="mt-1 text-[15px] text-ink-muted">追っかけ中の師匠。出演があれば通知フィードでお知らせします。</p>
      </header>

      {valid.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas p-8 text-center">
          <p className="text-[16px] text-ink-muted">まだ誰もウォッチしていません。</p>
          <div className="mt-5 flex justify-center">
            <PillLink href="/">好みから師匠を探す</PillLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {valid.map(({ rakugoka, upcoming }) => (
            <div key={rakugoka.id} className="space-y-2">
              <RakugokaCard rakugoka={rakugoka} isWatching />
              <p className="px-1 text-[13px] text-ink-faint">
                今後31日の対象定席での出演：{upcoming} 件
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
