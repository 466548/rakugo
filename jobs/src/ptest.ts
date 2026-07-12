import './env';
import { parseProgram } from '@rakugo/agent';

// 実データ（末廣亭6月中席 昼）の整形済みサンプルで parseProgram を単体検証
const sample = [
  '昼の部',
  '⑪ 桂 鷹治',
  '瀧川 鯉朝',
  '神田 蘭',
  '立川 志の彦',
  '国分 健二',
  '笑福亭 羽光',
  '桂 南なん',
  '北見 伸',
  '桂 伸治',
  '柳家 蝠丸',
  '鏡味 味千代',
  '笑福亭 仁智',
  '三遊亭 笑遊',
  'コントD51',
  '主任',
  '桂 文治',
].join('\n');

async function main() {
  process.env.RAKUGO_DEBUG = '1';
  const model = process.env.PTEST_MODEL || 'gemini-2.5-pro';
  console.log('model=', model);
  const p = await parseProgram({ rawText: sample, partHint: 'day', model });
  console.log('RESULT part=' + p.part + ' tori=' + p.toriRawName + ' lineup=' + p.lineup.length);
  console.log(p.lineup.map((l) => `${l.order}:${l.rawName}${l.isIromono ? '(色物)' : ''}`).join(' / '));
}
main().catch((e) => { console.error(e); process.exit(1); });
