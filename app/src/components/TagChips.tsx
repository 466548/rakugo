import Link from 'next/link';

/** 芸風テーマのタグチップ列（テーマ検索の導線・「ぴあ落語ざんまい」のタグUIを参考） */
export function TagChips({
  tags,
  current,
}: {
  tags: { tag: string; count: number }[];
  current?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const active = tag === current;
        return (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className={`press inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-medium ${
              active ? 'bg-ink text-white' : 'border border-hairline bg-pearl text-ink-muted'
            }`}
          >
            {`#${tag}`}
            <span className={`text-[11px] tabular-nums ${active ? 'text-body-muted' : 'text-ink-faint'}`}>
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
