/**
 * 自律パイプライン（要件 §4.2 / §9 のデータフロー）。
 * fetch → parse → (profile) → match(ウォッチ×番組×空き日) → recommend → save。
 * 各判断を AgentRun.steps に構造化記録（観測可能性 §5.2）。Cloud Run Job からも UI からも呼ぶ。
 */
import type { AgentRun, AgentRunStep, Program, Rakugoka, User } from '../domain/types';
import type { DataStore } from '../data/store';
import { newId, nowIso } from '../data/store';
import { DEMO_USER_ID, SEED_TODAY } from '../data/seed';
import { aiMode } from './provider';
import { decideRecommendation } from './recommend';
import { addDays, formatJaDate, weekdayKey } from '../util/date';

export interface PipelineOptions {
  /** 基準日（既定: デモ基準日 2026-06-15）。これ以降の番組を対象にする */
  today?: string;
  /** 監視する未来の日数 */
  horizonDays?: number;
  /** 対象ユーザー（MVP は単一デモユーザー） */
  userId?: string;
}

export interface PipelineResult {
  run: AgentRun;
  recommendationsCreated: number;
}

/** ある番組がユーザーの空き日に合致するか */
export function availabilityMatches(user: User, program: Program): boolean {
  const byDate = user.availability.dates?.includes(program.date) ?? false;
  const byWeekday = user.availability.weekdays?.includes(weekdayKey(program.date)) ?? false;
  return byDate || byWeekday;
}

export async function runIngestPipeline(
  store: DataStore,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const today = opts.today ?? SEED_TODAY;
  const horizon = opts.horizonDays ?? 31;
  const userId = opts.userId ?? DEMO_USER_ID;
  const to = addDays(today, horizon);

  const steps: AgentRunStep[] = [];
  const errors: string[] = [];
  const step = (phase: string, message: string, meta?: Record<string, unknown>) => {
    steps.push({ at: nowIso(), phase, message, meta });
  };

  const run: AgentRun = {
    id: newId('run'),
    startedAt: nowIso(),
    status: 'running',
    programsIngested: 0,
    profilesUpdated: 0,
    recommendationsCreated: 0,
    errors,
    steps,
  };
  await store.addAgentRun(run);

  let recommendationsCreated = 0;
  try {
    const mode = aiMode();
    step('start', `パイプライン開始（AIモード: ${mode}）`, { mode, today, horizon });

    // 1. fetch（MVP: シード済み番組を「取得済み」として対象範囲を確定）
    const programs = await store.listPrograms({ from: today, to });
    step('fetch', `対象期間 ${today}〜${to} の番組表を取得`, { programs: programs.length });
    run.programsIngested = programs.length;

    // 2. parse（既に構造化済み。capability は parse_program ツールが担う）
    step('parse', '番組を構造化（スキーマ固定 JSON）', { programs: programs.length });

    // 3. match & recommend（ウォッチ × 番組 × 空き日）
    const user = await store.getUser(userId);
    if (!user) {
      step('match', 'ユーザーが見つからないため推薦をスキップ', { userId });
    } else {
      const watches = await store.listWatches(user.id);
      step('match', 'ウォッチ × 番組 × 空き日を照合', {
        watches: watches.length,
        reachableVenues: user.reachableVenues,
      });

      // 全ウォッチ × 番組 × 空き日 の候補を集約（既存推薦は除外）
      const candidates: { rakugoka: Rakugoka; program: Program; matchedAvailability: string }[] = [];
      for (const watch of watches) {
        const rakugoka = await store.getRakugoka(watch.rakugokaId);
        if (!rakugoka) continue;

        const matched = programs.filter(
          (p) =>
            user.reachableVenues.includes(p.venue) &&
            (p.toriRakugokaId === rakugoka.id ||
              p.lineup.some((l) => l.rakugokaId === rakugoka.id)) &&
            availabilityMatches(user, p),
        );
        // 同じ日に複数枠で出る場合は1件に絞る（トリの席を優先）
        const byDate = new Map<string, Program>();
        for (const p of matched) {
          const cur = byDate.get(p.date);
          const isTori = p.toriRakugokaId === rakugoka.id;
          if (!cur || (isTori && cur.toriRakugokaId !== rakugoka.id)) byDate.set(p.date, p);
        }
        for (const program of [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))) {
          if (await store.hasRecommendation(user.id, program.id, rakugoka.id)) continue;
          candidates.push({ rakugoka, program, matchedAvailability: formatJaDate(program.date) });
        }
      }

      // 理由生成（Gemini）は全候補を一括並列（逐次だと遅く詰まるため）。上限で暴走も防ぐ
      const decided = await Promise.all(
        candidates.slice(0, 12).map(async (c) => ({ ...c, decision: await decideRecommendation(c) })),
      );

      for (const { rakugoka, program, matchedAvailability, decision } of decided) {
        if (!decision.recommend) continue;
        await store.addRecommendation({
          userId: user.id,
          programId: program.id,
          rakugokaId: rakugoka.id,
          reason: decision.reason,
          matchedAvailability,
        });
        recommendationsCreated++;
        step('recommend', `推薦を生成: ${rakugoka.name} @ ${matchedAvailability}`, {
          programId: program.id,
        });
      }
    }

    run.recommendationsCreated = recommendationsCreated;
    run.status = 'success';
    run.finishedAt = nowIso();
    step('done', `完了（推薦 ${recommendationsCreated} 件生成）`, { recommendationsCreated });
  } catch (err) {
    run.status = 'failed';
    run.finishedAt = nowIso();
    errors.push((err as Error).message);
    step('error', `パイプライン失敗: ${(err as Error).message}`);
  }

  await store.updateAgentRun(run.id, {
    status: run.status,
    finishedAt: run.finishedAt,
    programsIngested: run.programsIngested,
    profilesUpdated: run.profilesUpdated,
    recommendationsCreated: run.recommendationsCreated,
    errors,
    steps,
  });

  return { run, recommendationsCreated };
}
