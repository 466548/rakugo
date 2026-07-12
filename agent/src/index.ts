/**
 * @rakugo/agent パブリックAPI
 * - ドメイン型 / スキーマ
 * - データストア（ローカル/Firestore 差し替え可能なIF）
 * - エージェント機能（マッチング・プロファイル・番組構造化・推薦・自律パイプライン）
 */
export * from './domain/index';
export * from './data/index';
export * from './agent/index';
export * from './util/date';
