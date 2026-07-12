/**
 * ドメインモデル（要件定義書 §10 の Firestore コレクションを TypeScript 化）
 *
 * ローカルストアでも本番 Firestore でも同じこの型を使う。
 * Firestore の Timestamp は ISO8601 文字列で表現する（移植容易・JSON保存可能）。
 */

/** 対象定席。MVP は末廣亭・鈴本の2場、Stretch で4場＋繁昌亭に拡張 */
export type Venue = 'suehirotei' | 'suzumoto' | 'asakusa' | 'ikebukuro' | 'hanjotei';

export const VENUES: Record<Venue, { id: Venue; name: string; area: string; mvp: boolean }> = {
  suehirotei: { id: 'suehirotei', name: '新宿末廣亭', area: '新宿', mvp: true },
  suzumoto: { id: 'suzumoto', name: '鈴本演芸場', area: '上野', mvp: true },
  asakusa: { id: 'asakusa', name: '浅草演芸ホール', area: '浅草', mvp: false },
  ikebukuro: { id: 'ikebukuro', name: '池袋演芸場', area: '池袋', mvp: false },
  hanjotei: { id: 'hanjotei', name: '天満天神繁昌亭', area: '大阪', mvp: false },
};

/** 部（昼席 / 夜席） */
export type ProgramPart = 'day' | 'night';

export const PART_LABEL: Record<ProgramPart, string> = {
  day: '昼席',
  night: '夜席',
};

/** 芸風タグ。マッチングの軸になる */
export type StyleTag =
  | '滑稽噺'
  | '人情噺'
  | '怪談噺'
  | '新作'
  | '古典'
  | '廓噺'
  | '芝居噺'
  | 'まくら名人'
  | 'テンポ重視'
  | '正統派';

/** 所属団体 / 流派 */
export type RakugokaGroup = 'rakugo' | 'geijutsu' | 'enraku' | 'tatekawa' | 'kamigata';

export const GROUP_LABEL: Record<RakugokaGroup, string> = {
  rakugo: '落語協会',
  geijutsu: '落語芸術協会',
  enraku: '円楽一門会',
  tatekawa: '落語立川流',
  kamigata: '上方',
};

/** どこで会えるか */
export type VenueType = 'teiseki' | 'kamigata' | 'dokuen';

export const VENUE_TYPE_LABEL: Record<VenueType, string> = {
  teiseki: '寄席の定席で会える',
  kamigata: '上方の寄席で会える',
  dokuen: '独演会・ホール中心',
};

/**
 * 見取り図の2軸ポジション（0–100）。
 * x: 0=古典 ←→ 100=新作 / y: 0=爆笑・エンタメ ←→ 100=本格・正統派
 */
export interface StylePosition {
  x: number;
  y: number;
}

/** 噺家プロファイル（AI が公開情報から生成した推定） */
export interface Rakugoka {
  id: string;
  name: string;
  /** 表記ゆれ吸収用（番組表の生テキストと突き合わせる） */
  aliases: string[];
  /** 所属団体（GROUP_LABEL のラベル文字列） */
  association?: string;
  /** 所属団体 / 流派（見取り図の色分け・フィルタに使用） */
  group: RakugokaGroup;
  /** どこで会えるか（定席 / 上方 / 独演会） */
  venueType: VenueType;
  /** 見取り図の2軸ポジション */
  position: StylePosition;
  /** 入門おすすめ（◎） */
  beginnerPick: boolean;
  styleTags: StyleTag[];
  /** 0–100。初心者向き度 */
  beginnerScore: number;
  /** AI生成の特徴説明 */
  description: string;
  /** 一行キャッチ（提案カード用） */
  tagline: string;
  /** 漫画「あかね噺」ゆかり（演目など） */
  akane?: string;
  /** あかね噺落語会'26 の演目など */
  kai?: string;
  /** 出典（必須：説明可能性のため） */
  sources: { title: string; url: string }[];
  /** 必須フラグ：AI が公開情報から生成した推定であること */
  generatedByAi: true;
  updatedAt: string;
}

/** 香盤（出演順）の1枠 */
export interface LineupEntry {
  order: number;
  rakugokaId?: string;
  /** 番組表の生テキスト（マッチ前 / マッチできない場合に残す） */
  rawName: string;
  /** 色物（漫才・曲芸など噺家以外）か */
  isIromono?: boolean;
}

/** 公演 / 番組 */
export interface Program {
  id: string;
  venue: Venue;
  /** 興行日（YYYY-MM-DD）。寄席は通常10日替わりだが、MVPは日付単位で持つ */
  date: string;
  part: ProgramPart;
  lineup: LineupEntry[];
  /** トリ（主任）の噺家 ID */
  toriRakugokaId?: string;
  sourceUrl: string;
  fetchedAt: string;
}

/** ユーザーの空き日設定 */
export interface Availability {
  /** 行ける曜日（'mon'..'sun'） */
  weekdays?: Weekday[];
  /** 個別に行ける日付（YYYY-MM-DD） */
  dates?: string[];
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

export interface User {
  id: string;
  displayName: string;
  availability: Availability;
  /** Stretch: Googleカレンダー連携 */
  calendarConnected: boolean;
  /** 通える定席 */
  reachableVenues: Venue[];
}

/** ウォッチリスト（追っかけ登録） */
export interface Watch {
  id: string;
  userId: string;
  rakugokaId: string;
  createdAt: string;
}

export type RecommendationStatus = 'unread' | 'read' | 'dismissed';

/** 推薦 / 通知 */
export interface Recommendation {
  id: string;
  userId: string;
  programId: string;
  rakugokaId: string;
  /** 推薦理由（自然文・説明可能性の核） */
  reason: string;
  /** 突き合わせた空き日（人間可読、例: "6/20(土)"） */
  matchedAvailability: string;
  status: RecommendationStatus;
  createdAt: string;
}

export type FeedbackResult = 'went_liked' | 'went_disliked' | 'skipped';

export interface Feedback {
  id: string;
  userId: string;
  recommendationId: string;
  result: FeedbackResult;
  createdAt: string;
}

export type AgentRunStatus = 'running' | 'success' | 'failed';

/** 運用ダッシュボード用：自律ジョブの実行履歴 */
export interface AgentRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: AgentRunStatus;
  programsIngested: number;
  profilesUpdated: number;
  recommendationsCreated: number;
  errors: string[];
  /** 各判断の構造化ログ（観測可能性 §5.2 のデモ用） */
  steps: AgentRunStep[];
}

/**
 * 公式サイトから取得した実番組（A-01 スクレイピング結果）。
 * シードの program とは別管理（ゴールデンパスのデモを壊さないため）。
 * 実在の出演者はカタログに無いことが多いので rawName 主体で保持する。
 */
export interface LiveProgram {
  id: string;
  venue: Venue;
  /** 興行ラベル（例: 6月中席） */
  kogyoLabel: string;
  part: ProgramPart;
  lineup: { order: number; rawName: string; isIromono: boolean }[];
  toriRawName: string | null;
  sourceUrl: string;
  fetchedAt: string;
}

export interface AgentRunStep {
  at: string;
  /** fetch | parse | profile | match | recommend | save */
  phase: string;
  message: string;
  /** 任意の構造化メタ（何件処理したか等） */
  meta?: Record<string, unknown>;
}
