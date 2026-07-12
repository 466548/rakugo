/**
 * LocalStore: JSONファイル1枚で動く DataStore 実装（ローカル先行 / GCP不要）。
 *
 * - 起動時にファイルを読み込み（無ければシード投入）、メモリ上に保持。
 * - 変更時はメモリを更新しつつファイルへ書き戻す（write-through）。
 * - 同一インターフェース（DataStore）なので、将来 FirestoreStore に差し替え可能。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse as parsePath } from 'node:path';
import type {
  AgentRun,
  Feedback,
  LiveProgram,
  Program,
  Rakugoka,
  Recommendation,
  RecommendationStatus,
  User,
  Watch,
} from '../domain/types';
import { type DataStore, type ProgramFilter, newId, nowIso } from './store';
import { FirestoreStore } from './firestore-store';
import {
  DEMO_USER,
  RAKUGOKA_SEED,
  SEED_AGENT_RUNS,
  SEED_RECOMMENDATIONS,
  SEED_WATCHES,
  buildSeedPrograms,
} from './seed';

interface Database {
  rakugoka: Rakugoka[];
  programs: Program[];
  users: User[];
  watches: Watch[];
  recommendations: Recommendation[];
  feedback: Feedback[];
  agentRuns: AgentRun[];
  livePrograms?: LiveProgram[];
}

function buildSeedDatabase(): Database {
  return {
    rakugoka: structuredClone(RAKUGOKA_SEED),
    programs: buildSeedPrograms(),
    users: [structuredClone(DEMO_USER)],
    watches: structuredClone(SEED_WATCHES),
    recommendations: structuredClone(SEED_RECOMMENDATIONS),
    feedback: [],
    agentRuns: structuredClone(SEED_AGENT_RUNS),
  };
}

export interface LocalStoreOptions {
  /** データファイルの保存ディレクトリ（既定: process.cwd()/.localdata） */
  dataDir?: string;
}

export class LocalStore implements DataStore {
  private db: Database;
  private readonly file: string;

