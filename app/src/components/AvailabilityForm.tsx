'use client';

import { useFormStatus } from 'react-dom';
import { saveAvailability } from '@/app/actions';
import type { Weekday } from '@rakugo/agent';

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press rounded-pill bg-primary px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
    >
      {pending ? '保存中…' : '空き日を保存'}
    </button>
  );
}

export function AvailabilityForm({
  weekdays,
  dates,
}: {
  weekdays: Weekday[];
  dates: string[];
}) {
  return (
    <form action={saveAvailability} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink-muted">行ける曜日</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((w) => (
            <label
              key={w.key}
              className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill border border-hairline bg-canvas text-[15px] text-ink-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="weekdays"
                value={w.key}
                defaultChecked={weekdays.includes(w.key)}
                className="sr-only"
              />
              {w.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="dates" className="mb-2 block text-[13px] font-semibold text-ink-muted">
          個別に行ける日付（YYYY-MM-DD をカンマ/空白区切りで）
        </label>
        <textarea
          id="dates"
          name="dates"
          rows={2}
          defaultValue={dates.join(', ')}
          placeholder="例：2026-06-20, 2026-06-27"
          className="w-full resize-none rounded-lg border border-hairline bg-canvas px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
        />
      </div>

      <SaveButton />
    </form>
  );
}
