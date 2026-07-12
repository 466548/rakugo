/**
 * DataStore: データアクセスの抽象インターフェース。
 *
 * ローカル先行では LocalStore(JSON) を使い、本番では同じIFの FirestoreStore を
 * 実装して差し替える（要件 §9 / §12: ローカル→GCP移行を容易に）。
 */
import type {
  AgentRun,
  Feedback,
  LiveProgram,
  Program,
  ProgramPart,
  Rakugoka,
  Recommendation,
  RecommendationStatus,
  User,
  Venue,
  Watch,
} from '../domain/types';

export interface ProgramFilter {
  venue?: Venue;
  part?: ProgramPart;
  /** 開始日（含む, YYYY-MM-DD） */
  from?: string;
  /** 終了日（含む, YYYY-MM-DD） */
  to?: string;
  /** この噺家が香盤に含まれる番組のみ */
  rakugokaId?: string;
}

export interface DataStore {
  // --- rakugoka ---
  listRakugoka(): Promise<Rakugoka[]>;
  getRakugoka(id: string): Promise<Rakugoka | undefined>;
  findRakugokaByName(name: string): Promise<Rakugoka | undefined>;
  upsertRakugoka(r: Rakugoka): Promise<Rakugoka>;

  // --- program ---
  listPrograms(filter?: ProgramFilter): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  upsertProgram(p: Program): Promise<Program>;

  // --- user ---
  getUser(id: string): Promise<User | undefined>;
  upsertUser(u: User): Promise<User>;

  // --- watch ---
  listWatches(userId: string): Promise<Watch[]>;
  isWatching(userId: string, rakugokaId: string): Promise<boolean>;
  addWatch(userId: string, rakugokaId: string): Promise<Watch>;
  removeWatch(userId: string, rakugokaId: string): Promise<void>;

  // --- recommendation ---
  listRecommendations(userId: string): Promise<Recommendation[]>;
  addRecommendation(rec: Omit<Recommendation, 'id' | 'createdAt' | 'status'>): Promise<Recommendation>;
  setRecommendationStatus(id: string, status: RecommendationStatus): Promise<void>;
  /** 同一 (user, program, rakugoka) の推薦が既にあるか（重複生成防止） */
  hasRecommendation(userId: string, programId: string, rakugokaId: string): Promise<boolean>;

  // --- feedback ---
  addFeedback(fb: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback>;
  listFeedback(userId: string): Promise<Feedback[]>;

  // --- live program（公式サイトから取得した実番組。シードとは別管理）---
  listLivePrograms(): Promise<LiveProgram[]>;
  replaceLivePrograms(items: LiveProgram[]): Promise<void>;

  // --- agent_run（運用ダッシュボード）---
  listAgentRuns(limit?: number): Promise<AgentRun[]>;
  getLatestAgentRun(): Promise<AgentRun | undefined>;
  addAgentRun(run: AgentRun): Promise<AgentRun>;
  updateAgentRun(id: string, patch: Partial<AgentRun>): Promise<void>;
}

/** 衝突しにくい短いID（demoローカル用。本番は Firestore のドキュメントIDを使う） */
export function newId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-5);
  return `${prefix}${prefix ? '_' : ''}${time}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
