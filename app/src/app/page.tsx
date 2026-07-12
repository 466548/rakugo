import Link from 'next/link';
import { listNeta } from '@rakugo/agent';
import { PreferenceForm } from '@/components/PreferenceForm';
import { TagChips } from '@/components/TagChips';
import { PillLink } from '@/components/ui';
import { styleTagCounts } from '@/lib/server';

export default async function HomePage() {
  const tagCounts = await styleTagCounts();
  const featuredNeta = listNeta()
    .filter((n) => (n.works?.length ?? 0) > 0)
    .slice(0, 12);
  return (
    <div className="space-y-12">
      {/* ヒーロー */}
      <section className="pt-6 text-center sm:pt-12">
        <h1 className="mx-auto max-w-2xl text-[34px] font-semibold leading-tight tracking-tight-apple text-ink sm:text-[48px]">
          観るべき寄席を、
          <br className="sm:hidden" />
          前座さんが見つけます。
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-muted sm:text-[19px]">
          番組表は読めなくて大丈夫。あなたの「好み」と「行ける日」から、
          芸風の近い師匠とぴったりの一席を、理由つきでお届けします。
        </p>
      </section>

      {/* 好み入力（エントリーポイント） */}
      <section className="rounded-lg border border-hairline bg-canvas p-5 sm:p-8">
        <PreferenceForm />
      </section>

      {/* テーマ（噺の種類）で探す */}
      <section>
        <h2 className="mb-1 text-[19px] font-semibold tracking-tight-apple text-ink">テーマで探す</h2>
        <p className="mb-3 text-[14px] text-ink-muted">噺の種類（芸風）から、近い師匠を一覧できます。</p>
        <TagChips tags={tagCounts} />
      </section>

      {/* 演目から探す */}
      <section>
        <h2 className="mb-1 text-[19px] font-semibold tracking-tight-apple text-ink">演目から探す</h2>
        <p className="mb-3 text-[14px] text-ink-muted">
          観たいあの噺を、生で誰のを観よう？ 演目から得意な師匠へ繋ぎます。
          <span className="ml-1 text-ink-faint">（■=あかね噺 / ◆=昭和元禄落語心中 / ●=ちりとてちん ゆかり）</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {featuredNeta.map((n) => (
            <Link
              key={n.id}
              href={`/neta/${n.id}`}
              className="press rounded-pill border border-hairline bg-pearl px-3.5 py-1.5 text-[13px] font-medium text-ink-muted"
            >
              {n.title}
            </Link>
          ))}
          <Link href="/neta" className="press rounded-pill bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white">
            演目をすべて見る →
          </Link>
        </div>
      </section>

      {/* 前座さんの仕事（エージェントの必然性） */}
      <section className="rounded-lg bg-tile px-6 py-10 text-white sm:px-10">
        <p className="text-[13px] font-semibold tracking-wide text-body-muted">前座さんの仕事</p>
        <h2 className="mt-2 max-w-2xl text-[24px] font-semibold leading-snug tracking-tight-apple sm:text-[28px]">
          番組表の解読・芸風の言語化・予定との突き合わせ。
          人手では大変な多段判断を、毎日自動でこなします。
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: '1', t: '解読', d: '各定席の番組表（非構造データ）を取得し、香盤・トリを構造化。' },
            { n: '2', t: '言語化', d: '芸風という暗黙知を公開情報から推定し、出典つきでプロファイル化。' },
            { n: '3', t: '照合・通知', d: 'ウォッチ × 番組 × 空き日を毎日突き合わせ、行ける席を理由つきで通知。' },
          ].map((s) => (
            <div key={s.n} className="rounded-md bg-tile-2 p-4">
              <span className="text-sky text-[13px] font-semibold">STEP {s.n}</span>
              <p className="mt-1 text-[17px] font-semibold">{s.t}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-body-muted">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <PillLink href="/map">見取り図を見る</PillLink>
          <PillLink href="/feed" variant="ghost">
            通知フィードへ
          </PillLink>
        </div>
      </section>
    </div>
  );
}
