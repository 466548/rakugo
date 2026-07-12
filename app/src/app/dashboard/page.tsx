import { aiMode } from '@rakugo/agent';
import { currentUserId, store } from '@/lib/server';
import { isAdmin } from '@/lib/admin';
import { AdminLogin } from '@/components/AdminLogin';
import { RunPipelineButton } from '@/components/RunPipelineButton';
import { ReseedButton } from '@/components/ReseedButton';

function fmt(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const STATUS: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-green-500', label: '成功' },
  failed: { dot: 'bg-red-500', label: '失敗' },
  running: { dot: 'bg-amber-500', label: '実行中' },
};

export default async function DashboardPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const s = store();
  const [runs, programs, recs] = await Promise.all([
    s.listAgentRuns(10),
    s.listPrograms(),
    currentUserId().then((uid) => s.listRecommendations(uid)),
  ]);
  const latest = runs[0];
  const successCount = runs.filter((r) => r.status === 'success').length;
  const mode = aiMode();

  const stats = [
    { label: '取得済み番組', value: programs.length },
    { label: '生成した推薦', value: recs.length },
    { label: '直近10回の成功', value: `${successCount}/${runs.length}` },
    { label: '最終実行', value: fmt(latest?.startedAt) },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight-apple text-ink">運用ダッシュボード</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            前座さんは毎日、各定席の番組表を自動で読み、判断を記録しています。
          </p>
        </div>
        <span
          className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold ${
            mode === 'gemini' ? 'bg-primary/10 text-primary' : 'bg-pearl text-ink-muted border border-hairline'
          }`}
        >
          判断エンジン: {mode === 'gemini' ? 'Gemini (ADK)' : 'ルールベース(モック)'}
        </span>
      </header>

      {/* メトリクス */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-[12px] text-ink-faint">{st.label}</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-tight-apple text-ink">
              {st.value}
            </p>
          </div>
        ))}
      </section>

      {/* 自律実行（手動トリガ） */}
      <section className="rounded-lg bg-tile px-6 py-6 text-white">
        <p className="text-[13px] font-semibold text-body-muted">自律パイプライン</p>
        <h2 className="mt-1 text-[19px] font-semibold tracking-tight-apple">
          Cloud Scheduler → Cloud Run Job（毎日）を、ここから即時実行できます
        </h2>
        <p className="mt-1 text-[14px] text-body-muted">
          取得 → 構造化 → 照合（ウォッチ×番組×空き日）→ 推薦生成 を一気通貫で。
        </p>
        <div className="mt-4 space-y-3">
          <RunPipelineButton />
          <ReseedButton />
        </div>
      </section>

      {/* 実行履歴 */}
      <section>
        <h2 className="mb-3 text-[19px] font-semibold tracking-tight-apple text-ink">実行履歴</h2>
        <ul className="space-y-3">
          {runs.map((run) => {
            const st = STATUS[run.status] ?? STATUS.running!;
            return (
              <li key={run.id} className="rounded-lg border border-hairline bg-canvas p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  <span className="text-[13px] text-ink-faint">{fmt(run.startedAt)}</span>
                  <div className="ml-auto flex gap-4 text-[13px] text-ink-muted tabular-nums">
                    <span>番組 {run.programsIngested}</span>
                    <span>推薦 {run.recommendationsCreated}</span>
                  </div>
                </div>

                {run.errors.length > 0 && (
                  <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">
                    ⚠ {run.errors.join(' / ')}
                  </p>
                )}

                {/* 構造化ログ（判断トレース） */}
                <ol className="mt-3 space-y-1 border-l border-divider pl-4">
                  {run.steps.map((step, i) => (
                    <li key={i} className="text-[13px] leading-relaxed text-ink-muted">
                      <span className="mr-2 rounded bg-pearl px-1.5 py-0.5 text-[11px] font-medium text-ink-faint">
                        {step.phase}
                      </span>
                      {step.message}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
