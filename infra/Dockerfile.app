# 前座さん フロントエンド（Next.js）の Cloud Run 用イメージ
# モノレポ全体をコンテキストにビルドする:  docker build -f infra/Dockerfile.app -t rakugo-app .
# syntax=docker/dockerfile:1

FROM node:24-slim AS base
RUN corepack enable
WORKDIR /repo

# --- 依存解決 & ビルド ---
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rakugo/app build

# --- 実行（standalone 出力のみ）---
FROM node:24-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# next.config: output:'standalone' + outputFileTracingRoot=repoRoot のためリポジトリ構造で出力される
COPY --from=build /repo/app/.next/standalone ./
COPY --from=build /repo/app/.next/static ./app/.next/static
EXPOSE 8080
CMD ["node", "app/server.js"]
