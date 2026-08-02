/**
 * 假日資料介面 - 與 TaiwanCalendar 格式一致
 */
export interface Holiday {
  /** 日期，格式為 YYYYMMDD */
  date: string;
  /** 星期幾，中文表示（一、二、三、四、五、六、日） */
  week: string;
  /** 是否為假日 */
  isHoliday: boolean;
  /** 假日說明，如果不是假日則為空字串 */
  description: string;
}

/**
 * 假日統計資料介面
 */
export interface HolidayStats {
  /** 年份 */
  year: number;
  /** 月份（可選） */
  month?: number;
  /** 總放假天數（含週末） */
  totalHolidays: number;
  /** 具名國定假日天數（不含週末） */
  nationalHolidays: number;
  /** 一般週末天數（上游 description 為空的放假日） */
  weekends: number;
  /** 補假天數 */
  compensatoryDays: number;
  /** 調整放假天數 */
  adjustedHolidays: number;
  /** 補班天數 */
  workingDays: number;
  /** 假日類型分布 */
  holidayTypes: Record<string, number>;
}

/**
 * 解析後的日期
 */
export interface ParsedDate {
  year: number;
  month: number;
  day: number;
  /** 正規化的日期字串 YYYYMMDD */
  normalized: string;
  /** ISO 格式 YYYY-MM-DD */
  iso: string;
}

/**
 * 工作天統計
 */
export interface WorkdaysStats {
  /** 總天數 */
  totalDays: number;
  /** 工作天數 */
  workdays: number;
  /** 假期天數 */
  holidays: number;
  /** 補班天數 */
  makeupWorkdays: number;
}

/**
 * 快取項目
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 設定項目
 */
export interface Config {
  format: 'simple' | 'json' | 'table';
}

/**
 * 上游資料最早提供的年份（ruyut/TaiwanCalendar 從 2017 開始）
 */
export const MIN_SUPPORTED_YEAR = 2017;

/**
 * 合理性上限：避免荒謬的年份輸入白跑一趟網路請求。
 *
 * 這不是能力上限 —— 某年份能不能查，取決於上游有沒有那筆資料，
 * 由實際抓取的結果決定，不由本套件的版本決定。
 */
export function getMaxQueryableYear(): number {
  return new Date().getFullYear() + 5;
}

/**
 * 取得年份參數說明文字
 */
export function getYearArgumentDescription(): string {
  return `年份 (${MIN_SUPPORTED_YEAR} 起，實際可查年份取決於上游資料)`;
}

/**
 * 假日類型常數
 */
export const HOLIDAY_TYPES = {
  NATIONAL: '國定假日',
  WEEKEND: '週末',
  COMPENSATORY: '補假',
  ADJUSTED: '調整放假',
  WORKING: '補行上班',
  LUNAR_NEW_YEAR: '春節',
  TOMB_SWEEPING: '清明節',
  DRAGON_BOAT: '端午節',
  MID_AUTUMN: '中秋節',
  NATIONAL_DAY: '國慶日',
} as const;

/**
 * 星期對應表
 */
export const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

/**
 * 星期反向對應表
 */
export const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
