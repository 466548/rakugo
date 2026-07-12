/**
 * 実番組スクレイピング（A-01「解読」）。
 *
 * 末廣亭・鈴本の公式サイトから現在の興行ページ（テキスト）を取得し、Gemini(parse_program)で
 * 香盤・トリを構造化して LiveProgram として保存する。シードの program とは別管理（§方式A）。
 *
 * 礼儀（§12）: User-Agent 明示・タイムアウト・リクエスト間隔・取得は日次ジョブで1回。
 * 失敗時は何もしない（既存データ温存・フォールバック）。
 */
import type { LiveProgram, ProgramPart } from '../domain/types';
import type { DataStore } from '../data/store';
import { nowIso } from '../data/store';

// 色物（落語家・講談師以外）のジャンル
const IROMONO_GENRE =
  /(太神楽|曲芸|奇術|手品|漫才|漫談|紙切|曲独楽|浪曲|民謡|物まね|浮世節|粋曲|マジック|コント|三味線|活動写真|音曲|ウクレレ|ものまね|曲ごま)/;
const GENRE_PREFIX =
  /^(上方落語|落語|講談|太神楽曲芸|太神楽|曲芸|奇術|漫才|漫談|紙切り|紙切|曲独楽|浪曲|民謡|物まね|浮世節|粋曲|マジック|コント|三味線漫談|活動写真弁士|ワンマン笑|アコーディオン漫謡|手品|音曲|奇　術|落　語)/;

// 演者行ではない案内・注記の行
const JUNK_LINE =
  /(御案内|案内申し上げ|番組|販売|満席|割引|企画|お知らせ|入場|料金|開場|開演|終演|当日|演目|時頃|円|学生|小人|新宿区|台東区|の部|幕見|プリント|Twitter|公演|相勤め)/;

/** 1行から演者名だけを取り出す（空白を先に畳んでから注記・丸数字・ジャンル・記号を除去） */
function cleanPerformerName(line: string): string {
  return line
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[\s　]+/g, '')
    .replace(/[①-⓿]/g, '')
    .replace(/[（(][^（）()]*[)）]/g, '')
    .replace(/(交代出演|交互|〃|主任|お仲入り|仲入り|休演|代演|出演|調整中)/g, '')
    .replace(GENRE_PREFIX, '')
    .replace(/[┌└├｜|│~～:：・]/g, '')
    .trim();
}

/** 整形済みテキストから香盤（演者名・色物・トリ）を決定的に抽出する */
function extractLineup(cleaned: string): { lineup: LiveProgram['lineup']; toriRawName: string | null } {
  const lines = cleaned.split('\n').map((s) => s.trim()).filter(Boolean);
  const lineup: LiveProgram['lineup'] = [];
  let tori: string | null = null;
  let toriFlag = false;
  const seen = new Set<string>();

  for (const line of lines) {
    const despaced = line.replace(/[\s　]+/g, '');
    if (JUNK_LINE.test(line) || despaced.length > 20) continue; // 案内文・長い文は演者でない
    if (/主任/.test(line)) toriFlag = true;
    const name = cleanPerformerName(line);
    if (name.length < 2 || name.length > 12 || /[、。％%]/.test(name) || /^[0-9０-９]+$/.test(name) || seen.has(name))
      continue;
    seen.add(name);
    const isIromono = IROMONO_GENRE.test(line) && !/落語|講談/.test(line);
    lineup.push({ order: lineup.length + 1, rawName: name, isIromono });
    if (toriFlag) {
      tori = name;
      toriFlag = false;
    }
  }
  if (!tori) tori = [...lineup].reverse().find((l) => !l.isIromono)?.rawName ?? null;
  return { lineup, toriRawName: tori };
}

