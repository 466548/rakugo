'use client';

import { useState, useTransition } from 'react';
import { reseedData } from '@/app/actions';

export function ReseedButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await reseedData();
      setMsg(r.ok ? `再投入完了：師匠 ${r.rakugoka}名 / 番組 ${r.programs}件を更新` : '権限がありません');
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="press rounded-pill border border-hairline bg-canvas px-5 py-2.5 text-[15px] font-medium text-ink-muted disabled:opacity-60"
      >
        {pending ? '再投入中…' : '師匠・番組データを再投入'}
      </button>
      {msg && <span className="text-[13px] text-ink-muted">{msg}</span>}
    </div>
  );
}
