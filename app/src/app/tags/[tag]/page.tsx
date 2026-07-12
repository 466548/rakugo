import { notFound } from 'next/navigation';
import { STYLE_TAGS, type StyleTag } from '@rakugo/agent';
import { currentUserId, store, styleTagCounts } from '@/lib/server';
import { RakugokaCard } from '@/components/RakugokaCard';
import { TagChips } from '@/components/TagChips';

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw) as StyleTag;
  if (!STYLE_TAGS.includes(tag)) notFound();

  const s = store();
  const [catalog, watches, tagCounts] = await Promise.all([
    s.listRakugoka(),
    currentUserId().then((uid) => s.listWatches(uid)),
    styleTagCounts(),
  ]);
  const watchedIds = new Set(watches.map((w) => w.rakugokaId));

  const matches = catalog
    .filter((r) => r.styleTags.includes(tag))
    .sort((a, b) => b.beginnerScore - a.beginnerScore);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">{`#${tag}`}</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          「{tag}」が持ち味の現役師匠 {matches.length} 名。気になる師匠をウォッチすると、出演を通知します。
        </p>
      </header>

      <TagChips tags={tagCounts} current={tag} />

      {matches.length === 0 ? (
        <p className="text-[15px] text-ink-muted">該当する師匠が見つかりませんでした。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((r) => (
            <RakugokaCard key={r.id} rakugoka={r} isWatching={watchedIds.has(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
