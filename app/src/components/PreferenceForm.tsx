'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { submitPreference, type PreferenceState } from '@/app/actions';
import { RakugokaCard } from './RakugokaCard';
import { Chip } from './ui';

const initial: PreferenceState = { ok: false };
const HIST_KEY = 'rakugo_search_history';

type Hist = { text?: string; url?: string; name?: string; label: string };

const EXAMPLES = [
  '滑稽噺でとにかく笑いたい',
  '人情噺でしみじみ泣きたい',
  '短くてテンポがいいの',
  '新作落語が気になる',
];

export function PreferenceForm() {
  const [state, formAction, pending] = useActionState(submitPreference, initial);
  const [history, setHistory] = useState<Hist[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HIST_KEY) || '[]'));
    } catch {
      /* ignore */
    }
  }, []);

  const field = (n: string) =>
    formRef.current?.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null;

  const onSubmitCapture = () => {
    const text = field('text')?.value.trim();
    const url = field('url')?.value.trim();
    const name = field('rakugokaName')?.value.trim();
    const label = text || name || url;
    if (!label) return;
    const item: Hist = { text: text || undefined, url: url || undefined, name: name || undefined, label };
    const next = [item, ...history.filter((h) => h.label !== label)].slice(0, 5);
    setHistory(next);
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const applyHist = (h: Hist) => {
    const t = field('text');
    const u = field('url');
    const r = field('rakugokaName');
    if (t) t.value = h.text || '';
    if (u) u.value = h.url || '';
    if (r) r.value = h.name || '';
  };

  return (
    <div>
      <form ref={formRef} action={formAction} onSubmit={onSubmitCapture} className="space-y-4">
        <div>
          <label htmlFor="text" className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
            どんな落語が好きですか？（自由に）
          </label>
          <textarea
            id="text"
            name="text"
            rows={2}
            placeholder="例：滑稽噺でテンポよく笑いたい / 人情噺でじっくり泣きたい"
            className="w-full resize-none rounded-lg border border-hairline bg-canvas px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={(ev) => {
                  const ta = (ev.currentTarget.closest('form') as HTMLFormElement).elements.namedItem(
                    'text',
                  ) as HTMLTextAreaElement;
                  ta.value = e;
                }}
                className="press"
              >
                <Chip>{e}</Chip>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="url" className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
              好きな落語動画の URL
            </label>
            <input
              id="url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/..."
              className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="rakugokaName" className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
              基準にしたい師匠名
            </label>
            <input
              id="rakugokaName"
              name="rakugokaName"
              type="text"
              placeholder="例：柳家喬太郎"
              className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="press w-full rounded-pill bg-primary px-6 py-3.5 text-[17px] font-medium text-white disabled:opacity-60 sm:w-auto"
        >
          {pending ? '前座さんが思案中…' : '芸風の近い師匠を探す'}
        </button>

        {history.length > 0 && (
          <div className="border-t border-divider pt-3">
            <p className="mb-2 text-[12px] text-ink-faint">最近の検索（クリックで再入力）</p>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h, i) => (
                <button key={i} type="button" onClick={() => applyHist(h)} className="press">
                  <Chip>{h.label.length > 18 ? `${h.label.slice(0, 18)}…` : h.label}</Chip>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {state.error && (
        <p className="mt-4 rounded-lg bg-primary/5 px-4 py-3 text-[14px] text-primary">{state.error}</p>
      )}

      {state.ok && state.result && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-ink-faint">読み取った好み：</span>
            {state.result.inferredStyles.length ? (
              state.result.inferredStyles.map((s) => (
                <Chip key={s} tone="primary">
                  {s}
                </Chip>
              ))
            ) : (
              <Chip>初心者向けの定番</Chip>
            )}
            <span className="ml-auto text-[11px] text-ink-faint">
              判断エンジン: {state.result.mode === 'gemini' ? 'Gemini (ADK)' : 'ルールベース(モック)'}
            </span>
          </div>

          {state.result.matches.length === 0 ? (
            <p className="text-[15px] text-ink-muted">条件に近い師匠が見つかりませんでした。表現を変えてお試しください。</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {state.result.matches.map((m) => (
                <RakugokaCard
                  key={m.rakugoka.id}
                  rakugoka={m.rakugoka}
                  reason={m.reason}
                  score={m.score}
                  isWatching={state.watchingIds?.includes(m.rakugoka.id) ?? false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
