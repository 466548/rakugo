'use client';

import React, { useState, useMemo } from 'react';

// 落語家ポジショニングマップ（現役・寄席メイン）— Taz 作成のコンポーネントを前座さんアプリに統合。
// 元の和テイストから Apple 風デザインシステムに合わせて再スタイル。データは実カタログ(props)から供給。
// 横軸: 古典(左) ←→ 新作(右)   縦軸: 爆笑・エンタメ(下) ←→ 本格・正統派(上)

// Apple トークン（DESIGN.md）
const CANVAS = '#ffffff';
const PARCHMENT = '#f5f5f7';
const INK = '#1d1d1f';
const INK_FAINT = '#7a7a7a';
const HAIRLINE = '#e0e0e0';
const PRIMARY = '#0066cc';

// 団体カラー（白地で見分けやすい、彩度を抑えた多色。落語協会はアクセントの Action Blue）
const GROUPS = {
  rakugo: { label: '落語協会', color: '#0066cc', yose: '定席◎' },
  geijutsu: { label: '落語芸術協会', color: '#2e7d6b', yose: '定席◎' },
  enraku: { label: '円楽一門会', color: '#b07a2e', yose: '末廣亭ほか一部' },
  tatekawa: { label: '立川流', color: '#7a5478', yose: '独演会・ホール' },
  kamigata: { label: '上方', color: '#b3543f', yose: '繁昌亭・喜楽館' },
};

