/**
 * シードデータ（ローカル先行 / デモ用）。
 *
 * 噺家カタログは Taz 作成の「落語家の見取り図」(rakugo-map) の39名・2軸座標を一次データとし、
 * styleTags / beginnerScore / tagline は座標と紹介文から導出する（すべて AI/ヒューリスティック推定。
 * 要件 §12 に従い generatedByAi: true を明示）。番組は対象2定席について date range で機械生成する。
 */
import type {
  AgentRun,
  Program,
  Rakugoka,
  RakugokaGroup,
  Recommendation,
  StyleTag,
  User,
  VenueType,
  Watch,
} from '../domain/types';
import { GROUP_LABEL } from '../domain/types';

export const DEMO_USER_ID = 'demo-user';

/** デモの基準日（要件上の「今日」）。シードはこの日を起点に番組を作る */
export const SEED_TODAY = '2026-06-15';

// --- 見取り図の一次データ（x:古典0↔新作100 / y:爆笑0↔本格100） ---
interface MapEntry {
  id: string;
  name: string;
  group: RakugokaGroup;
  venue: VenueType;
  x: number;
  y: number;
  nyumon: boolean;
  akane?: string;
  kai?: string;
  m: string;
}

const MAP_ENTRIES: MapEntry[] = [
  // 落語協会
  { id: 'kumosuke', name: '五街道雲助', group: 'rakugo', venue: 'teiseki', x: 12, y: 92, nyumon: false, m: '人間国宝。江戸前の古典をいぶし銀で。本格派の頂点' },
  { id: 'sankyo', name: '柳家さん喬', group: 'rakugo', venue: 'teiseki', x: 18, y: 84, nyumon: false, akane: '芝浜・人情噺（寄席派の受け皿）', m: '情の柳家。人情噺の名手' },
  { id: 'sanza', name: '柳家三三', group: 'rakugo', venue: 'teiseki', x: 16, y: 79, nyumon: false, m: '端正でモダンな古典の優等生' },
  { id: 'kikunojo', name: '古今亭菊之丞', group: 'rakugo', venue: 'teiseki', x: 20, y: 75, nyumon: false, m: '粋でいなせな江戸前' },
  { id: 'bungiku', name: '古今亭文菊', group: 'rakugo', venue: 'teiseki', x: 17, y: 78, nyumon: false, m: '静かで端正、独特の間' },
  { id: 'shojaku', name: '林家正雀', group: 'rakugo', venue: 'teiseki', x: 9, y: 73, nyumon: false, akane: '真景累ヶ淵（圓朝もの・怪談噺）', m: '圓朝もの・芝居噺・怪談噺の継承者。渋い本格派' },
  { id: 'iccho', name: '春風亭一朝', group: 'rakugo', venue: 'teiseki', x: 23, y: 70, nyumon: false, kai: '片棒', m: '江戸前のリズム。一之輔の師匠' },
  { id: 'touka', name: '蝶花楼桃花', group: 'rakugo', venue: 'teiseki', x: 22, y: 58, nyumon: true, kai: '動物園', m: '一朝門下の女性真打（元ぴっかり☆）。明るく親しみやすい古典' },
  { id: 'kikuhiko', name: '林家木久彦', group: 'rakugo', venue: 'teiseki', x: 31, y: 46, nyumon: false, kai: 'やかん', m: '林家木久扇の長男（元きくお）。明るい一門の味' },
  { id: 'gontaro', name: '柳家権太楼', group: 'rakugo', venue: 'teiseki', x: 24, y: 30, nyumon: true, akane: '大工調べ・まんじゅうこわい', m: '寄席の爆笑請負人。古典でドカンと沸かす' },
  { id: 'ichinosuke', name: '春風亭一之輔', group: 'rakugo', venue: 'teiseki', x: 37, y: 52, nyumon: true, akane: '大工調べ', kai: '青菜（主任）', m: '古典を今の感覚で爆笑に。落語界の看板。NHKの入門番組も' },
  { id: 'kyotaro', name: '柳家喬太郎', group: 'rakugo', venue: 'teiseki', x: 56, y: 47, nyumon: true, m: '古典も新作も自在。振り幅の天才' },
  { id: 'shozo', name: '林家正蔵', group: 'rakugo', venue: 'teiseki', x: 33, y: 56, nyumon: false, m: '笑点メンバー。古典中心' },
  { id: 'taihei', name: '林家たい平', group: 'rakugo', venue: 'teiseki', x: 41, y: 34, nyumon: true, m: '笑点でおなじみ。明るい爆笑系' },
  { id: 'wanjo', name: '三遊亭わん丈', group: 'rakugo', venue: 'teiseki', x: 49, y: 56, nyumon: false, m: '16人抜きの大抜擢真打。勢いの新鋭' },
  { id: 'hikoichi', name: '林家彦いち', group: 'rakugo', venue: 'teiseki', x: 82, y: 28, nyumon: false, m: '体育会系の新作派' },
  { id: 'momoe', name: '春風亭百栄', group: 'rakugo', venue: 'teiseki', x: 86, y: 23, nyumon: false, m: 'ヘンテコ新作の名手' },
  { id: 'hakucho', name: '三遊亭白鳥', group: 'rakugo', venue: 'teiseki', x: 94, y: 19, nyumon: false, m: '新作落語の怪物。ぶっ飛んだ世界観' },
  // 落語芸術協会
  { id: 'miyaji', name: '桂宮治', group: 'geijutsu', venue: 'teiseki', x: 30, y: 23, nyumon: true, akane: 'まんじゅうこわい等の滑稽噺', m: '爆発的エネルギー。笑点メンバー' },
  { id: 'risho', name: '瀧川鯉昇', group: 'geijutsu', venue: 'teiseki', x: 24, y: 56, nyumon: false, m: 'とぼけた味の古典。じわじわ可笑しい' },
  { id: 'shosho', name: '春風亭昇々', group: 'geijutsu', venue: 'teiseki', x: 80, y: 21, nyumon: false, kai: '裸ンナー!!（自作の新作）', m: '昇太門下の新作派。エネルギッシュで振り切った高座' },
  { id: 'shota', name: '春風亭昇太', group: 'geijutsu', venue: 'teiseki', x: 83, y: 33, nyumon: true, kai: '時そば（主任）', m: '新作の旗手にして笑点司会' },
  { id: 'kochiraku', name: '柳亭小痴楽', group: 'geijutsu', venue: 'teiseki', x: 28, y: 38, nyumon: true, akane: '滑稽噺の数々', kai: '大工調べ', m: '歯切れよく威勢のいい江戸前。華のある若手真打で寄席でも人気、入門にも◎' },
  { id: 'shoyu', name: '三遊亭笑遊', group: 'geijutsu', venue: 'teiseki', x: 26, y: 22, nyumon: true, m: '豪快でパワフルな爆笑派のベテラン。大きな声と勢いで寄席を沸かせる滑稽噺' },
  // 円楽一門会
  { id: 'kenko', name: '三遊亭兼好', group: 'enraku', venue: 'teiseki', x: 28, y: 45, nyumon: false, m: '爆笑系で評価急上昇。末廣亭などにも顔を出す' },
  { id: 'mankitsu', name: '三遊亭萬橘', group: 'enraku', venue: 'teiseki', x: 62, y: 26, nyumon: false, m: '唯一無二の変な可笑しさ。芸協客員にも' },
  { id: 'ouraku', name: '三遊亭円楽（王楽）', group: 'enraku', venue: 'teiseki', x: 32, y: 50, nyumon: false, kai: 'うつけもの', m: '2025年襲名、26年から一門の新会長' },
  // 立川流
  { id: 'shinosuke', name: '立川志の輔', group: 'tatekawa', venue: 'dokuen', x: 66, y: 66, nyumon: true, m: '構成の鬼。古典も新作も唯一無二。入門に最強だがチケット激戦' },
  { id: 'danshun', name: '立川談春', group: 'tatekawa', venue: 'dokuen', x: 18, y: 82, nyumon: false, akane: '芝浜（現役の代名詞）', m: '「芝浜」は現役の代名詞。古典×本格の頂。チケット激戦' },
  { id: 'shiraku', name: '立川志らく', group: 'tatekawa', venue: 'dokuen', x: 36, y: 40, nyumon: false, m: '古典〜爆笑、メディアでも有名' },
  { id: 'dansho', name: '立川談笑', group: 'tatekawa', venue: 'dokuen', x: 72, y: 44, nyumon: false, m: '古典を大胆に改作。攻めの一手' },
  // 上方
  { id: 'beidanji', name: '桂米團治', group: 'kamigata', venue: 'kamigata', x: 16, y: 82, nyumon: false, m: '米朝の直系。正統派の品格' },
  { id: 'kichiya', name: '桂吉弥', group: 'kamigata', venue: 'kamigata', x: 22, y: 64, nyumon: false, akane: '稽古屋など上方の賑やか系', m: '米朝一門。端正で安心して聞ける' },
  { id: 'tengo', name: '桂天吾', group: 'kamigata', venue: 'kamigata', x: 22, y: 44, nyumon: false, kai: '手水廻し', m: '上方の注目若手。古典の滑稽噺を達者に' },
  { id: 'futaba', name: '桂二葉', group: 'kamigata', venue: 'kamigata', x: 26, y: 46, nyumon: true, akane: '上方の賑やか系', kai: '金明竹', m: '大人気の若手。達者な古典、入門にも◎' },
  { id: 'nanko', name: '桂南光', group: 'kamigata', venue: 'kamigata', x: 27, y: 40, nyumon: false, kai: 'つぼ算', m: '古典をメディア感覚で。爆笑味あり' },
  { id: 'hosei', name: '月亭方正', group: 'kamigata', venue: 'kamigata', x: 26, y: 36, nyumon: false, m: '山崎邦正から本格派へ転身' },
  { id: 'bunchin', name: '桂文珍', group: 'kamigata', venue: 'kamigata', x: 68, y: 42, nyumon: true, kai: 'ナム²アル²（創作落語・主任）', m: '上方の大看板。古典も達者でテレビでも有名、創作落語の名手' },
  { id: 'tsurube', name: '笑福亭鶴瓶', group: 'kamigata', venue: 'kamigata', x: 72, y: 30, nyumon: false, m: '私落語・新作。唯一無二の話芸' },
  { id: 'bunshi', name: '桂文枝（六代目）', group: 'kamigata', venue: 'kamigata', x: 90, y: 34, nyumon: false, m: '創作落語の大家' },
  // --- 拡充分（現役・存命。芸風と座標はAI推定） ---
  { id: 'ichiba', name: '柳亭市馬', group: 'rakugo', venue: 'teiseki', x: 18, y: 76, nyumon: false, m: '落語協会会長。歌うような江戸前と端正な正統派の語り。' },
  { id: 'bashi', name: '隅田川馬石', group: 'rakugo', venue: 'teiseki', x: 16, y: 80, nyumon: false, m: '五街道雲助門下。情の濃い人情噺に定評。' },
  { id: 'ryugyoku', name: '蜃気楼龍玉', group: 'rakugo', venue: 'teiseki', x: 14, y: 82, nyumon: false, m: '雲助門下。怪談噺・圓朝ものを継ぐ本格派。' },
  { id: 'basho', name: '金原亭馬生', group: 'rakugo', venue: 'teiseki', x: 20, y: 78, nyumon: false, m: '古典の正統。井戸の茶碗など端正な一席。' },
  { id: 'shinsuke_k', name: '古今亭志ん輔', group: 'rakugo', venue: 'teiseki', x: 24, y: 66, nyumon: false, m: 'テレビでも親しまれる明快な古典。' },
  { id: 'shinbashi', name: '古今亭志ん橋', group: 'rakugo', venue: 'teiseki', x: 22, y: 68, nyumon: false, m: '志ん朝門下。粋な江戸前の古典。' },
  { id: 'senkyo', name: '入船亭扇橋', group: 'rakugo', venue: 'teiseki', x: 20, y: 64, nyumon: false, m: '端正で柔らかな古典の継承者。' },
  { id: 'karoku', name: '柳家花緑', group: 'rakugo', venue: 'teiseki', x: 42, y: 48, nyumon: true, m: '五代目小さんの孫。古典も新作も親しみやすい。' },
  { id: 'ichizo', name: '春風亭一蔵', group: 'rakugo', venue: 'teiseki', x: 34, y: 36, nyumon: true, m: '一朝門下。明るく力強い滑稽噺で寄席人気。' },
  { id: 'ryushi', name: '春風亭柳枝', group: 'rakugo', venue: 'teiseki', x: 26, y: 58, nyumon: false, m: '端正でやわらかな古典。' },
  { id: 'karuta', name: '三遊亭歌る多', group: 'rakugo', venue: 'teiseki', x: 30, y: 60, nyumon: false, m: '女性真打。情のある語り口。' },
  { id: 'koenji', name: '柳家小袁治', group: 'rakugo', venue: 'teiseki', x: 28, y: 54, nyumon: false, m: '軽妙で味のある古典。' },
  { id: 'kentaro', name: '三遊亭兼太郎', group: 'enraku', venue: 'teiseki', x: 40, y: 44, nyumon: false, m: '円楽一門会の若手。明るい高座。' },
  { id: 'gakko', name: '笑福亭學光', group: 'kamigata', venue: 'kamigata', x: 30, y: 48, nyumon: false, m: '上方の人情・滑稽を達者に。' },
  { id: 'genta', name: '桂源太', group: 'kamigata', venue: 'kamigata', x: 32, y: 40, nyumon: false, m: '上方の注目若手。' },
];

