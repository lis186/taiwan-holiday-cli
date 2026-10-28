import { addDays, daysBetween, getCurrentDate, parseDate } from '../lib/date-parser.js';
import { ValidationError } from '../lib/errors.js';
import { TyphoonRepository } from './typhoon-repository.js';
import type { ParsedDate } from '../types/holiday.js';
import type {
  TyphoonArea,
  TyphoonBasis,
  TyphoonCityResult,
  TyphoonEvent,
  TyphoonQueryResult,
  TyphoonReason,
  TyphoonVerdict,
} from '../types/typhoon.js';
import {
  TYPHOON_ARCHIVE_SETTLE_DAYS,
  TYPHOON_MIN_DATE,
  TYPHOON_MIN_YEAR,
} from '../types/typhoon.js';

/**
 * 縣市名正規化：與上游一致（台→臺、巿→市）。
 * 不對應改制前後的行政區，查詢仍是字面比對。
 */
export function normalizeCity(city: string): string {
  return city.trim().replace(/台/g, '臺').replace(/巿/g, '市');
}

const KNOWN_WORK = new Set(['stop', 'normal']);
const KNOWN_SCHOOL = new Set(['stop', 'normal', 'partial']);
const KNOWN_PERIOD = new Set(['allDay', 'morning', 'afternoon', 'evening', 'from']);

type Field = 'work' | 'school';

/**
 * 依上游契約，未知的列舉值當成未解析（null），不猜測。
 */
function sanitize(area: TyphoonArea): TyphoonArea {
  return {
    ...area,
    work: KNOWN_WORK.has(area.work as string) ? area.work : null,
    school: KNOWN_SCHOOL.has(area.school as string) ? area.school : null,
    period: KNOWN_PERIOD.has(area.period as string) ? area.period : null,
  };
}

const UNKNOWN: TyphoonVerdict = { status: 'unknown', period: null, from: '' };
const NORMAL: TyphoonVerdict = { status: 'normal', period: null, from: '' };
const CONDITIONAL: TyphoonVerdict = { status: 'conditional', period: null, from: '' };

/**
 * 單一縣市的上班或上課結論。
 *
 * 只有「整縣市列全部停止、時段一致」才是 stopped；任何未解析的列都讓結論變成 unknown，
 * 因為那一列可能正是停班停課。其餘有停有不停的情況（子區域、部分學制、上午照常下午停）
 * 都是 conditional，呼叫端要看 rows 判斷是否適用。
 */
function verdictFor(rows: TyphoonArea[], field: Field): TyphoonVerdict {
  if (rows.some((r) => r[field] === null)) return UNKNOWN;

  const cityRows = rows.filter((r) => r.scope === '');
  const subRows = rows.filter((r) => r.scope !== '');
  const anyStopOrPartial = (rs: TyphoonArea[]): boolean => rs.some((r) => r[field] !== 'normal');

  if (cityRows.length > 0 && cityRows.every((r) => r[field] === 'stop')) {
    const first = cityRows[0];
    const samePeriod = cityRows.every((r) => r.period === first.period && r.from === first.from);
    if (samePeriod && first.period !== null) {
      return { status: 'stopped', period: first.period, from: first.from };
    }
    return CONDITIONAL;
  }
  if (anyStopOrPartial(cityRows) || anyStopOrPartial(subRows)) return CONDITIONAL;
  return NORMAL;
}

function cityResult(city: string, rows: TyphoonArea[]): TyphoonCityResult {
  const sub = rows.filter((r) => r.scope !== '');
  const hasCity = rows.some((r) => r.scope === '');
  return {
    city,
    work: verdictFor(rows, 'work'),
    school: verdictFor(rows, 'school'),
    coverage: hasCity && sub.length > 0 ? 'mixed' : hasCity ? 'city' : 'subAreas',
    subAreas: {
      stopped: sub.filter((r) => r.work === 'stop' || r.school === 'stop' || r.school === 'partial')
        .length,
      total: sub.length,
    },
    rows,
  };
}

/**
 * 全國彙整：公告只列有狀況的縣市，無法得知「全臺」都停，
 * 所以只要有任何停止就是 conditional（依所在縣市而定）；全部照常才是 normal。
 */
function aggregate(verdicts: TyphoonVerdict[]): TyphoonVerdict {
  if (verdicts.some((v) => v.status === 'unknown')) return UNKNOWN;
  return verdicts.every((v) => v.status === 'normal') ? NORMAL : CONDITIONAL;
}

export interface EvaluateOptions {
  /** 縣市篩選（會正規化） */
  city?: string;
  /** 今天（臺灣時間），用來判斷是否仍在歸檔延遲窗口內 */
  today: ParsedDate;
  /** 查詢日或前一日所在年度的檔案尚未產生 */
  sourceNotReady?: boolean;
}

/**
 * 從歸檔事件算出某日的停班停課結論。純函式：不碰網路、不讀時鐘。
 *
 * 選公告的規則（上游 README）：每則公告同時含「今天」與「明天」，
 * 查詢日 D 有自己的公告時以它為準；沒有才採用前一天公告對「明天」的預告。
 * 必須先選公告、再篩 forDate == D 的列 —— 若先篩列，D 的公告沒有 D 的列時會被略過，
 * 讓已經被推翻的預告復活。
 */
