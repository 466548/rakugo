/**
 * 演目（噺）データ。「メディア（漫画/アニメ/ドラマ）で観た演目で探す → 得意な師匠へ繋げる」導線の一次データ。
 *
 * rakugokaIds は「その噺を高座にかけることがある／得意とされる」師匠（カタログの id）。
 * 見取り図の akane/kai に現れる実ティと、広く知られた持ちネタを根拠にしているが、
 * いずれも公開情報からの推定（要件 §12）。実際の口演は各席の番組で要確認。
 */
import type { StyleTag } from '../domain/types';

/** この噺が登場するメディア作品 */
export type RakugoWork = 'akane' | 'showa' | 'chiri';

export const WORKS: Record<RakugoWork, { label: string; mark: string }> = {
  akane: { label: 'あかね噺', mark: '■' },
  showa: { label: '昭和元禄落語心中', mark: '◆' },
  chiri: { label: 'ちりとてちん', mark: '●' },
};

export interface Neta {
  id: string;
  title: string;
  kana?: string;
  summary: string;
  tags: StyleTag[];
  /** 登場するメディア作品（あかね噺・昭和元禄落語心中・ちりとてちん 等） */
  works?: RakugoWork[];
  /** この噺を得意とされる師匠（カタログ id） */
  rakugokaIds: string[];
}