/** 紹介文＋2軸座標から芸風タグを導出 */
function deriveStyleTags(e: MapEntry): StyleTag[] {
  const text = `${e.m} ${e.akane ?? ''} ${e.kai ?? ''}`;
  const tags = new Set<StyleTag>();
  const KW: [string[], StyleTag][] = [
    [['人情'], '人情噺'],
    [['怪談'], '怪談噺'],
    [['芝居', '圓朝'], '芝居噺'],
    [['廓', '艶', '粋', '色気'], '廓噺'],
    [['新作', '創作', '私落語'], '新作'],
    [['正統', '本格', '端正', '品格'], '正統派'],
    [['爆笑', '滑稽', '可笑', '沸か', '賑やか', '明るい'], '滑稽噺'],
    [['テンポ', '歯切れ', 'リズム', '威勢'], 'テンポ重視'],
    [['まくら'], 'まくら名人'],
    [['古典'], '古典'],
  ];
  for (const [keys, tag] of KW) if (keys.some((k) => text.includes(k))) tags.add(tag);
  if (e.x <= 32) tags.add('古典');
  if (e.x >= 68) tags.add('新作');
  if (e.y <= 33) {
    tags.add('滑稽噺');
    tags.add('テンポ重視');
  }
  if (e.y >= 72) tags.add('正統派');
  if (e.y >= 60 && e.x <= 40) tags.add('人情噺');
  if (tags.size === 0) tags.add('古典');
  return [...tags].slice(0, 4);
}

