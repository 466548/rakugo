'use client';

import { useState, useTransition } from 'react';
import { toggleWatch } from '@/app/actions';

export function WatchButton({
  rakugokaId,
  initialWatching,
  size = 'md',
}: {
  rakugokaId: string;
  initialWatching: boolean;
  size?: 'sm' | 'md';
}) {
  const [watching, setWatching] = useState(initialWatching);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !watching;
    setWatching(next); // 楽観的更新
    startTransition(async () => {
      await toggleWatch(rakugokaId, next);
    });
  };

  const pad = size === 'sm' ? 'px-3.5 py-1.5 text-[13px]' : 'px-5 py-2.5 text-[15px]';
  const cls = watching
    ? 'bg-pearl text-ink-muted border border-hairline'
    : 'bg-primary text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={watching}
      className={`press inline-flex items-center gap-1.5 rounded-pill font-medium disabled:opacity-60 ${pad} ${cls}`}
    >
      {watching ? '✓ ウォッチ中' : '＋ 追っかけ登録'}
    </button>
  );
}