export const NETA_SEED: Neta[] = [
  { id: 'jugemu', title: '寿限無', kana: 'じゅげむ', summary: '長すぎる名前を繰り返す前座噺の定番。落語入門の一席。', tags: ['滑稽噺'], works: ['akane', 'showa', 'chiri'], rakugokaIds: ['futaba', 'kochiraku', 'touka', 'yujaku'] },
  { id: 'imadonokitsune', title: '今戸の狐', kana: 'いまどのきつね', summary: '「狐」をめぐる勘違いが転がっていく江戸の滑稽噺。', tags: ['滑稽噺'], works: ['akane'], rakugokaIds: ['sanza', 'bungiku'] },
  { id: 'daikushirabe', title: '大工調べ', kana: 'だいくしらべ', summary: '啖呵の切れ味が聴きどころ。江戸っ子の意地が爆発する。', tags: ['滑稽噺'], works: ['akane', 'showa'], rakugokaIds: ['ichinosuke', 'gontaro', 'kochiraku', 'iccho'] },
  { id: 'shibahama', title: '芝浜', kana: 'しばはま', summary: '大金を拾った魚屋夫婦の人情噺。年末の名作。', tags: ['人情噺'], works: ['akane', 'showa'], rakugokaIds: ['danshun', 'sankyo', 'kumosuke'] },
  { id: 'nozarashi', title: '野ざらし', kana: 'のざらし', summary: '釣りに出かけた男の妄想が膨らむ陽気な滑稽噺。', tags: ['滑稽噺'], works: ['akane', 'showa'], rakugokaIds: ['iccho', 'kochiraku', 'shoyu'] },
  { id: 'manjukowai', title: 'まんじゅうこわい', kana: 'まんじゅうこわい', summary: '「怖いもの」をめぐる若い衆の与太話。寄席の爆笑定番。', tags: ['滑稽噺'], works: ['akane', 'chiri'], rakugokaIds: ['gontaro', 'miyaji', 'taihei'] },
  { id: 'keikoya', title: '稽古屋', kana: 'けいこや', summary: '習い事の稽古屋を舞台にした、上方仕込みの賑やかな一席。', tags: ['滑稽噺'], works: ['akane'], rakugokaIds: ['kichiya', 'nanko', 'futaba'] },
  { id: 'kohome', title: '子ほめ', kana: 'こほめ', summary: 'ただ酒目当てに人をほめて回る、前座噺の定番。', tags: ['滑稽噺'], works: ['akane', 'showa'], rakugokaIds: ['futaba', 'kochiraku'] },
  { id: 'sanbou', title: '三方一両損', kana: 'さんぼういちりょうぞん', summary: '拾った財布をめぐる江戸っ子の意地とお裁き。', tags: ['人情噺', '滑稽噺'], works: ['akane'], rakugokaIds: ['iccho', 'ichinosuke'] },
  { id: 'tenshiki', title: '転失気', kana: 'てんしき', summary: '知ったかぶりが空回りする、寺を舞台の軽妙な滑稽噺。', tags: ['滑稽噺'], works: ['akane'], rakugokaIds: ['kikuhiko', 'touka', 'yujaku'] },
  { id: 'aona', title: '青菜', kana: 'あおな', summary: '夏の昼下がり、植木屋が見栄を真似て失敗する涼やかな一席。', tags: ['滑稽噺'], rakugokaIds: ['ichinosuke', 'iccho'] },
  { id: 'tokisoba', title: '時そば', kana: 'ときそば', summary: '勘定をごまかす手口を真似て大失敗。所作が見どころ。', tags: ['滑稽噺', 'テンポ重視'], works: ['showa'], rakugokaIds: ['shota', 'taihei'] },
  { id: 'katabou', title: '片棒', kana: 'かたぼう', summary: 'ケチな大店の主が三人の息子を試す、リズムの良い滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['iccho', 'taihei'] },
  { id: 'doubutsuen', title: '動物園', kana: 'どうぶつえん', summary: '虎の着ぐるみのアルバイト。明るく分かりやすい一席。', tags: ['滑稽噺'], rakugokaIds: ['touka', 'futaba', 'yujaku'] },
  { id: 'yakan', title: 'やかん', kana: 'やかん', summary: '物知り先生のこじつけ問答が可笑しい、寄席の軽い一席。', tags: ['滑稽噺'], rakugokaIds: ['kikuhiko', 'iccho', 'shoyu'] },
  { id: 'tsubozan', title: 'つぼ算', kana: 'つぼざん', summary: '水瓶の値段を煙に巻く、上方の計算ずくの滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['nanko', 'tengo'] },
  { id: 'kinmeichiku', title: '金明竹', kana: 'きんめいちく', summary: '上方訛りの口上を聞き取れず大混乱。早口が聴きどころ。', tags: ['滑稽噺'], rakugokaIds: ['futaba', 'kochiraku'] },
  { id: 'chouzumawashi', title: '手水廻し', kana: 'ちょうずまわし', summary: '「手水」が通じず珍騒動になる上方の滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['tengo', 'nanko'] },
  { id: 'kowakare', title: '子別れ', kana: 'こわかれ', summary: '酒で家庭を失った男の改心と再会を描く人情噺の大ネタ。', tags: ['人情噺'], works: ['showa'], rakugokaIds: ['sankyo', 'kumosuke', 'danshun', 'bashi', 'senkyo'] },
  { id: 'idonochawan', title: '井戸の茶碗', kana: 'いどのちゃわん', summary: '正直者ばかりが譲り合う、後味のよい人情噺。', tags: ['人情噺'], rakugokaIds: ['shozo', 'kumosuke', 'kikunojo', 'basho', 'yujaku'] },
  { id: 'konyatakao', title: '紺屋高尾', kana: 'こんやたかお', summary: '紺屋の職人が花魁に一途に恋する、しっとりした人情噺。', tags: ['人情噺', '廓噺'], works: ['showa'], rakugokaIds: ['kikunojo', 'sanza'] },
  { id: 'akegarasu', title: '明烏', kana: 'あけがらす', summary: '堅物の若旦那を吉原へ連れ出す、艶のある廓噺。', tags: ['廓噺'], works: ['showa'], rakugokaIds: ['kumosuke', 'kikunojo', 'yujaku'] },
  { id: 'omitate', title: 'お見立て', kana: 'おみたて', summary: '気の進まない客を花魁が居留守でかわす、軽妙な廓噺。', tags: ['廓噺'], rakugokaIds: ['kikunojo', 'bungiku'] },
  { id: 'tonasuya', title: '唐茄子屋政談', kana: 'とうなすやせいだん', summary: '勘当された若旦那が唐茄子（かぼちゃ）売りで再起する人情噺。', tags: ['人情噺'], rakugokaIds: ['kumosuke', 'shozo'] },
  // --- 昭和元禄落語心中 ゆかりの大ネタ ---
  { id: 'shinigami', title: '死神', kana: 'しにがみ', summary: '死神と取引する男を描く、落語心中を象徴する一席。', tags: ['怪談噺', '古典'], works: ['showa'], rakugokaIds: ['kumosuke', 'sanza', 'kikunojo', 'yujaku'] },
  { id: 'inokori', title: '居残り佐平次', kana: 'いのこりさへいじ', summary: '勘定を踏み倒し居残る佐平次の人たらし。粋でしたたかな廓噺。', tags: ['廓噺', '滑稽噺'], works: ['showa'], rakugokaIds: ['kikunojo', 'kumosuke'] },
  { id: 'shinagawa', title: '品川心中', kana: 'しながわしんじゅう', summary: '心中に巻き込まれる男の顛末を描く、艶と可笑しみの廓噺。', tags: ['廓噺'], works: ['showa'], rakugokaIds: ['kikunojo', 'kumosuke', 'bungiku'] },
  { id: 'rakuda', title: 'らくだ', kana: 'らくだ', summary: '死んだ「らくだ」を担いで強談判。立場が逆転していく大ネタ。', tags: ['滑稽噺'], works: ['showa'], rakugokaIds: ['kumosuke', 'ichinosuke', 'yujaku'] },
  // --- ちりとてちん（上方）ゆかりの演目 ---
  { id: 'chiritotechin', title: 'ちりとてちん', kana: 'ちりとてちん', summary: '腐った豆腐を「珍味」と言って食わせる、上方の名物滑稽噺。', tags: ['滑稽噺'], works: ['chiri'], rakugokaIds: ['kichiya', 'nanko', 'futaba', 'yujaku'] },
  { id: 'atagoyama', title: '愛宕山', kana: 'あたごやま', summary: '京の愛宕山で繰り広げる、派手で華やかな上方の大ネタ。', tags: ['滑稽噺'], works: ['chiri'], rakugokaIds: ['beidanji', 'nanko', 'bunchin'] },
  { id: 'sutokuin', title: '崇徳院', kana: 'すとくいん', summary: '恋煩いの若旦那のため町中を探し回る、人情味ある一席。', tags: ['人情噺', '滑稽噺'], works: ['chiri'], rakugokaIds: ['kichiya', 'futaba', 'nanko'] },
  { id: 'tachigire', title: 'たちぎれ線香', kana: 'たちぎれせんこう', summary: '芸者を恋う若旦那、線香が燃え尽きるまでの切ない人情噺。', tags: ['人情噺'], works: ['showa', 'chiri'], rakugokaIds: ['beidanji', 'kichiya'] },
  { id: 'hatena', title: 'はてなの茶碗', kana: 'はてなのちゃわん', summary: '茶碗から漏る水の謎をめぐる、上方の大らかな滑稽噺。', tags: ['滑稽噺'], works: ['chiri'], rakugokaIds: ['bunchin', 'nanko'] },
  // --- 三遊亭笑遊 の十八番（江戸の滑稽噺。芸風・演目はAI推定） ---
  { id: 'bushoudoko', title: '無精床', kana: 'ぶしょうどこ', summary: '無精者ばかりの髪結床で起きる、のんきで可笑しい滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'gamanoabura', title: 'がまの油', kana: 'がまのあぶら', summary: '蝦蟇の油売りの口上が、酔うほどにぐだぐだになる名物の滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'uonedoi', title: '魚根問', kana: 'うおねどい', summary: '魚の名の由来を隠居に問う問答が転がる、根問ものの滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'unaginotaiko', title: '鰻の幇間', kana: 'うなぎのたいこ', summary: 'たかろうとした幇間が、逆に鰻屋で勘定を押し付けられる滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu', 'yujaku'] },
  { id: 'horinouchi', title: '堀の内', kana: 'ほりのうち', summary: 'そそっかしい男の粗忽ぶりが次々炸裂する、寄席の爆笑噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'fudoubou', title: '不動坊', kana: 'ふどうぼう', summary: '後家をめぐる恋敵を、幽霊仕掛けで脅かそうとする滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'yuyaban', title: '湯屋番', kana: 'ゆやばん', summary: '銭湯の番台に座った若旦那の妄想が暴走する、陽気な滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'chihayafuru', title: '千早ふる', kana: 'ちはやふる', summary: '百人一首の歌を、知ったかぶりの隠居がでたらめに解説する滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'hyakumensou', title: '百面相', kana: 'ひゃくめんそう', summary: '表情や声色を次々に変えてみせる、寄席らしい珍芸仕立ての一席。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  { id: 'sangennagaya', title: '三軒長屋', kana: 'さんげんながや', summary: '長屋の三軒の住人が起こす騒動を描く、威勢のいい江戸の滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['shoyu'] },
  // --- 三遊亭遊雀 の持ちネタ（芸風・演目はAI推定） ---
  { id: 'hatsutenjin', title: '初天神', kana: 'はつてんじん', summary: '天神様の縁日で父にねだり倒す、憎めない子どもの滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'hantaiguruma', title: '反対俥', kana: 'はんたいぐるま', summary: 'のろい車夫と暴走する車夫、対照的な人力車の珍道中。', tags: ['滑稽噺', 'テンポ重視'], rakugokaIds: ['yujaku'] },
  { id: 'funatoku', title: '船徳', kana: 'ふなとく', summary: '若旦那の見習い船頭が客を乗せて右往左往する夏の滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'kanninbukuro', title: '堪忍袋', kana: 'かんにんぶくろ', summary: '夫婦喧嘩の憂さを袋にぶちまける、評判の憂さ晴らし滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'kawarime', title: '替り目', kana: 'かわりめ', summary: '酔って帰った亭主と女房の、可笑しくも情のある夫婦の一席。', tags: ['滑稽噺', '人情噺'], rakugokaIds: ['yujaku'] },
  { id: 'sanmaigisho', title: '三枚起請', kana: 'さんまいぎしょう', summary: '同じ起請文を三人の男に渡した花魁をめぐる痛快な廓噺。', tags: ['廓噺', '滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'yodogoro', title: '淀五郎', kana: 'よどごろう', summary: '大役に抜擢された役者が芸に悩む、芝居の世界の人情噺。', tags: ['人情噺', '芝居噺'], rakugokaIds: ['yujaku'] },
  { id: 'himonobako', title: '干物箱', kana: 'ひものばこ', summary: '若旦那の身代わりに声色で成りすます、そそっかしい滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'kumanokawa', title: '熊の皮', kana: 'くまのかわ', summary: '恐妻家の亭主が教わった口上を取り違える、ほのぼの滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'kawazuchaban', title: '蛙茶番', kana: 'かわずちゃばん', summary: '素人芝居の楽屋を舞台に、見栄と勘違いが弾ける滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'sanadakozou', title: '真田小僧', kana: 'さなだこぞう', summary: 'こまっしゃくれた子どもが親から小遣いを巻き上げる滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'hitomeagari', title: '一目あがり', kana: 'ひとめあがり', summary: '掛け軸の褒め方を教わった男が見当違いを連発する滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
  { id: 'kawayakaji', title: '厠火事', kana: 'かわやかじ', summary: '厠（便所）から火が出る騒動をめぐる賑やかな滑稽噺。', tags: ['滑稽噺'], rakugokaIds: ['yujaku'] },
];

function featuredRank(n: Neta): number {
  return (n.works?.length ?? 0) > 0 ? 1 : 0;
}

export function listNeta(): Neta[] {
  return [...NETA_SEED].sort(
    (a, b) => featuredRank(b) - featuredRank(a) || a.title.localeCompare(b.title, 'ja'),
  );
}

export function getNeta(id: string): Neta | undefined {
  return NETA_SEED.find((n) => n.id === id);
}

/** ある師匠の得意ネタ（演目側からの逆引き） */
export function netasForRakugoka(rakugokaId: string): Neta[] {
  return NETA_SEED.filter((n) => n.rakugokaIds.includes(rakugokaId));
}

/** ある作品に登場する演目 */
export function netasForWork(work: RakugoWork): Neta[] {
  return NETA_SEED.filter((n) => n.works?.includes(work));
}