/** 2軸座標・入門フラグ・会場から初心者向き度を導出（爆笑寄り・定席ほど入りやすい） */
function deriveBeginnerScore(e: MapEntry): number {
  let s = e.nyumon ? 86 : 68;
  s += (50 - e.y) * 0.18;
  if (e.venue === 'teiseki') s += 5;
  if (e.venue === 'dokuen') s -= 6;
  return Math.round(Math.max(48, Math.min(95, s)));
}

function buildRakugoka(e: MapEntry): Rakugoka {
  return {
    id: e.id,
    name: e.name,
    aliases: [],
    association: GROUP_LABEL[e.group],
    group: e.group,
    venueType: e.venue,
    position: { x: e.x, y: e.y },
    beginnerPick: e.nyumon,
    styleTags: deriveStyleTags(e),
    beginnerScore: deriveBeginnerScore(e),
    description: e.m,
    tagline: e.m.split(/[。．]/)[0]!.slice(0, 24),
    akane: e.akane,
    kai: e.kai,
    sources: [
      { title: `${GROUP_LABEL[e.group]}（参考）`, url: 'https://www.google.com/search?q=' + encodeURIComponent(`${e.name} 落語`) },
    ],
    generatedByAi: true,
    updatedAt: `${SEED_TODAY}T00:00:00.000Z`,
  };
}

