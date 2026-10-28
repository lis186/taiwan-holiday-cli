/**
 * DGPA 停班停課頁面解析器（即時頁 nds.html 與 2017 年起的歷史附件同結構）。
 *
 * 逐條移植自上游 lis186/TaiwanTyphoonDays 的 scripts/parse.py（parse_page 以下）。
 * 文法是「嚴格」的：狀態句必須完整符合已知句型才解析，否則保留原文、欄位為 null，不猜測。
 * 修改這裡時要與上游同步；一致性由上游的格級 fixtures 與 data/ 全量句子測試把關。
 */

import type { TyphoonArea, TyphoonPeriod, TyphoonSchool, TyphoonWork } from '../types/typhoon.js';

const CITY_RE = /^[一-鿿]{2,3}[縣市巿]$/;
const NOISE = /^[（(]?(?:尚未列入警戒區|尚未宣布消息)/;
const PERIODS: Record<string, TyphoonPeriod> = {
  上午: 'morning',
  下午: 'afternoon',
  晚上: 'evening',
};
export const NOTICE_NONE = '無停班停課訊息。';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function unescapeHtml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function clean(x: string): string {
  return unescapeHtml(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function normCity(c: string): string {
  return c.replace(/巿/g, '市').replace(/台/g, '臺');
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** 民國或西元年 → YYYYMMDD */
function rocToAd(y: number, m: number, d: number): string {
  return `${y < 1911 ? y + 1911 : y}${pad(m)}${pad(d)}`;
}

function addDay(yyyymmdd: string, days: number): string {
  const dt = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

/** 「更新時間：115/10/28 14:52:14」→ 2026-10-28T14:52:14（臺灣時間）；沒有則空字串 */
export function parseUpdated(s: string): string {
  const m = s.match(/更新時間：\s*(\d+)\/(\d+)\/(\d+)(?:\s+(\d+:\d+:\d+))?/);
  if (!m) return '';
  const d = rocToAd(+m[1], +m[2], +m[3]);
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return m[4] ? `${iso}T${m[4]}` : iso;
}

// 嚴格狀態文法
const WORK = '(?:上班|辦公)';
const VERB: Record<string, 'stop' | 'normal'> = { 停止: 'stop', 照常: 'normal', 已達: 'stop', 未達: 'normal' };
const LEVEL = '(?:高中|國中|國小|高職)[^、停]{0,10}以下';
type Status = [TyphoonWork, TyphoonSchool];
const STATUS_FORMS: Array<[RegExp, (m: RegExpMatchArray) => Status]> = [
  [new RegExp(`^(?:(已達|未達)停止${WORK}(?:及|、停止)上課標準)$`), (m): Status => [VERB[m[1]], VERB[m[1]]]],
  [new RegExp(`^(?:(已達|未達)停止${WORK}、(已達|未達)停止上課標準)$`), (m): Status => [VERB[m[1]], VERB[m[2]]]],
  [new RegExp(`^(?:(停止|照常)${WORK}(?:、(停止|照常))?上課)$`), (m): Status => [VERB[m[1]], VERB[m[2] ?? m[1]]]],
  [new RegExp(`^(?:照常${WORK}、${LEVEL}(?:學校)?停止上課)$`), (): Status => ['normal', 'partial']],
];
const PERIOD_LIST = /^(?:上午|中午|下午|晚上)(?:(?:及|、)(?:上午|中午|下午|晚上))*/;

function strip(s: string, chars: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

function parseStatus(rest: string): Status {
  // 去掉句尾備註，例如「(上午未達)」
  const r = strip(rest, '。 ，；').replace(/[（(][^）)]*[）)]$/, '');
  for (const [pat, build] of STATUS_FORMS) {
    const m = r.match(pat);
    if (m) return build(m);
  }
  return [null, null];
}

type TimeResult = { period: 'from' | 'until'; from: string; end: number };

function parseTime(prefix: string): TimeResult | null {
  const m = prefix.match(/^(上午|中午|下午|晚上)?(\d{1,2})(?::(\d{2})|時(?:(\d{1,2})分)?)(起|前)/);
  if (!m) return null;
  const ap = m[1];
  let h = parseInt(m[2], 10);
  const mi = parseInt(m[3] ?? m[4] ?? '0', 10);
  if (m[5] === '前') return { period: 'until', from: '', end: m[0].length };
  if ((ap === '下午' || ap === '晚上') && h < 12) h += 12;
  return { period: 'from', from: `${pad(h)}:${pad(mi)}`, end: m[0].length };
}

type SentencePart = Omit<TyphoonArea, 'city' | 'raw'>;

/** 一句 → 一或多筆結果；無法解析時回傳 null */
export function parseSentence(sentence: string, date: string): SentencePart[] | null {
  const sent = sentence.replace(/\s+/g, '');
  let scope: string;
  let forDate: string;
  let rest: string;
  const m = sent.match(/今天|今日|明天/);
  if (m && m.index !== undefined) {
    scope = sent.slice(0, m.index).replace(/[:：、]+$/, '');
    forDate = m[0] === '明天' ? addDay(date, 1) : date;
    rest = sent.slice(m.index + m[0].length);
  } else if (/^(上午|中午|下午|晚上)/.test(sent)) {
    scope = '';
    forDate = date;
    rest = sent;
  } else {
    return null;
  }

  // 複合句：「上午已達…，下午未達…」在時段詞前的逗號切開
  const parts = rest.split(/，(?=(?:上午|中午|下午|晚上))/);
  const out: SentencePart[] = [];
  for (const raw of parts) {
    const part = raw.replace(/(起|前)，/g, '$1').replace(/，/g, '、');
    const t = parseTime(part);
    if (t) {
      if (t.period === 'until') return null;
      const [work, school] = parseStatus(part.slice(t.end));
      out.push({ scope, forDate, work, school, period: 'from', from: t.from });
      continue;
    }
    const pm = part.match(PERIOD_LIST);
    if (pm) {
      const [work, school] = parseStatus(part.slice(pm[0].length));
      for (const p of pm[0].match(/上午|中午|下午|晚上/g) ?? []) {
        if (p === '中午') return null;
        out.push({ scope, forDate, work, school, period: PERIODS[p], from: '' });
      }
      continue;
    }
    const [work, school] = parseStatus(part);
    out.push({ scope, forDate, work, school, period: 'allDay', from: '' });
  }
  if (out.some((o) => o.work === null || o.school === null)) return null;
  return out;
}

/** 一格（某縣市的狀況欄）→ 記錄；「尚未列入警戒區」等不含停班資訊的句子略過 */
export function parseCell(city: string, text: string, date: string): TyphoonArea[] {
  const areas: TyphoonArea[] = [];
  for (const s of text.split(/(?<=[。；])/)) {
    const sent = s.trim();
    if (!sent || NOISE.test(sent)) continue;
    const res = parseSentence(s, date);
    if (res === null) {
      areas.push({ city, scope: '', forDate: date, work: null, school: null, period: null, from: '', raw: sent });
      continue;
    }
    for (const r of res) areas.push({ city, ...r, raw: sent });
  }
  return areas;
}

export interface ParsedPage {
  /** 頁首日期 YYYYMMDD，「今天」的基準 */
  pageDate: string;
  /** 頁面更新時間（臺灣時間），沒有則空字串 */
  updatedAt: string;
  /** 頁面明確寫「無停班停課訊息」：確定沒有 */
  noticeNone: boolean;
  areas: TyphoonArea[];
  /** 找到的縣市列數。0 且 noticeNone 為 false 代表格式不認得，不可當成沒有 */
  rows: number;
  /**
   * 有列出的縣市（已正規化），包含整格都是「尚未宣布消息」等被略過的縣市。
   * 用來區分「有列出但無法判斷」與「根本沒列出」。上游沒有這個欄位，是 CLI 自用。
   */
  cities: string[];
}

/**
 * 解析整頁。date 預設取頁首日期（如「115年10月28日 天然災害…」）。
 */
export function parsePage(s: string, date?: string): ParsedPage {
  let pageDate = date;
  if (pageDate === undefined) {
    const m = clean(s).match(/(\d+)年\s*(\d+)月\s*(\d+)日\s*(?:[（(]星期.[)）])?\s*天然災害/);
    if (!m) throw new Error('找不到頁首日期');
    pageDate = rocToAd(+m[1], +m[2], +m[3]);
  }
  const page: ParsedPage = {
    pageDate,
    updatedAt: parseUpdated(s),
    noticeNone: false,
    areas: [],
    rows: 0,
    cities: [],
  };
  for (const tr of s.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1]));
    if (cells.length === 1 && cells[0] === NOTICE_NONE) page.noticeNone = true;
    if (![2, 3].includes(cells.length)) continue;
    const city = cells[cells.length - 2];
    if (!CITY_RE.test(city) || city.includes('名稱')) continue;
    page.rows++;
    if (!page.cities.includes(normCity(city))) page.cities.push(normCity(city));
    page.areas.push(...parseCell(normCity(city), cells[cells.length - 1], pageDate));
  }
  return page;
}
