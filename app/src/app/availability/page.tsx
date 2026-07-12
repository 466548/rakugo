import { VENUES } from '@rakugo/agent';
import { currentUser, store } from '@/lib/server';
import { AvailabilityForm } from '@/components/AvailabilityForm';
import { Chip } from '@/components/ui';

export default async function AvailabilityPage() {
  const uid = await currentUser();
  const user = await store().getUser(uid);
  const weekdays = user?.availability.weekdays ?? [];
  const dates = user?.availability.dates ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">空き日設定</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          行ける曜日・日付を登録すると、前座さんがその日に出演する師匠の席だけを通知します。
        </p>
      </header>

      <section className="rounded-lg border border-hairline bg-canvas p-5 sm:p-6">
        <AvailabilityForm weekdays={weekdays} dates={dates} />
      </section>

      <section className="rounded-lg bg-parchment p-5">
        <p className="text-[13px] font-semibold text-ink-muted">通える定席</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(user?.reachableVenues ?? []).map((v) => (
            <Chip key={v}>{VENUES[v].name}</Chip>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-faint">
          Googleカレンダー連携（自動取得）は今後対応予定です。現在は手動入力で確実に動作します。
        </p>
      </section>
    </div>
  );
}
