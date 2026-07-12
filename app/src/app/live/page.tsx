import { PART_LABEL, VENUES, type Venue } from '@rakugo/agent';
import { store } from '@/lib/server';
import { Chip } from '@/components/ui';

export const metadata = {
  title: '公式番組（自動取得）— 前座さん',
  description: '末廣亭・鈴本の公式サイトから前座さんが毎日自動取得した実際の番組（香盤・トリ）。',
};

function fmt(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function LivePage() {
  const all = await store().listLivePrograms();
  const order: Venue[] = ['suehirotei', 'suzumoto'];
  const fetchedAt = all[0]?.fetchedAt;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">公式番組（自動取得）</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          前座さんが <b className="font-semibold">末廣亭・鈴本の公式サイト</b> から、実際の番組（香盤・トリ）を自動で読み取ったものです。
        </p>
        <p className="mt-1 text-[12px] text-ink-faint">
          {fetchedAt ? `最終取得：${fmt(fetchedAt)}　` : ''}
          出演者は番組発表時点の情報で、代演・交互出演があります。お出かけ前に各定席の公式情報をご確認ください。
        </p>
      </header>

      {all.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas p-8 text-center">
          <p className="text-[16px] text-ink-muted">まだ取得した番組がありません。</p>
          <p className="mt-1 text-[14px] text-ink-faint">運用ダッシュボードの「今すぐ監視」または日次ジョブで取得されます。</p>
        </div>
      ) : (
        order.map((venue) => {
          const items = all.filter((p) => p.venue === venue);
          if (items.length === 0) return null;
          return (
            <section key={venue}>
              <h2 className="mb-3 text-[19px] font-semibold tracking-tight-apple text-ink">{VENUES[venue].name}</h2>
              <div className="space-y-3">
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg border border-hairline bg-canvas p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-semibold tracking-tight-apple text-ink">{p.kogyoLabel}</span>
                      <Chip>{PART_LABEL[p.part]}</Chip>
                      {p.toriRawName && <Chip tone="dark">トリ {p.toriRawName}</Chip>}
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-[12px] text-primary"
                      >
                        公式ページ ↗
                      </a>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.lineup.map((l, i) => (
                        <Chip key={i} tone={l.isIromono ? 'pearl' : 'pearl'}>
                          {l.isIromono ? `${l.rawName}（色物）` : l.rawName}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
