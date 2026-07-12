/**
 * エージェント出力品質の eval（要件 §5.3）。
 *   pnpm --filter @rakugo/evals eval
 *
 * 芸風分類・初心者判定・番組構造化の妥当性を小さなテストセットで検証し、
 * 1件でも落ちたら非ゼロ終了する（CI で品質劣化に気づける）。
 * 判定は決定的なルールベース経路を対象にする（CI では API キー不要・再現性を担保）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore, matchRakugoka, parseProgram, type PreferenceInput, type StyleTag } from '@rakugo/agent';

// 決定的に評価するため AI はモック固定
process.env.RAKUGO_FORCE_MOCK = 'true';

interface Cases {
  matching: {
    name: string;
    input: PreferenceInput;
    expectInferred?: StyleTag[];
    expectTopStyleAny?: StyleTag[];
    expectExcludeId?: string;
  }[];
  parsing: { name: string; rawText: string; expectPart: string; expectTori: string; minLineup: number }[];
  beginner: { name: string; rakugokaId: string; minBeginnerScore?: number; maxBeginnerScore?: number }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(here, 'cases.json'), 'utf8')) as Cases;

let pass = 0;
let fail = 0;
const report = (ok: boolean, name: string, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  const store = getStore();
  const catalog = await store.listRakugoka();

  console.log('▼ 芸風マッチング');
  for (const c of cases.matching) {
    const res = await matchRakugoka(c.input, catalog);
    let ok = true;
    const reasons: string[] = [];
    if (c.expectInferred) {
      const miss = c.expectInferred.filter((s) => !res.inferredStyles.includes(s));
      if (miss.length) {
        ok = false;
        reasons.push(`推定芸風に${miss.join('/')}なし`);
      }
    }
    if (c.expectTopStyleAny) {
      const top = res.matches.slice(0, 3).flatMap((m) => m.rakugoka.styleTags);
      if (!c.expectTopStyleAny.some((s) => top.includes(s))) {
        ok = false;
        reasons.push(`上位に${c.expectTopStyleAny.join('/')}の師匠なし`);
      }
    }
    if (c.expectExcludeId && res.matches.some((m) => m.rakugoka.id === c.expectExcludeId)) {
      ok = false;
      reasons.push(`除外すべき${c.expectExcludeId}が混入`);
    }
    report(ok, c.name, reasons.join(' / ') || `top: ${res.matches.slice(0, 3).map((m) => m.rakugoka.name).join('・')}`);
  }

  console.log('▼ 番組構造化');
  for (const c of cases.parsing) {
    const p = await parseProgram({ rawText: c.rawText });
    const ok = p.part === c.expectPart && p.toriRawName === c.expectTori && p.lineup.length >= c.minLineup;
    report(ok, c.name, `part=${p.part} tori=${p.toriRawName} 香盤=${p.lineup.length}`);
  }

  console.log('▼ 初心者向き判定');
  for (const c of cases.beginner) {
    const r = catalog.find((x) => x.id === c.rakugokaId);
    let ok = !!r;
    if (r) {
      if (c.minBeginnerScore != null && r.beginnerScore < c.minBeginnerScore) ok = false;
      if (c.maxBeginnerScore != null && r.beginnerScore > c.maxBeginnerScore) ok = false;
    }
    report(ok, c.name, r ? `score=${r.beginnerScore}` : 'not found');
  }

  const total = pass + fail;
  console.log(`\n結果: ${pass}/${total} pass`);
  if (fail > 0) {
    console.error(`❌ eval 失敗（${fail}件）。品質が基準を下回りました。`);
    process.exit(1);
  }
  console.log('✅ eval 全件パス');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
