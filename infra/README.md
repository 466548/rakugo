# infra — Google Cloud デプロイ

前座さんは「運用され続けるエージェント」として設計している。ここではその本番構成をまとめる。

## アーキテクチャ

```
[Cloud Scheduler] --daily(6:00 JST)--> [Cloud Run Job: rakugo-ingest]
      取得 → Gemini構造化 → 照合(ウォッチ×番組×空き日) → 推薦生成 → Firestore保存
                                                  │
[ユーザー] <--HTTPS--> [Cloud Run: rakugo-app (Next.js)] <--> [Firestore]
                                                  └──> [Gemini API (ADK)]
全工程の判断は Cloud Logging / Cloud Trace に構造化記録
```

| 役割 | プロダクト | 補足 |
|---|---|---|
| フロント/API | Cloud Run (`rakugo-app`) | Next.js standalone イメージ |
| 自律バッチ | Cloud Run Jobs (`rakugo-ingest`) | 毎日の取得〜推薦生成 |
| スケジューラ | Cloud Scheduler (`rakugo-daily`) | 6:00 JST に Job 起動 |
| データ | Firestore (Native) | `RAKUGO_DATA_BACKEND=firestore` |
| LLM | Gemini API | キーは Secret Manager（`GEMINI_API_KEY`） |
| 監視 | Cloud Logging / Trace / Monitoring | 判断ログ・トレース・スクレイプ失敗アラート |

## 前提セットアップ

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com cloudscheduler.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com

# Firestore（Native モード）
gcloud firestore databases create --location=asia-northeast1

# Gemini API キーを Secret Manager へ
printf '%s' "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

## デプロイ

```bash
GCP_PROJECT_ID=your-project GCP_REGION=asia-northeast1 bash infra/deploy.sh
```

CI からの自動デプロイは `.github/workflows/deploy.yml`（手動トリガ / Workload Identity）。

## 残作業（本番化の唯一の未実装点）

データアクセスは `DataStore` インターフェース（`agent/src/data/store.ts`）で抽象化済みで、
ローカルは `LocalStore`（JSON）で動作している。本番では同インターフェースを実装する
**`FirestoreStore` の追加**が必要（`RAKUGO_DATA_BACKEND=firestore` で切り替わるよう `getStore()` を分岐）。
それ以外（エージェント・パイプライン・UI・CI・スケジューラ構成）はそのまま本番に載る。