export const RAKUGOKA_SEED: Rakugoka[] = MAP_ENTRIES.map(buildRakugoka);

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  displayName: 'ゲスト',
  availability: {
    weekdays: ['sat', 'sun'],
    dates: ['2026-06-20', '2026-06-21', '2026-06-27', '2026-06-28'],
  },
  calendarConnected: false,
  reachableVenues: ['suehirotei', 'suzumoto'],
};

/** デモで最初から1名ウォッチしておく（フィードを初期表示させるため） */
export const SEED_WATCHES: Watch[] = [
  { id: 'watch-seed-1', userId: DEMO_USER_ID, rakugokaId: 'ichinosuke', createdAt: `${SEED_TODAY}T09:00:00.000Z` },
];

/** 初期フィードに1件だけ手書きの推薦を入れておく（コールドスタートでも体験が伝わるように） */
export const SEED_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-seed-1',
    userId: DEMO_USER_ID,
    programId: 'suzumoto_2026-06-20_night',
    rakugokaId: 'ichinosuke',
    reason:
      'おっ、見つけましたよ。ウォッチ中の春風亭一之輔師匠が、6/20(土)の鈴本演芸場・夜席でトリを務めます。あなたが「行ける」とおっしゃっていた土曜日です。トリは一番おいしい主役の枠。古典をテンポよく聴かせる師匠なので、初めての一席にもぴったりかと存じます。',
    matchedAvailability: '6/20(土)',
    status: 'unread',
    createdAt: `${SEED_TODAY}T06:00:00.000Z`,
  },
];

