'use client';

import { useState, useTransition } from 'react';
import { runPipelineNow } from '@/app/actions';

export function RunPipelineButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await runPipelineNow();
      setMsg(
        res.status === 'success'
          ? `完了：推薦を ${res.created} 件生成しました（通知フィードに反映）`
          : `実行ステータス：${res.status}`,
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
        {pending ? '実行中…' : '今すぐ監視を実行'}
      </button>
      {msg && <span className="text-[13px] text-ink-muted">{msg}</span>}
    </div>
  );
}