export default function RakugokaMap({ data }) {
  const [active, setActive] = useState({ rakugo: true, geijutsu: true, enraku: false, tatekawa: false, kamigata: false });
  const [labels, setLabels] = useState(true);
  const [onlyNyumon, setOnlyNyumon] = useState(false);
  const [akaneOnly, setAkaneOnly] = useState(false);
  const [sel, setSel] = useState(null);

  const shown = useMemo(
    () =>
      (data ?? []).filter(
        (d) => active[d.group] && (!onlyNyumon || d.beginnerPick) && (!akaneOnly || d.akane || d.kai),
      ),
    [data, active, onlyNyumon, akaneOnly],
  );

  const toggle = (k) => setActive((a) => ({ ...a, [k]: !a[k] }));
  const toggleAkane = () =>
    setAkaneOnly((v) => {
      const nv = !v;
      if (nv) setActive({ rakugo: true, geijutsu: true, enraku: true, tatekawa: true, kamigata: true });
      return nv;
    });

  const Chip = ({ k }) => {
    const on = active[k];
    const c = GROUPS[k].color;
    return (
      <button
        onClick={() => toggle(k)}
        className="press rounded-pill border px-3 py-1.5 text-[13px] font-medium"
        style={{ borderColor: c, background: on ? c : 'transparent', color: on ? '#fff' : c }}
      >
        {GROUPS[k].label}
      </button>
    );
  };

  const pill = 'press rounded-pill border px-3 py-1.5 text-[13px] font-medium';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">落語家の見取り図</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          現役だけ・寄席で会える人を中心に。<b className="font-semibold">古典↔新作</b> ×{' '}
          <b className="font-semibold">爆笑↔本格</b> の2軸で芸風を一望できます。
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
          ● ＝寄席でフラッと会える　○ ＝基本は独演会・ホール
          <span style={{ color: PRIMARY }}>◎</span> ＝入門おすすめ　■ ＝あかね噺ゆかり
        </p>
      </header>

      {/* controls */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(GROUPS).map((k) => (
          <Chip key={k} k={k} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOnlyNyumon((v) => !v)}
          className={pill}
          style={{ borderColor: PRIMARY, background: onlyNyumon ? PRIMARY : 'transparent', color: onlyNyumon ? '#fff' : PRIMARY }}
        >
          入門おすすめだけ ◎
        </button>
        <button
          onClick={toggleAkane}
          className={pill}
          style={{ borderColor: INK, background: akaneOnly ? INK : 'transparent', color: akaneOnly ? '#fff' : INK }}
        >
          あかね噺ゆかりだけ ■
        </button>
        <button onClick={() => setLabels((v) => !v)} className={pill} style={{ borderColor: HAIRLINE, color: INK_FAINT }}>
          {labels ? '名前を隠す' : '名前を表示'}
        </button>
      </div>

      {/* map */}
      <div
        className="relative w-full rounded-lg"
        style={{ aspectRatio: '1 / 1', background: CANVAS, border: `1px solid ${HAIRLINE}`, overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,.07)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,.07)' }} />

        <span style={ax('top')}>本格・正統派</span>
        <span style={ax('bottom')}>爆笑・エンタメ</span>
        <span style={ax('left')}>古典</span>
        <span style={ax('right')}>新作</span>

        {shown.map((d) => {
          const c = GROUPS[d.group].color;
          const solid = d.venueType !== 'dokuen';
          const isSel = sel && sel.id === d.id;
          return (
            <div
              key={d.id}
              onClick={() => setSel(d)}
              style={{
                position: 'absolute',
                left: `${d.position.x}%`,
                top: `${100 - d.position.y}%`,
                transform: 'translate(-50%,-50%)',
                cursor: 'pointer',
                zIndex: isSel ? 5 : 1,
              }}
            >
              <div
                style={{
                  width: isSel ? 18 : 13,
                  height: isSel ? 18 : 13,
                  borderRadius: '50%',
                  background: solid ? c : CANVAS,
                  border: `2px solid ${c}`,
                  boxShadow: d.beginnerPick
                    ? `0 0 0 2px ${CANVAS}, 0 0 0 4px ${PRIMARY}`
                    : isSel
                      ? `0 0 0 2px ${CANVAS}, 0 0 0 4px ${c}`
                      : 'none',
                  transition: 'all .12s',
                }}
              />
              {(d.akane || d.kai) && (
                <div
                  title="あかね噺ゆかり"
                  style={{ position: 'absolute', top: -4, right: -4, width: 6, height: 6, background: INK, border: `1px solid ${CANVAS}`, borderRadius: 1 }}
                />
              )}
              {(labels || isSel) && (
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(100% + 2px)',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    fontSize: isSel ? 12 : 10,
                    fontWeight: isSel ? 700 : 500,
                    color: isSel ? INK : 'rgba(29,29,31,.7)',
                    background: isSel ? CANVAS : 'transparent',
                    padding: isSel ? '1px 4px' : 0,
                    borderRadius: 4,
                    pointerEvents: 'none',
                  }}
                >
                  {d.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* hint */}
      <p className="text-[13px] leading-relaxed" style={{ color: INK_FAINT }}>
        点をタップすると、持ち味と「どこで会えるか」が出ます。まずは ● の落語協会・芸術協会＝寄席の定席（鈴本・末廣亭）でフラッと会える人たち。立川流・上方はチップで切り替えてください。
      </p>

      {/* detail modal */}
      {sel && (
        <div
          onClick={() => setSel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg"
            style={{ background: CANVAS, maxWidth: 520, width: '100%', maxHeight: '82vh', overflowY: 'auto', padding: '22px 24px', position: 'relative', boxShadow: '0 12px 48px rgba(0,0,0,.22)' }}
          >
            <button
              onClick={() => setSel(null)}
              aria-label="閉じる"
              style={{ position: 'absolute', top: 10, right: 14, fontSize: 22, lineHeight: 1, color: INK_FAINT, background: 'transparent', cursor: 'pointer' }}
            >
              ×
            </button>
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[20px] font-semibold tracking-tight-apple" style={{ color: INK }}>
                {sel.name}
              </span>
              {sel.beginnerPick && (
                <span className="rounded-pill px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: PRIMARY }}>
                  入門おすすめ ◎
                </span>
              )}
              <a href={`/rakugoka/${sel.id}`} className="ml-auto text-[13px] font-medium" style={{ color: PRIMARY }}>
                プロフィール →
              </a>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: INK_FAINT }}>
              <span>
                <b style={{ color: GROUPS[sel.group].color }}>{GROUPS[sel.group].label}</b>
              </span>
              <span>
                会えるのは：
                {sel.venueType === 'dokuen'
                  ? '独演会・ホール（定席には基本出ない）'
                  : sel.venueType === 'kamigata'
                    ? '上方の寄席（繁昌亭・喜楽館）'
                    : GROUPS[sel.group].yose}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(sel.styleTags || []).map((t) => (
                <span key={t} className="rounded-pill border px-2.5 py-0.5 text-[12px]" style={{ borderColor: HAIRLINE, background: PARCHMENT, color: INK }}>
                  {t}
                </span>
              ))}
            </div>
            {sel.akane && (
              <div className="mt-2.5 text-[13px]">
                <span className="rounded-pill px-2 py-0.5 text-[11px] text-white" style={{ background: INK }}>■ 漫画あかね噺</span>
                <span className="ml-2" style={{ color: INK_FAINT }}>{sel.akane}</span>
              </div>
            )}
            {sel.kai && (
              <div className="mt-1.5 text-[13px]">
                <span className="rounded-pill px-2 py-0.5 text-[11px] text-white" style={{ background: INK }}>🎤 あかね噺落語会’26</span>
                <span className="ml-2" style={{ color: INK_FAINT }}>{sel.kai}</span>
              </div>
            )}
            <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: INK }}>{sel.description}</p>
          </>
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-ink-faint">
        ※ 位置は持ち味の推定マップです。誰がどの寄席に出るかは日替わりなので、各席の番組表でご確認ください。
      </p>
    </div>
  );
}

function ax(pos) {
  const base = { position: 'absolute', fontSize: 11, color: 'rgba(29,29,31,.5)', letterSpacing: 0.5 };
  if (pos === 'top') return { ...base, top: 6, left: '50%', transform: 'translateX(-50%)' };
  if (pos === 'bottom') return { ...base, bottom: 6, left: '50%', transform: 'translateX(-50%)' };
  if (pos === 'left') return { ...base, left: 6, top: '50%', transform: 'translateY(-50%)', writingMode: 'vertical-rl' };
  return { ...base, right: 6, top: '50%', transform: 'translateY(-50%)', writingMode: 'vertical-rl' };
}