export function evaluateTyphoon(
  events: TyphoonEvent[],
  target: ParsedDate,
  options: EvaluateOptions
): TyphoonQueryResult {
  const d = target.normalized;
  const own = events.filter((e) => e.date === d);
  const forecasts = events
    .filter((e) => e.date < d && e.areas.some((a) => a.forDate === d))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  let chosen: TyphoonEvent[] = [];
  let basis: TyphoonBasis = 'no_announcement';
  if (own.length > 0) {
    chosen = own;
    basis = 'own';
  } else if (forecasts.length > 0) {
    chosen = forecasts.filter((e) => e.date === forecasts[0].date);
    basis = 'forecast';
  }

  const allRows = chosen.flatMap((e) => e.areas.filter((a) => a.forDate === d)).map(sanitize);
  // 當日有自己的公告、卻沒有當日的列：上游略過了「尚未列入警戒區」「尚未宣布消息」之類的句子，
  // 依契約 areas 為空不代表照常，所以保留 basis 'own' 並在下面回 unknown。
  const ownWithoutRows = basis === 'own' && allRows.length === 0;
  if (allRows.length === 0 && !ownWithoutRows) basis = 'no_announcement';

  const city = options.city ? normalizeCity(options.city) : null;
  const rows = city ? allRows.filter((r) => r.city === city) : allRows;

  const byCity = new Map<string, TyphoonArea[]>();
  for (const r of rows) {
    byCity.set(r.city, [...(byCity.get(r.city) ?? []), r]);
  }
  const cities = [...byCity].map(([name, rs]) => cityResult(name, rs));

  // daysBetween 含頭尾，減 1 才是相差天數；未來日期為負數
  const daysAgo = daysBetween(target, options.today) - 1;
  const settled = daysAgo > TYPHOON_ARCHIVE_SETTLE_DAYS;

  let reason: TyphoonReason = null;
  if (options.sourceNotReady && rows.length === 0) reason = 'source_not_ready';
  else if (!settled && (rows.length === 0 || basis === 'forecast')) reason = 'pending';

  const notes: string[] = [];
  let work: TyphoonVerdict;
  let school: TyphoonVerdict;

  if (rows.length === 0) {
    // 沒有記錄：只有過了延遲窗口、且當日沒有公告，才能說「沒有公告 = 照常」
    work = reason || ownWithoutRows ? UNKNOWN : NORMAL;
    school = work;
    if (ownWithoutRows) {
      notes.push(
        '當日有公告，但沒有適用於當日的停班停課記錄（可能是「尚未列入警戒區」或「尚未宣布消息」），無法判斷，請看來源原文。'
      );
    }
    if (reason === 'source_not_ready') {
      notes.push('當年度資料檔尚未產生（每年 1 月 1 日首次更新前），無法判斷。');
    } else if (reason === 'pending') {
      notes.push(
        `歸檔資料通常在事件後 1～5 天（最久 19 天）才收錄，距今 ${TYPHOON_ARCHIVE_SETTLE_DAYS} 天內的「無紀錄」不代表照常。`
      );
    }
    if (city && allRows.length > 0) {
      notes.push(`該日有停班停課公告，但沒有「${city}」的記錄（縣市名為字面比對，改制前後名稱不同）。`);
    }
  } else {
    work = city ? cities[0].work : aggregate(cities.map((c) => c.work));
    school = city ? cities[0].school : aggregate(cities.map((c) => c.school));
    if (basis === 'forecast') {
      notes.push('依據是前一天公告的「明天」預告，可能已被當日公告推翻。');
    }
  }

  if (target.normalized >= options.today.normalized) {
    notes.push(
      '歸檔資料無法反映今天以後的即時狀況，請以 https://www.dgpa.gov.tw/typh/daily/nds.html 及各縣市政府公告為準。'
    );
  }
  if (chosen.some((e) => !e.parsed) || rows.some((r) => r.work === null || r.school === null)) {
    notes.push('部分記錄無法結構化解析，請讀 rows[].raw 原文。');
  }

  const source = chosen[0];
  return {
    date: d,
    city,
    work,
    school,
    basis,
    reason,
    source: {
      kind: 'archive',
      url: basis !== 'no_announcement' ? (source?.sourceUrl ?? null) : null,
      announcementDate: basis !== 'no_announcement' ? (source?.date ?? null) : null,
      updatedAt: basis !== 'no_announcement' ? (source?.updatedAt ?? '') : '',
    },
    cities,
    notes,
  };
}

/**
 * 颱風假服務：負責抓資料，結論交給 evaluateTyphoon。
 */
export class TyphoonService {
  private readonly repository: TyphoonRepository;

  constructor(repository?: TyphoonRepository) {
    this.repository = repository ?? new TyphoonRepository();
  }

  setBypassCache(bypass: boolean): void {
    this.repository.setBypassCache(bypass);
  }

  /**
   * 查詢某天的停班停課狀況。省略日期即為今天（臺灣時間）。
   */
  async getTyphoonStatus(dateStr = 'today', city?: string): Promise<TyphoonQueryResult> {
    const target = parseDate(dateStr, TYPHOON_MIN_YEAR);
    if (target.normalized < TYPHOON_MIN_DATE) {
      throw new ValidationError(
        `日期 ${target.iso} 早於颱風假資料起點 (${TYPHOON_MIN_DATE.slice(0, 4)}-07-30)`
      );
    }

    // 讀查詢日與前一天所在年度（跨年時 12/31 的公告會預告 1/1）
    const years = [...new Set([addDays(target, -1).year, target.year])].filter(
      (y) => y >= TYPHOON_MIN_YEAR
    );
    const events: TyphoonEvent[] = [];
    let sourceNotReady = false;
    for (const year of years) {
      const data = await this.repository.getEventsForYear(year);
      if (data === null) sourceNotReady = true;
      else events.push(...data);
    }

    return evaluateTyphoon(events, target, { city, today: getCurrentDate(), sourceNotReady });
  }
}

let globalService: TyphoonService | null = null;

/**
 * 取得全域颱風假服務實例
 */
export function getTyphoonService(): TyphoonService {
  if (!globalService) {
    globalService = new TyphoonService();
  }
  return globalService;
}
