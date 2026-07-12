#!/usr/bin/env bash
#
# 前座さん を Google Cloud（Cloud Run + Cloud Run Jobs + Cloud Scheduler）へデプロイする。
# ローカル先行で開発しているため、本番リソースは本スクリプトでまとめて構築する。
#
# 前提（infra/README.md 参照）:
#   - gcloud 認証済み / 課金有効なプロジェクト
#   - 有効化済み API: run, cloudbuild, artifactregistry, cloudscheduler, firestore, secretmanager
#   - Secret Manager に GEMINI_API_KEY を登録済み
#   - Firestore（Native モード）作成済み
#
# 使い方:
#   GCP_PROJECT_ID=your-proj GCP_REGION=asia-northeast1 bash infra/deploy.sh
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:?GCP_PROJECT_ID を設定してください}"
REGION="${GCP_REGION:-asia-northeast1}"
REPO="${REGION}-docker.pkg.dev/${PROJECT}/rakugo"

gcloud config set project "$PROJECT"

# Artifact Registry（冪等）
gcloud artifacts repositories create rakugo \
  --repository-format=docker --location="$REGION" 2>/dev/null || true
gcloud auth configure-docker "${REGION}-docker.pkg.dev" -q

# --- ビルド & プッシュ ---
docker build -f infra/Dockerfile.app  -t "${REPO}/app:latest"  .
docker build -f infra/Dockerfile.jobs -t "${REPO}/jobs:latest" .
docker push "${REPO}/app:latest"
docker push "${REPO}/jobs:latest"

# --- フロントエンド（Cloud Run service）---
gcloud run deploy rakugo-app \
  --image "${REPO}/app:latest" --region "$REGION" --platform managed \
  --allow-unauthenticated --port 8080 \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars "RAKUGO_DATA_BACKEND=firestore"

# --- インジェスト（Cloud Run Job）---
gcloud run jobs deploy rakugo-ingest \
  --image "${REPO}/jobs:latest" --region "$REGION" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars "RAKUGO_DATA_BACKEND=firestore"

# --- 毎日6時(JST)に Job を起動する Cloud Scheduler ---
JOB_RUN_URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT}/jobs/rakugo-ingest:run"
SA="$(gcloud config get-value account)"
gcloud scheduler jobs create http rakugo-daily --location "$REGION" \
  --schedule "0 6 * * *" --time-zone "Asia/Tokyo" \
  --uri "$JOB_RUN_URI" --http-method POST \
  --oauth-service-account-email "$SA" 2>/dev/null || \
gcloud scheduler jobs update http rakugo-daily --location "$REGION" \
  --schedule "0 6 * * *" --time-zone "Asia/Tokyo" \
  --uri "$JOB_RUN_URI" --http-method POST \
  --oauth-service-account-email "$SA"

echo "✅ デプロイ完了。Cloud Run の URL は: gcloud run services describe rakugo-app --region $REGION --format 'value(status.url)'"
