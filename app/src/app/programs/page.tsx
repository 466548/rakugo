import Link from 'next/link';
import { PART_LABEL, VENUES, addDays, formatJaDate, type Rakugoka } from '@rakugo/agent';
import { currentUserId, DEMO_TODAY, store } from '@/lib/server';
import { Chip } from '@/components/ui';

export default async function ProgramsPage() {
  const s = store();
  const to = addDays(DEMO_TODAY, 14);
  const [programs, rakugokaList, watches] = await Promise.all([
    s.listPrograms({ from: DEMO_TODAY, to }),
    s.listRakugoka(),
    currentUserId().then((uid) => s.listWatches(uid)),
  ]);
  const byId = new Map<string, Rakugoka>(rakugokaList.map((r) => [r.id, r]));
  const watchedIds = new Set(watches.map((w) => w.rakugokaId));

  // 初心者向き度でランキング（トリの初心者度を主軸に、香盤平均を従に）
  const ranked = programs
    .map((p) => {
      const tori = p.toriRakugokaId ? byId.get(p.toriRakugokaId) : undefined;
      const performers = p.lineup
        .map((l) => (l.rakugokaId ? byId.get(l.rakugokaId) : undefined))
        .filter((r): r is Rakugoka => !!r);
      const avg = performers.length
        ? performers.reduce((a, r) => a + r.beginnerScore, 0) / performers.length
        : 0;
      const hasWatched = performers.some((r) => watchedIds.has(r.id));
      const score = Math.round((tori?.beginnerScore ?? avg) * 0.7 + avg * 0.3 + (hasWatched ? 8 : 0));
      return { program: p, tori, performers, score, hasWatched };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">番組レコメンド</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          直近2週間の対象定席の番組を、初心者の入りやすさでランキング。「トリ」は最後に上がる主役の枠です。
        </p>
      </header>

      <ul className="space-y-3">
        {ranked.map(({ program, tori, performers, score, hasWatched }) => {
          const explain = tori
            ? `この日のトリは${tori.name}師匠（${tori.styleTags.join('・')}）。${
                tori.beginnerScore >= 80 ? '初心者にも入りやすい一席です。' : 'じっくり味わえる顔付けです。'
              }`
            : '顔付けはバランス型です。';
          return (
            <li key={program.id} className="rounded-lg border border-hairline bg-canvas p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-semibold tracking-tight-apple text-ink">
                  {formatJaDate(program.date)}
                </span>
                <Chip>{VENUES[program.venue].name}</Chip>
                <Chip>{PART_LABEL[program.part]}</Chip>
                {hasWatched && <Chip tone="primary">ウォッチ中の師匠が出演</Chip>}
                <span className="ml-auto rounded-pill bg-primary/10 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-primary">
                  初心者度 {score}
                </span>
              </div>

              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{explain}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {performers.slice(0, 6).map((r) => (
                  <Link key={r.id} href={`/rakugoka/${r.id}`}>
                    <Chip tone={r.id === program.toriRakugokaId ? 'dark' : 'pearl'}>
                      {r.id === program.toriRakugokaId ? `${r.name}（トリ）` : r.name}
                    </Chip>
                  </Link>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
