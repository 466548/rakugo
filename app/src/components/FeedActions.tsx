'use client';

import { useState, useTransition } from 'react';
import { setRecommendationStatus, submitFeedback } from '@/app/actions';
import type { FeedbackResult, RecommendationStatus } from '@rakugo/agent';

const FB_LABEL: Record<FeedbackResult, string> = {
  went_liked: '行ってきた・良かった 👍',
  went_disliked: '合わなかった 👎',
  skipped: '見送り',
};

export function FeedActions({
  id,
  status,
  recordedFeedback,
}: {
  id: string;
  status: RecommendationStatus;
  recordedFeedback?: FeedbackResult;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(
    recordedFeedback ? `記録済み：${FB_LABEL[recordedFeedback]}` : null,
  );

  const feedback = (r: FeedbackResult) => {
    setDone(`記録しました：${FB_LABEL[r]}`);
    startTransition(async () => {
      await submitFeedback(id, r);
    });
  };
  const setStatus = (s: RecommendationStatus, label: string) => {
    setDone(label);
    startTransition(async () => {
      await setRecommendationStatus(id, s);
    });
  };

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary">
        ✓ {done}
      </span>
    );
  }

  const btn =
    'press rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-[13px] text-ink-muted disabled:opacity-50';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} className={btn} onClick={() => feedback('went_liked')}>
        行ってきた・良かった 👍
      </button>
      <button type="button" disabled={pending} className={btn} onClick={() => feedback('went_disliked')}>
        合わなかった 👎
      </button>
      {status === 'unread' && (
        <button type="button" disabled={pending} className={btn} onClick={() => setStatus('read', '既読にしました')}>
          既読にする
        </button>
      )}
      <button type="button" disabled={pending} className={btn} onClick={() => setStatus('dismissed', '興味なしにしました')}>
        興味なし
      </button>
    </div>
  );
}
