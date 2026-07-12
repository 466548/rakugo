/**
 * FirestoreStore: DataStore の本番（Firestore）実装。
 *
 * Cloud Run では ADC（GOOGLE_CLOUD_PROJECT / メタデータサーバ）で認証される。
 * データ量が小さい（番組~124・噺家~39）ため、複合インデックスを避けて
 * 単純クエリ＋メモリ内フィルタで実装している。
 * 起動時、コレクションが空ならシードを投入する（デモを即動かすため）。
 */
import { Firestore } from '@google-cloud/firestore';
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
import {
  DEMO_USER,
  RAKUGOKA_SEED,
  SEED_AGENT_RUNS,
  SEED_RECOMMENDATIONS,
  SEED_WATCHES,
  buildSeedPrograms,
} from './seed';

const COL = {
  rakugoka: 'rakugoka',
  programs: 'programs',
  users: 'users',
  watches: 'watches',
  recommendations: 'recommendations',
  feedback: 'feedback',
  agentRuns: 'agentRuns',
  livePrograms: 'livePrograms',
} as const;

const watchId = (userId: string, rakugokaId: string) => `${userId}__${rakugokaId}`;

export class FirestoreStore implements DataStore {
  private readonly db: Firestore;
  private readyPromise?: Promise<void>;

  constructor(databaseId?: string) {
    this.db = new Firestore({
      ignoreUndefinedProperties: true,
      ...(databaseId ? { databaseId } : {}),
    });
  }

  /** 初回利用時に一度だけ：空なら全コレクションへシード投入 */
  private ready(): Promise<void> {
    if (!this.readyPromise) this.readyPromise = this.seedIfEmpty();
    return this.readyPromise;
  }

  private async seedIfEmpty(): Promise<void> {
    const countSnap = await this.db.collection(COL.rakugoka).count().get();
    const current = (countSnap.data() as { count: number }).count;

    // 件数が一致していれば何もしない
    if (current === RAKUGOKA_SEED.length) return;

    await this.writeAll(COL.rakugoka, RAKUGOKA_SEED);
    await this.writeAll(COL.programs, buildSeedPrograms());

    // 完全に空のときだけ、ユーザー系（user/watch/recommendation/run）も初期投入する。
    // 既存データがある場合はカタログ（噺家・番組）だけ同期し、ウォッチ等は保持する。
    if (current === 0) {
      await this.writeAll(COL.users, [DEMO_USER]);
      await this.writeAll(COL.watches, SEED_WATCHES);
      await this.writeAll(COL.recommendations, SEED_RECOMMENDATIONS);
      await this.writeAll(COL.agentRuns, SEED_AGENT_RUNS);
    }
  }

  private async writeAll<T extends { id: string }>(col: string, items: T[]): Promise<void> {
    // バッチ上限500件ごとに分割
    for (let i = 0; i < items.length; i += 450) {
      const batch = this.db.batch();
      for (const item of items.slice(i, i + 450)) {
        batch.set(this.db.collection(col).doc(item.id), item);
      }
      await batch.commit();
    }
  }

  private async all<T>(col: string): Promise<T[]> {
    const snap = await this.db.collection(col).get();
    return snap.docs.map((d) => d.data() as T);
  }

  // --- rakugoka ---
  async listRakugoka(): Promise<Rakugoka[]> {
    await this.ready();
    return this.all<Rakugoka>(COL.rakugoka);
  }
  async getRakugoka(id: string): Promise<Rakugoka | undefined> {
    await this.ready();
    const doc = await this.db.collection(COL.rakugoka).doc(id).get();
    return doc.exists ? (doc.data() as Rakugoka) : undefined;
  }
  async findRakugokaByName(name: string): Promise<Rakugoka | undefined> {
    const q = name.trim();
    const all = await this.listRakugoka();
    return all.find(
      (r) => r.name === q || r.aliases.includes(q) || r.name.includes(q) || q.includes(r.name),
    );
  }
  async upsertRakugoka(r: Rakugoka): Promise<Rakugoka> {
    await this.ready();
    await this.db.collection(COL.rakugoka).doc(r.id).set(r);
    return r;
  }

  // --- program ---
  async listPrograms(filter: ProgramFilter = {}): Promise<Program[]> {
    await this.ready();
    let query = this.db.collection(COL.programs) as FirebaseFirestore.Query;
    if (filter.from) query = query.where('date', '>=', filter.from);
    if (filter.to) query = query.where('date', '<=', filter.to);
    const snap = await query.get();
    return snap.docs
      .map((d) => d.data() as Program)
      .filter((p) => (filter.venue ? p.venue === filter.venue : true))
      .filter((p) => (filter.part ? p.part === filter.part : true))
      .filter((p) =>
        filter.rakugokaId
          ? p.toriRakugokaId === filter.rakugokaId ||
            p.lineup.some((l) => l.rakugokaId === filter.rakugokaId)
          : true,
      )
      .sort((a, b) => (a.date === b.date ? a.part.localeCompare(b.part) : a.date.localeCompare(b.date)));
  }
  async getProgram(id: string): Promise<Program | undefined> {
    await this.ready();
    const doc = await this.db.collection(COL.programs).doc(id).get();
    return doc.exists ? (doc.data() as Program) : undefined;
  }
  async upsertProgram(p: Program): Promise<Program> {
    await this.ready();
    await this.db.collection(COL.programs).doc(p.id).set(p);
    return p;
  }