const UA = 'rakugo-zenza-bot/1.0 (+hackathon demo; respectful daily fetch)';
const SUEHIROTEI = 'https://www.suehirotei.com/';
const SUZUMOTO = 'https://rakugo.or.jp/';
const BLOCK_LABEL: Record<string, string> = { kami: '上席', naka: '中席', shimo: '下席' };

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // ブロック境界は改行に（行構造を保つ＝整形・解析しやすく）
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d|\/td)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** 公演ページのテキストから、対象の部の演者ブロックだけを抽出しノイズを除去する */
function cleanScheduleText(raw: string, venue: 'suehirotei' | 'suzumoto', part: ProgramPart): string {
  let t = raw;
  if (venue === 'suehirotei') {
    const day = t.search(/昼\s*の\s*部/);
    const night = t.search(/夜\s*の\s*部/);
    if (part === 'day' && day >= 0) t = t.slice(day, night > day ? night : undefined);
    else if (part === 'night' && night >= 0) t = t.slice(night);
  } else {
    const idx = t.search(/[昼夜]\s*の\s*部/);
    if (idx >= 0) t = t.slice(idx);
  }
  const lines = t
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !/^-+>?$/.test(l) &&
        !/^(ご案内|定席番組|余一会|新宿末廣亭|鈴本演芸場)$/.test(l) &&
        !/^\d{1,2}月(上|中|下)席$/.test(l) &&
        !/[\d０-９]{1,2}\s*[:：]\s*[\d０-９]{2}/.test(l) &&
        !/開場|開演|終演|入場料金|チケット|支払|未就学児|幕見|割引|画面提示|当日売り|入替制|お知らせ|特別企画|円|学生|小人|一般/.test(l) &&
        !/〒|新宿区|台東区|上野|03-|電話|TEL/.test(l),
    );
  return lines.join('\n').slice(0, 4000);
}

function kogyoLabel(name: string): string {
  const m = name.match(/(\d{1,2})(kami|naka|shimo)/);
  return m ? `${m[1]}月${BLOCK_LABEL[m[2]!]}` : name;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toLive(
  id: string,
  venue: LiveProgram['venue'],
  label: string,
  part: ProgramPart,
  lineup: LiveProgram['lineup'],
  toriRawName: string | null,
  sourceUrl: string,
): LiveProgram {
  return { id, venue, kogyoLabel: label, part, lineup, toriRawName, sourceUrl, fetchedAt: nowIso() };
}

/** 末廣亭：トップから興行ページ（{月}{kami|naka|shimo}.html）を発見し、各ページの昼夜を構造化 */
async function scrapeSuehirotei(maxPages = 3): Promise<LiveProgram[]> {
  const top = await fetchHtml(SUEHIROTEI);
  if (!top) return [];
  const names = [
    ...new Set([...top.matchAll(/(\d{1,2}(?:kami|naka|shimo))\.html/g)].map((m) => m[1]!)),
  ].slice(0, maxPages);

  const out: LiveProgram[] = [];
  for (const name of names) {
    const url = `${SUEHIROTEI}${name}.html`;
    const html = await fetchHtml(url);
    await delay(800);
    if (!html) continue;
    const text = stripHtml(html);
    for (const part of ['day', 'night'] as ProgramPart[]) {
      const cleaned = cleanScheduleText(text, 'suehirotei', part);
      const { lineup, toriRawName } = extractLineup(cleaned);
      if (lineup.length < 2) continue;
      out.push(toLive(`live_suehirotei_${name}_${part}`, 'suehirotei', kogyoLabel(name), part, lineup, toriRawName, url));
    }
  }
  return out;
}

/** 鈴本：トップから 2026-{月}{block}-{hiru|yoru}.html を発見し各ページを構造化 */
async function scrapeSuzumoto(maxPages = 4): Promise<LiveProgram[]> {
  const top = await fetchHtml(SUZUMOTO);
  if (!top) return [];
  const names = [
    ...new Set(
      [...top.matchAll(/(20\d\d-\d{1,2}(?:kami|naka|shimo)-(?:hiru|yoru))\.html/g)].map((m) => m[1]!),
    ),
  ].slice(0, maxPages);

  const out: LiveProgram[] = [];
  for (const name of names) {
    const url = `${SUZUMOTO}${name}.html`;
    const html = await fetchHtml(url);
    await delay(800);
    if (!html) continue;
    const text = stripHtml(html);
    const part: ProgramPart = name.includes('yoru') ? 'night' : 'day';
    const cleaned = cleanScheduleText(text, 'suzumoto', part);
    const { lineup, toriRawName } = extractLineup(cleaned);
    if (lineup.length < 2) continue;
    out.push(toLive(`live_suzumoto_${name}`, 'suzumoto', kogyoLabel(name), part, lineup, toriRawName, url));
  }
  return out;
}

/** 両定席の実番組を取得して構造化（失敗した定席は空配列） */
export async function scrapeLivePrograms(): Promise<LiveProgram[]> {
  const [sue, suzu] = await Promise.all([scrapeSuehirotei(), scrapeSuzumoto()]);
  return [...sue, ...suzu];
}

/** 取得して保存（取得0件なら既存を温存＝フォールバック）。日次ジョブから呼ぶ */
export async function refreshLivePrograms(store: DataStore): Promise<{ count: number }> {
  const items = await scrapeLivePrograms();
  if (items.length > 0) await store.replaceLivePrograms(items);
  return { count: items.length };
}
