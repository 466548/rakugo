import type { Weekday } from '../domain/types';

/**
 * 日付は「カレンダー上の日付」（時刻なし）として一貫して UTC で扱う。
 * ローカルタイムゾーンや +09:00 オフセットを混ぜると toISOString で日付がずれるため、
 * 'YYYY-MM-DD' を常に UTC 0時としてパースし、getUTC* / setUTCDate を使う。
 */
const WEEKDAY_KEYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const JA_WD = ['日', '月', '火', '水', '木', '金', '土'];

function parseUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/** 'YYYY-MM-DD' → 曜日キー */
export function weekdayKey(dateStr: string): Weekday {
  return WEEKDAY_KEYS[parseUtc(dateStr).getUTCDay()]!;
}

/** 'YYYY-MM-DD' → "M/D(曜)" の人間可読表記 */
export function formatJaDate(dateStr: string): string {
  const d = parseUtc(dateStr);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${JA_WD[d.getUTCDay()]})`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