  // --- user ---
  async getUser(id: string): Promise<User | undefined> {
    await this.ready();
    const doc = await this.db.collection(COL.users).doc(id).get();
    return doc.exists ? (doc.data() as User) : undefined;
  }
  async upsertUser(u: User): Promise<User> {
    await this.ready();
    await this.db.collection(COL.users).doc(u.id).set(u);
    return u;
  }

  // --- watch ---
  async listWatches(userId: string): Promise<Watch[]> {
    await this.ready();
    const snap = await this.db.collection(COL.watches).where('userId', '==', userId).get();
    return snap.docs.map((d) => d.data() as Watch);
  }
  async isWatching(userId: string, rakugokaId: string): Promise<boolean> {
    await this.ready();
    const doc = await this.db.collection(COL.watches).doc(watchId(userId, rakugokaId)).get();
    return doc.exists;
  }
  async addWatch(userId: string, rakugokaId: string): Promise<Watch> {
    await this.ready();
    const watch: Watch = { id: watchId(userId, rakugokaId), userId, rakugokaId, createdAt: nowIso() };
    await this.db.collection(COL.watches).doc(watch.id).set(watch);
    return watch;
  }
  async removeWatch(userId: string, rakugokaId: string): Promise<void> {
    await this.ready();
    await this.db.collection(COL.watches).doc(watchId(userId, rakugokaId)).delete();
  }

  // --- recommendation ---
  async listRecommendations(userId: string): Promise<Recommendation[]> {
    await this.ready();
    const snap = await this.db.collection(COL.recommendations).where('userId', '==', userId).get();
    return snap.docs
      .map((d) => d.data() as Recommendation)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async addRecommendation(
    rec: Omit<Recommendation, 'id' | 'createdAt' | 'status'>,
  ): Promise<Recommendation> {
    await this.ready();
    const full: Recommendation = { ...rec, id: newId('rec'), status: 'unread', createdAt: nowIso() };
    await this.db.collection(COL.recommendations).doc(full.id).set(full);
    return full;
  }
  async setRecommendationStatus(id: string, status: RecommendationStatus): Promise<void> {
    await this.ready();
    await this.db.collection(COL.recommendations).doc(id).update({ status });
  }
  async hasRecommendation(userId: string, programId: string, rakugokaId: string): Promise<boolean> {
    const recs = await this.listRecommendations(userId);
    return recs.some((r) => r.programId === programId && r.rakugokaId === rakugokaId);
  }

  // --- feedback ---
  async addFeedback(fb: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    await this.ready();
    const full: Feedback = { ...fb, id: newId('fb'), createdAt: nowIso() };
    await this.db.collection(COL.feedback).doc(full.id).set(full);
    return full;
  }
  async listFeedback(userId: string): Promise<Feedback[]> {
    await this.ready();
    const snap = await this.db.collection(COL.feedback).where('userId', '==', userId).get();
    return snap.docs.map((d) => d.data() as Feedback);
  }

  // --- live program ---
  async listLivePrograms(): Promise<LiveProgram[]> {
    await this.ready();
    return this.all<LiveProgram>(COL.livePrograms);
  }
  async replaceLivePrograms(items: LiveProgram[]): Promise<void> {
    await this.ready();
    // 既存を全削除してから入れ替え（取得のたびに最新で置き換える）
    const existing = await this.db.collection(COL.livePrograms).get();
    for (let i = 0; i < existing.docs.length; i += 450) {
      const batch = this.db.batch();
      for (const d of existing.docs.slice(i, i + 450)) batch.delete(d.ref);
      await batch.commit();
    }
    await this.writeAll(COL.livePrograms, items);
  }

  // --- agent_run ---
  async listAgentRuns(limit = 20): Promise<AgentRun[]> {
    await this.ready();
    const all = await this.all<AgentRun>(COL.agentRuns);
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
  }
  async getLatestAgentRun(): Promise<AgentRun | undefined> {
    return (await this.listAgentRuns(1))[0];
  }
  async addAgentRun(run: AgentRun): Promise<AgentRun> {
    await this.ready();
    await this.db.collection(COL.agentRuns).doc(run.id).set(run);
    return run;
  }
  async updateAgentRun(id: string, patch: Partial<AgentRun>): Promise<void> {
    await this.ready();
    await this.db.collection(COL.agentRuns).doc(id).set(patch, { merge: true });
  }
}
