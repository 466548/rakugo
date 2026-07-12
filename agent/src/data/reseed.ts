/**
 * カタログ（噺家・番組）の再投入。既存の watch/recommendation は保持したまま、
 * 師匠データや番組を最新シードへ upsert する（データ拡充を本番Firestoreへ反映する用途）。
 */
import type { DataStore } from './store';
import { RAKUGOKA_SEED, buildSeedPrograms } from './seed';

export async function reseedCatalog(
  store: DataStore,
): Promise<{ rakugoka: number; programs: number }> {
  for (const r of RAKUGOKA_SEED) await store.upsertRakugoka(r);
  const programs = buildSeedPrograms();
  for (const p of programs) await store.upsertProgram(p);
  return { rakugoka: RAKUGOKA_SEED.length, programs: programs.length };
}
