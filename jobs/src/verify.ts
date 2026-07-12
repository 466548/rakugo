/**
 * エージェント機能の動作検証スクリプト。
 *   pnpm --filter @rakugo/jobs verify
 *
 * - matchRakugoka（好み→師匠マッチング, F-01）を複数入力で実行（モックでも必ず動く）
 * - GEMINI_API_KEY があれば、実 Gemini(ADK) 経由の match / parseProgram も実行
 */
import './env';
import { aiMode, getStore, matchRakugoka, parseProgram } from '@rakugo/agent';

async function main() {
  const store = getStore();
  const catalog = await store.listRakugoka();
  console.log(`AIモード: ${aiMode()} / カタログ ${catalog.length} 名\n`);

  const inputs = [
    { label: '自由文: 人情噺で泣きたい', input: { text: '人情噺でじっくり泣きたい' } },
    { label: '自由文: 短くテンポよく笑う', input: { text: '短くてテンポよく笑いたい' } },
    { label: '師匠名基準: 柳家喬太郎', input: { rakugokaName: '柳家喬太郎' } },
    { label: '空入力（初心者デフォルト）', input: {} },
  ];

  let failures = 0;
  for (const { label, input } of inputs) {
    const res = await matchRakugoka(input, catalog);
    const top = res.matches
      .slice(0, 3)
      .map((m) => `${m.rakugoka.name}(${m.score})`)
      .join(', ');
    const ok = res.matches.length > 0;
    if (!ok) failures++;
    // 師匠名基準のとき、基準自身が候補に入っていないこと
    const excludesBase =
      label.includes('柳家喬太郎') ? !res.matches.some((m) => m.rakugoka.name === '柳家喬太郎') : true;
    if (!excludesBase) failures++;
    console.log(`▶ ${label}`);
    console.log(`  推定芸風: ${res.inferredStyles.join('・') || '(なし)'}`);
    console.log(`  候補: ${top || '(なし)'}  ${ok ? '✓' : '✗ 候補ゼロ'}${excludesBase ? '' : ' ✗ 基準が混入'}`);
  }

  // 番組構造化（モック）
  const parsed = await parseProgram({
    rawText: '2026年7月3日 夜席\n春風亭一朝\n太神楽 翁家社中\n柳家三三\n春風亭一之輔',
  });
  const parseOk = parsed.lineup.length >= 3 && parsed.part === 'night' && parsed.toriRawName === '春風亭一之輔';
  if (!parseOk) failures++;
  console.log(`\n▶ parseProgram: part=${parsed.part} 香盤=${parsed.lineup.length} トリ=${parsed.toriRawName} ${parseOk ? '✓' : '✗'}`);

  if (aiMode() === 'gemini') {
    console.log('\n=== 実 Gemini(ADK) 経由の検証 ===');
    try {
      const aiRes = await matchRakugoka({ text: '人情噺でしみじみしたい' }, catalog);
      console.log(`match(${aiRes.mode}): ${aiRes.matches.map((m) => m.rakugoka.name).join(', ')}`);
      console.log(`  理由例: ${aiRes.matches[0]?.reason ?? '(なし)'}`);
      const aiParsed = await parseProgram({
        rawText: '令和8年7月中席 昼の部\n柳家喬太郎\nナイツ\n春風亭一之輔（主任）',
      });
      console.log(`parseProgram: part=${aiParsed.part} トリ=${aiParsed.toriRawName} 香盤=${aiParsed.lineup.length}`);
    } catch (e) {
      console.error('Gemini 検証で例外:', (e as Error).message);
      failures++;
    }
  } else {
    console.log('\n(GEMINI_API_KEY 未設定のため Gemini 経由の検証はスキップ)');
  }

  console.log(`\n${failures === 0 ? '✅ すべて成功' : `❌ ${failures} 件の失敗`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