  constructor(opts: LocalStoreOptions = {}) {
    const dir = resolveDataDir(opts.dataDir);
    this.file = join(dir, 'db.json');
    if (existsSync(this.file)) {
      try {
        this.db = JSON.parse(readFileSync(this.file, 'utf8')) as Database;
      } catch {
        this.db = buildSeedDatabase();
        this.persist();
      }
    } else {
      this.db = buildSeedDatabase();
      this.persist();
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.db, null, 2), 'utf8');
  }

  /** テスト/再シード用にデータを初期化する */
  reset(): void {
    this.db = buildSeedDatabase();
    this.persist();
  }

  // --- rakugoka ---
  async listRakugoka(): Promise<Rakugoka[]> {
    return [...this.db.rakugoka];
  }
  async getRakugoka(id: string): Promise<Rakugoka | undefined> {
    return this.db.rakugoka.find((r) => r.id === id);
  }
  async findRakugokaByName(name: string): Promise<Rakugoka | undefined> {
    const q = name.trim();
    return this.db.rakugoka.find(
      (r) => r.name === q || r.aliases.includes(q) || r.name.includes(q) || q.includes(r.name),
    );
  }
  async upsertRakugoka(r: Rakugoka): Promise<Rakugoka> {
    const idx = this.db.rakugoka.findIndex((x) => x.id === r.id);
    if (idx >= 0) this.db.rakugoka[idx] = r;
    else this.db.rakugoka.push(r);
    this.persist();
    return r;
  }

  // --- program ---
  async listPrograms(filter: ProgramFilter = {}): Promise<Program[]> {
    return this.db.programs
      .filter((p) => (filter.venue ? p.venue === filter.venue : true))
      .filter((p) => (filter.part ? p.part === filter.part : true))
      .filter((p) => (filter.from ? p.date >= filter.from : true))
      .filter((p) => (filter.to ? p.date <= filter.to : true))
      .filter((p) =>
        filter.rakugokaId
          ? p.lineup.some((l) => l.rakugokaId === filter.rakugokaId) ||
            p.toriRakugokaId === filter.rakugokaId
          : true,
      )
      .sort((a, b) => (a.date === b.date ? a.part.localeCompare(b.part) : a.date.localeCompare(b.date)));
  }
  async getProgram(id: string): Promise<Program | undefined> {
    return this.db.programs.find((p) => p.id === id);
  }
  async upsertProgram(p: Program): Promise<Program> {
    const idx = this.db.programs.findIndex((x) => x.id === p.id);
    if (idx >= 0) this.db.programs[idx] = p;
    else this.db.programs.push(p);
    this.persist();
    return p;
  }

  // --- user ---
  async getUser(id: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.id === id);
  }
  async upsertUser(u: User): Promise<User> {
    const idx = this.db.users.findIndex((x) => x.id === u.id);
    if (idx >= 0) this.db.users[idx] = u;
    else this.db.users.push(u);
    this.persist();
    return u;
  }

  // --- watch ---
  async listWatches(userId: string): Promise<Watch[]> {
    return this.db.watches.filter((w) => w.userId === userId);
  }
  async isWatching(userId: string, rakugokaId: string): Promise<boolean> {
    return this.db.watches.some((w) => w.userId === userId && w.rakugokaId === rakugokaId);
  }
  async addWatch(userId: string, rakugokaId: string): Promise<Watch> {
    const existing = this.db.watches.find(
      (w) => w.userId === userId && w.rakugokaId === rakugokaId,
    );
    if (existing) return existing;
    const watch: Watch = { id: newId('watch'), userId, rakugokaId, createdAt: nowIso() };
    this.db.watches.push(watch);
    this.persist();
    return watch;
  }
  async removeWatch(userId: string, rakugokaId: string): Promise<void> {
    this.db.watches = this.db.watches.filter(
      (w) => !(w.userId === userId && w.rakugokaId === rakugokaId),
    );
    this.persist();
  }

  // --- recommendation ---
  async listRecommendations(userId: string): Promise<Recommendation[]> {
    return this.db.recommendations
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async addRecommendation(
    rec: Omit<Recommendation, 'id' | 'createdAt' | 'status'>,
  ): Promise<Recommendation> {
    const full: Recommendation = {
      ...rec,
      id: newId('rec'),
      status: 'unread',
      createdAt: nowIso(),
    };
    this.db.recommendations.push(full);
    this.persist();
    return full;
  }
  async setRecommendationStatus(id: string, status: RecommendationStatus): Promise<void> {
    const rec = this.db.recommendations.find((r) => r.id === id);
    if (rec) {
      rec.status = status;
      this.persist();
    }
  }
  async hasRecommendation(userId: string, programId: string, rakugokaId: string): Promise<boolean> {
    return this.db.recommendations.some(
      (r) => r.userId === userId && r.programId === programId && r.rakugokaId === rakugokaId,
    );
  }

  // --- feedback ---
  async addFeedback(fb: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    const full: Feedback = { ...fb, id: newId('fb'), createdAt: nowIso() };
    this.db.feedback.push(full);
    this.persist();
    return full;
  }
  async listFeedback(userId: string): Promise<Feedback[]> {
    return this.db.feedback.filter((f) => f.userId === userId);
  }

  // --- live program ---
  async listLivePrograms(): Promise<LiveProgram[]> {
    return [...(this.db.livePrograms ?? [])];
  }
  async replaceLivePrograms(items: LiveProgram[]): Promise<void> {
    this.db.livePrograms = items;
    this.persist();
  }

  // --- agent_run ---
  async listAgentRuns(limit = 20): Promise<AgentRun[]> {
    return [...this.db.agentRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }
  async getLatestAgentRun(): Promise<AgentRun | undefined> {
    return [...this.db.agentRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  }
  async addAgentRun(run: AgentRun): Promise<AgentRun> {
    this.db.agentRuns.push(run);
    this.persist();
    return run;
  }
  async updateAgentRun(id: string, patch: Partial<AgentRun>): Promise<void> {
    const idx = this.db.agentRuns.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.db.agentRuns[idx] = { ...this.db.agentRuns[idx]!, ...patch };
      this.persist();
    }
  }
}

function resolveDataDir(dataDir?: string): string {
  const explicit = dataDir ?? process.env.RAKUGO_LOCAL_DATA_DIR;
  if (explicit) {
    return isAbsolute(explicit) ? explicit : join(findRepoRoot(process.cwd()), explicit);
  }
  // サーバーレス（Cloud Run / Vercel / Lambda）はFSが /tmp のみ書き込み可。
  // FirestoreStore 未使用時のフォールバック（各インスタンスでシードから起動）。
  if (
    process.env.K_SERVICE ||
    process.env.CLOUD_RUN_JOB ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  ) {
    return '/tmp/rakugo-data';
  }
  // ローカル: モノレポ root（pnpm-workspace.yaml）を基準に app/jobs で同じストアを共有
  return join(findRepoRoot(process.cwd()), '.localdata');
}

function findRepoRoot(start: string): string {
  let dir = start;
  const { root } = parsePath(dir);
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    if (dir === root) return start; // 見つからなければ cwd
    dir = dirname(dir);
  }
}

// --- シングルトン（プロセス内で1インスタンス共有）---
let singleton: DataStore | undefined;

/**
 * Cloud Run（K_SERVICE）や RAKUGO_DATA_BACKEND=firestore のときは Firestore、
 * それ以外（ローカル開発）は JSON ファイルの LocalStore を使う。
 */
export function getStore(): DataStore {
  if (!singleton) {
    // K_SERVICE=Cloud Run サービス / CLOUD_RUN_JOB=Cloud Run ジョブ
    const useFirestore =
      process.env.RAKUGO_DATA_BACKEND === 'firestore' ||
      !!process.env.K_SERVICE ||
      !!process.env.CLOUD_RUN_JOB;
    singleton = useFirestore ? new FirestoreStore() : new LocalStore();
  }
  return singleton;
}
