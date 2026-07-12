'use client';

import { useState, useTransition } from 'react';
import { runMyPipeline } from '@/app/actions';

export function RefreshRecsButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await runMyPipeline();
      setMsg(
        r.limited
          ? 'アクセスが集中しています。少し待って再度お試しください。'
          : r.created > 0
            ? `${r.created} 件の新しいおすすめが見つかりました。`
            : '新しいおすすめはありませんでした（ウォッチや空き日を増やすと見つかりやすくなります）。',
      );
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="press rounded-pill bg-primary px-5 py-2.5 text-[15px] font-medium text-white disabled:opacity-60"
      >
        {pending ? '探しています…' : 'おすすめを更新'}
      </button>
      {msg && <span className="text-[13px] text-ink-muted">{msg}</span>}
    </div>
  );
}
