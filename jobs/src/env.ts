/**
 * ジョブ実行時にリポジトリルートの .env.local を読み込む（GEMINI_API_KEY 等）。
 * tsx は .env を自動読み込みしないため、Node 組み込みの process.loadEnvFile を使う。
 * ingest.ts / verify.ts の先頭で import すること。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

for (const p of [
  join(process.cwd(), '.env.local'),
  join(process.cwd(), '..', '.env.local'),
]) {
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p);
      console.log(`(env: ${p} を読み込みました)`);
      break;
    } catch {
      /* 読み込み失敗時は無視（モードはモックにフォールバック） */
    }
  }
}
