import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// リポジトリルートの .env.local を読み込む（GEMINI_API_KEY を app/jobs で共有）。
// Next は app/.env.local を自動読込するが、単一ソースにするためルートも読む。
for (const p of [join(process.cwd(), '..', '.env.local'), join(process.cwd(), '.env.local')]) {
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p);
      break;
    } catch {
      /* noop */
    }
  }
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const nextConfig: NextConfig = {
  // Cloud Run 向けに standalone 出力（小さいランタイムイメージ）
  output: 'standalone',
  // モノレポなのでトレースの基点をリポジトリルートに
  outputFileTracingRoot: repoRoot,
  // ワークスペースの @rakugo/agent（TSソース）をトランスパイル
  transpilePackages: ['@rakugo/agent'],
  // 重い Node ライブラリ（grpc/genai/firestore）はバンドルせず外部参照
  serverExternalPackages: ['@google/adk', '@google-cloud/firestore'],
};

export default nextConfig;