/** ダッシュボードに履歴を出すための過去の自律ジョブ実行記録 */
export const SEED_AGENT_RUNS: AgentRun[] = [
  {
    id: 'run-seed-3',
    startedAt: '2026-06-15T06:00:00.000Z',
    finishedAt: '2026-06-15T06:00:42.000Z',
    status: 'success',
    programsIngested: 124,
    profilesUpdated: 39,
    recommendationsCreated: 1,
    errors: [],
    steps: [
      { at: '2026-06-15T06:00:01.000Z', phase: 'fetch', message: '末廣亭・鈴本の番組表を取得', meta: { venues: 2 } },
      { at: '2026-06-15T06:00:18.000Z', phase: 'parse', message: '番組を構造化', meta: { programs: 124 } },
      { at: '2026-06-15T06:00:33.000Z', phase: 'match', message: 'ウォッチ×番組×空き日を照合', meta: { watches: 1 } },
      { at: '2026-06-15T06:00:41.000Z', phase: 'recommend', message: '推薦を1件生成', meta: { created: 1 } },
    ],
  },
  {
    id: 'run-seed-2',
    startedAt: '2026-06-14T06:00:00.000Z',
    finishedAt: '2026-06-14T06:00:39.000Z',
    status: 'success',
    programsIngested: 124,
    profilesUpdated: 0,
    recommendationsCreated: 0,
    errors: [],
    steps: [
      { at: '2026-06-14T06:00:01.000Z', phase: 'fetch', message: '末廣亭・鈴本の番組表を取得', meta: { venues: 2 } },
      { at: '2026-06-14T06:00:20.000Z', phase: 'parse', message: '番組を構造化', meta: { programs: 124 } },
    ],
  },
  {
    id: 'run-seed-1',
    startedAt: '2026-06-13T06:00:00.000Z',
    finishedAt: '2026-06-13T06:01:10.000Z',
    status: 'failed',
    programsIngested: 62,
    profilesUpdated: 0,
    recommendationsCreated: 0,
    errors: ['鈴本演芸場の取得がタイムアウト（再試行で翌日復旧）'],
    steps: [
      { at: '2026-06-13T06:00:01.000Z', phase: 'fetch', message: '末廣亭は取得成功 / 鈴本でタイムアウト', meta: { ok: 1, failed: 1 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// 番組の機械生成
// ---------------------------------------------------------------------------

const COLORS_IROMONO: string[] = [
  '漫才「ロケット団」',
  '太神楽曲芸「翁家社中」',
  '紙切り「林家正楽」',
  '曲独楽「三増紋之助」',
  '漫才「ナイツ」',
  '奇術「ダーク広和」',
];

// 定席に出演する噺家プール（venueType==='teiseki'）。鈴本は落語協会のみ、末廣亭は両協会＋円楽党。
const TEISEKI = MAP_ENTRIES.filter((e) => e.venue === 'teiseki');
const SUZUMOTO_POOL = TEISEKI.filter((e) => e.group === 'rakugo').map((e) => e.id);
const SUEHIROTEI_POOL = TEISEKI.filter((e) => e.group === 'rakugo' || e.group === 'geijutsu' || e.group === 'enraku').map((e) => e.id);

const NAME_BY_ID = new Map(MAP_ENTRIES.map((e) => [e.id, e.name]));

function kogyoBlock(dateStr: string): { month: number; blockOfMonth: number; seed: number } {
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  const blockOfMonth = day <= 10 ? 0 : day <= 20 ? 1 : 2;
  return { month, blockOfMonth, seed: (month - 1) * 3 + blockOfMonth };
}

// 日付は UTC のカレンダー日として扱う（util/date と同じ方針。TZ ずれ防止）
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 起点日から days 日分、末廣亭・鈴本それぞれ昼/夜の番組を生成する。
 * 寄席は10日替わり（上席/中席/下席）なのでブロック単位で香盤を固定する。
 * 特例: 鈴本の「6月中席・夜」は春風亭一之輔をトリにする（ウォッチ→推薦のデモ用）。
 */
export function buildSeedPrograms(startDate = SEED_TODAY, days = 31): Program[] {
  const programs: Program[] = [];
  const venues = ['suehirotei', 'suzumoto'] as const;
  const parts = ['day', 'night'] as const;
  const performerCount = 5;

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const block = kogyoBlock(date);
    for (const venue of venues) {
      const pool = venue === 'suzumoto' ? SUZUMOTO_POOL : SUEHIROTEI_POOL;
      const venueOffset = venue === 'suzumoto' ? 0 : 4;
      for (const part of parts) {
        const offset = (block.seed * 3 + (part === 'night' ? 2 : 0) + venueOffset) % pool.length;
        const performerIds: string[] = [];
        for (let k = 0; k < performerCount; k++) {
          performerIds.push(pool[(offset + k) % pool.length]!);
        }

        let toriId = performerIds[performerIds.length - 1]!;
        const isIchinosukeBlock =
          venue === 'suzumoto' && block.month === 6 && block.blockOfMonth === 1 && part === 'night';
        if (isIchinosukeBlock) {
          toriId = 'ichinosuke';
          if (!performerIds.includes('ichinosuke')) performerIds[performerIds.length - 1] = 'ichinosuke';
          performerIds.splice(performerIds.indexOf('ichinosuke'), 1);
          performerIds.push('ichinosuke');
        }

        const lineup = performerIds.map((rid, idx) => ({
          order: idx + 1,
          rakugokaId: rid,
          rawName: NAME_BY_ID.get(rid)!,
          isIromono: false,
        }));
        lineup.splice(2, 0, {
          order: 0,
          rakugokaId: undefined as unknown as string,
          rawName: COLORS_IROMONO[block.seed % COLORS_IROMONO.length]!,
          isIromono: true,
        });
        lineup.forEach((e, idx) => (e.order = idx + 1));

        programs.push({
          id: `${venue}_${date}_${part}`,
          venue,
          date,
          part,
          lineup,
          toriRakugokaId: toriId,
          sourceUrl: venue === 'suzumoto' ? 'https://www.rakugo.or.jp/' : 'https://www.suehirotei.com/',
          fetchedAt: `${SEED_TODAY}T06:00:00.000Z`,
        });
      }
    }
  }
  return programs;
}

export { weekdayOf };
