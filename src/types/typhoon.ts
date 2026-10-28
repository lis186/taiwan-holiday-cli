/**
 * 颱風假（天然災害停止上班上課）資料型別。
 * 與 lis186/TaiwanTyphoonDays 的 data/{year}.json 格式一致。
 */

export type TyphoonWork = 'stop' | 'normal' | null;
export type TyphoonSchool = 'stop' | 'normal' | 'partial' | null;
export type TyphoonPeriod = 'allDay' | 'morning' | 'afternoon' | 'evening' | 'from' | null;

/** 單一縣市／子區域的停班停課狀況 */
export interface TyphoonArea {
  /** 縣市名（保留當時名稱，不對應現行行政區） */
  city: string;
  /** 子區域；空字串表示整個縣市 */
  scope: string;
  /** 這筆記錄實際適用的日期 YYYYMMDD */
  forDate: string;
  work: TyphoonWork;
  school: TyphoonSchool;
  period: TyphoonPeriod;
  /** period 為 'from' 時的 HH:MM，否則為空字串 */
  from: string;
  /** 該句原文，一律保留 */
  raw: string;
}

/** 一則公告（事件日） */
export interface TyphoonEvent {
  /** 事件日 YYYYMMDD（取自公告標題，不是公告日） */
  date: string;
  publishedAt: string;
  updatedAt: string;
  sourceUrl: string;
  /** false 表示只有 raw 可信 */
  parsed: boolean;
  areas: TyphoonArea[];
}

/**
 * 某縣市（或整體）上班、上課的結論。
 *
 * - stopped：全縣市停止，且所有整縣市列的時段一致（時段見 period/from）
 * - conditional：只有部分子區域、部分學制、或部分時段停止；要看 rows 才知道是否適用
 * - normal：有公告且照常；或已過歸檔延遲窗口仍無任何公告（basis 為 no_announcement）
 * - unknown：無法判斷（原文未解析、尚待歸檔、資料源未就緒），一律不可當成照常
 */
export type TyphoonVerdictStatus = 'stopped' | 'conditional' | 'normal' | 'unknown';

export interface TyphoonVerdict {
  status: TyphoonVerdictStatus;
  /** status 為 stopped 時的時段，其餘為 null */
  period: TyphoonPeriod;
  /** period 為 'from' 時的 HH:MM，否則為空字串 */
  from: string;
}

/** 單一縣市的結論與佐證 */
export interface TyphoonCityResult {
  city: string;
  work: TyphoonVerdict;
  school: TyphoonVerdict;
  /** city：只有整縣市列；subAreas：只有子區域列；mixed：兩者都有 */
  coverage: 'city' | 'subAreas' | 'mixed';
  /** 子區域列中，上班或上課任一停止的列數／子區域列總數 */
  subAreas: { stopped: number; total: number };
  rows: TyphoonArea[];
}

/**
 * 結論的依據
 * - own：查詢日自己的公告
 * - forecast：前一天公告的「明天」預告（可能被當日公告推翻）
 * - no_announcement：查詢日沒有任何公告
 */
export type TyphoonBasis = 'own' | 'forecast' | 'no_announcement';

/**
 * 結論可能還會變的原因；null 表示已定案
 * - pending：查詢日距今在歸檔延遲窗口內（或在未來），歸檔可能還沒收錄
 * - source_not_ready：當年度資料檔尚不存在（每年 1 月 1 日首次更新前）
 * - live：取自即時頁，當天仍可能更新（例如上午宣布下午停班，之後改成全天）
 */
export type TyphoonReason = 'pending' | 'source_not_ready' | 'live' | null;

/** 颱風假查詢結果 */
export interface TyphoonQueryResult {
  /** 查詢日 YYYYMMDD */
  date: string;
  /** 套用的縣市篩選（已正規化），未指定則為 null */
  city: string | null;
  /** 指定縣市時為該縣市的結論；未指定時為全國彙整（任一縣市不同即為 conditional） */
  work: TyphoonVerdict;
  school: TyphoonVerdict;
  basis: TyphoonBasis;
  reason: TyphoonReason;
  source: {
    /** archive：歸檔資料；live：DGPA 即時頁 */
    kind: 'archive' | 'live';
    /** 採用的公告原始頁；沒有公告時為 null */
    url: string | null;
    /** 公告的事件日 YYYYMMDD（basis 為 forecast 時早於查詢日） */
    announcementDate: string | null;
    /** 頁面或附件標示的更新時間（臺灣時間）；舊資料可能為空字串 */
    updatedAt: string;
    /** 即時頁的抓取時間（ISO 8601）；歸檔為 null */
    fetchedAt: string | null;
  };
  cities: TyphoonCityResult[];
  /** 給人與 LLM 的提醒 */
  notes: string[];
}

/**
 * 歸檔延遲窗口（天）。近年公告日−事件日的最大值為 19 天，
 * 超過這個天數仍無公告，才視為該日沒有停班停課公告。
 */
export const TYPHOON_ARCHIVE_SETTLE_DAYS = 21;

/** 資料起點：DGPA 公告最早的事件日 */
export const TYPHOON_MIN_DATE = '20010730';
export const TYPHOON_MIN_YEAR = 2001;
