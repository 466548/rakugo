import './env';
import { getStore, runIngestPipeline } from '@rakugo/agent';
import { LocalStore } from '@rakugo/agent/data';

async function main() {
  new LocalStore().reset();
  const s = getStore();
  const uid = 'timetest';
  await s.upsertUser({
    id: uid,
    displayName: 'tt',
    availability: { weekdays: ['sat', 'sun'], dates: [] },
    calendarConnected: false,
    reachableVenues: ['suehirotei', 'suzumoto'],
  });
  for (const r of ['kyotaro', 'sanza', 'gontaro', 'taihei']) await s.addWatch(uid, r);

  const t0 = Date.now();
  const { recommendationsCreated } = await runIngestPipeline(s, { userId: uid });
  console.log(`recs=${recommendationsCreated} 所要=${((Date.now() - t0) / 1000).toFixed(1)}秒`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
