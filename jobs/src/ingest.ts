/**
 * 番組インジェスト Job（A-01〜A-05 / §5.1）。
 *
 * Cloud Scheduler → Cloud Run Job で毎日実行する想定の自律パイプラインのエントリ。
 * ローカルでは `pnpm ingest` で実行できる。
 *
 *   pnpm ingest            # パイプラインを1回実行
 *   pnpm ingest -- --reset # ストアをシードに戻してから実行（デモ初期化）
 */
import './env';
import { aiMode, getStore, parseProgram, refreshLivePrograms, runIngestPipeline } from '@rakugo/agent';
import { LocalStore } from '@rakugo/agent/data';

async function main() {
  const reset = process.argv.includes('--reset');
  if (reset) {
    new LocalStore().reset();
    console.log('🧹 ローカルストアをシードへ初期化しました');
  }

  const store = getStore();
  console.log(`🤖 AIモード: ${aiMode()}（GEMINI_API_KEY ${process.env.GEMINI_API_KEY ? 'あり' : 'なし'}）`);

  // --- parse_program の capability デモ（生テキスト → 構造化） ---
  const rawSample = [
    '2026年7月3日 夜席',
    '1. 春風亭一朝',
    '2. 太神楽曲芸 翁家社中',
    '3. 林家たい平',
    '4. 柳家三三',
    '5. 春風亭一之輔',
  ].join('\n');
  const parsed = await parseProgram({ rawText: rawSample });
  console.log('📋 parse_program サンプル:', JSON.stringify(parsed, null, 2));

  // --- 自律パイプライン実行 ---
  console.log('\n🚀 インジェストパイプラインを実行します...');
  const { run, recommendationsCreated } = await runIngestPipeline(store);

  console.log('\n===== AgentRun =====');
  console.log(`status: ${run.status}`);
  console.log(`programsIngested: ${run.programsIngested}`);
  console.log(`recommendationsCreated: ${recommendationsCreated}`);
  if (run.errors.length) console.log('errors:', run.errors);
  console.log('steps:');
  for (const s of run.steps) {
    console.log(`  [${s.phase}] ${s.message}${s.meta ? ' ' + JSON.stringify(s.meta) : ''}`);
  }

  // --- 実番組スクレイピング（A-01・公式サイトから取得） ---
  console.log('\n🌐 末廣亭・鈴本の公式サイトから実番組を取得します...');
  try {
    const { count } = await refreshLivePrograms(store);
    console.log(`📚 実番組を ${count} 件取得・構造化しました`);
    const live = await store.listLivePrograms();
    for (const p of live.slice(0, 3)) {
      console.log(`  - ${p.venue} ${p.kogyoLabel} ${p.part}: トリ=${p.toriRawName} 香盤=${p.lineup.length}`);
    }
  } catch (e) {
    console.warn('実番組取得に失敗（シードは温存）:', (e as Error).message);
  }

  const recs = await store.listRecommendations('demo-user');
  console.log(`\n🔔 デモユーザーの推薦フィード: ${recs.length} 件`);
  for (const r of recs.slice(0, 5)) {
    console.log(`  - [${r.status}] ${r.matchedAvailability}: ${r.reason.slice(0, 60)}…`);
  }
}

main().catch((err) => {
  console.error('インジェスト失敗:', err);
  process.exit(1);
});
