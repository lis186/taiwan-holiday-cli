import { parseDate, getDaysInMonth, daysBetween, getYearsInRange } from '../lib/date-parser.js';
import { ServiceError, ValidationError, YearNotPublishedError } from '../lib/errors.js';
import { HolidayRepository, RepositoryError } from './holiday-repository.js';
import type { Holiday, HolidayStats, WorkdaysStats } from '../types/holiday.js';
import { MIN_SUPPORTED_YEAR, HOLIDAY_TYPES } from '../types/holiday.js';

/**
 * 假期服務錯誤（向後相容別名）
 * @deprecated 請使用 ServiceError
 */
export const HolidayServiceError = ServiceError;

/**
 * 這個錯誤是否代表「上游尚未發布該年度」（可安全跳過），
 * 而不是網路故障之類不該被吞掉的問題。
 */
function isYearNotPublished(error: unknown): boolean {
  return error instanceof YearNotPublishedError;
}

/**
 * 範圍查詢選項
 */
export interface RangeOptions {
  /** 只返回假期 (isHoliday: true) */
  holidaysOnly?: boolean;
}

/**
 * 假期服務
 * 提供假期查詢、統計等業務邏輯
 */
export class HolidayService {
  private readonly repository: HolidayRepository;

  constructor(repository?: HolidayRepository) {
    this.repository = repository ?? new HolidayRepository();
  }

  /**
   * 設定是否繞過快取
   */
  setBypassCache(bypass: boolean): void {
    this.repository.setBypassCache(bypass);
  }

  /**
   * 取得指定年份的假期資料
   */
  async getHolidaysForYear(year: number): Promise<Holiday[]> {
    try {
      return await this.repository.getHolidaysForYear(year);
    } catch (error) {
      // 「尚未發布」要保留原型別往上傳，呼叫端需要靠它區分
      // 「這一年還沒發布」與「網路壞了」。包成 ServiceError 會抹掉這個資訊。
      if (error instanceof YearNotPublishedError) {
        throw error;
      }
      if (error instanceof RepositoryError) {
        throw new ServiceError(error.message);
      }
      throw error;
    }
  }

  /**
   * 檢查指定日期是否為假期
   */
  async checkHoliday(dateStr: string): Promise<Holiday | null> {
    const parsed = parseDate(dateStr);
    const holidays = await this.getHolidaysForYear(parsed.year);

    return holidays.find((h) => h.date === parsed.normalized) ?? null;
  }

  /**
   * 取得指定日期範圍內的假期
   */
  async getHolidaysInRange(
    startDateStr: string,
    endDateStr: string,
    options?: RangeOptions
  ): Promise<Holiday[]> {
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);

    // 驗證日期範圍
    const startNum = parseInt(start.normalized, 10);
    const endNum = parseInt(end.normalized, 10);

    if (startNum > endNum) {
      throw new ValidationError(`開始日期 ${startDateStr} 不能晚於結束日期 ${endDateStr}`);
    }

    const result: Holiday[] = [];

    // 處理跨年度的情況，並發請求
    const years: number[] = [];
    for (let year = start.year; year <= end.year; year++) {
      years.push(year);
    }

    const holidaysPerYear = await Promise.all(years.map((year) => this.getHolidaysForYear(year)));

    for (const holidays of holidaysPerYear) {
      for (const holiday of holidays) {
        const dateNum = parseInt(holiday.date, 10);
        if (dateNum >= startNum && dateNum <= endNum) {
          if (options?.holidaysOnly) {
            if (holiday.isHoliday) {
              result.push(holiday);
            }
          } else {
            result.push(holiday);
          }
        }
      }
    }

    // 按日期排序
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 取得假期統計
   */
  async getHolidayStats(year: number, month?: number): Promise<HolidayStats> {
    // 驗證月份
    if (month !== undefined && (month < 1 || month > 12)) {
      throw new ValidationError(`無效的月份: ${month}，月份必須在 1-12 之間`);
    }

    const holidays = await this.getHolidaysForYear(year);

    // 過濾指定月份
    let filtered = holidays;
    if (month !== undefined) {
      const monthStr = month.toString().padStart(2, '0');
      filtered = holidays.filter((h) => h.date.substring(4, 6) === monthStr);
    }

    return this.calculateStats(year, filtered, month);
  }

  /**
   * 計算工作天統計（指定月份）
   */
  async getWorkdaysStats(year: number, month: number): Promise<WorkdaysStats> {
    const holidays = await this.getHolidaysForYear(year);
    const monthStr = month.toString().padStart(2, '0');

    // 該月份的所有日期
    const daysInMonthCount = getDaysInMonth(year, month);

    let holidayCount = 0;
    let makeupWorkdays = 0;

    for (const holiday of holidays) {
      if (holiday.date.substring(4, 6) === monthStr) {
        if (holiday.isHoliday) {
          holidayCount++;
        }
        if (holiday.description.includes('補行上班')) {
          makeupWorkdays++;
        }
      }
    }

    const workdays = daysInMonthCount - holidayCount;

    return {
      totalDays: daysInMonthCount,
      workdays,
      holidays: holidayCount,
      makeupWorkdays,
    };
  }

  /**
   * 計算兩日期間的工作天統計
   */
  async getWorkdaysBetween(startDateStr: string, endDateStr: string): Promise<WorkdaysStats> {
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);

    const startNum = parseInt(start.normalized, 10);
    const endNum = parseInt(end.normalized, 10);

    if (startNum > endNum) {
      throw new ValidationError(`開始日期 ${startDateStr} 不能晚於結束日期 ${endDateStr}`);
    }

    // 計算總天數
    const totalDays = daysBetween(start, end);

    // 取得範圍內的假期
    const holidaysInRange = await this.getHolidaysInRange(startDateStr, endDateStr);

    let holidayCount = 0;
    let makeupWorkdays = 0;

    for (const holiday of holidaysInRange) {
      if (holiday.isHoliday) {
        holidayCount++;
      }
      if (holiday.description.includes('補行上班')) {
        makeupWorkdays++;
      }
    }

    return {
      totalDays,
      workdays: totalDays - holidayCount,
      holidays: holidayCount,
      makeupWorkdays,
    };
  }

  /**
   * 取得與日期範圍相關的補班日（可能在範圍外）
   */
  async getRelatedMakeupDays(startDateStr: string, endDateStr: string): Promise<Holiday[]> {
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);

    const result: Holiday[] = [];

    // 擴展搜尋範圍（前後一個月）
    const years = getYearsInRange(start, end, 1);

    for (const year of years) {
      if (year < MIN_SUPPORTED_YEAR) {
        continue;
      }
      // 前後擴展一個月可能跨進上游還沒有資料的年份，那種情況跳過即可。
      // 但只跳過「尚未發布」—— DNS 失敗、5xx、解析錯誤若也被吞掉，
      // 補班日就會靜默漏報，而使用者拿到的是一個看似完整的答案。
      let holidays: Holiday[];
      try {
        holidays = await this.getHolidaysForYear(year);
      } catch (error) {
        if (isYearNotPublished(error)) {
          continue;
        }
        throw error;
      }
      for (const holiday of holidays) {
        if (holiday.description.includes('補行上班')) {
          result.push(holiday);
        }
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 取得上游實際可查的年份列表
   */
  async getAvailableYears(): Promise<number[]> {
    return this.repository.getAvailableYears();
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.repository.clearCache();
  }

  /**
   * 取得快取狀態
   */
  getCacheStatus() {
    return this.repository.getCacheStatus();
  }

  /**
   * 檢查 API 健康狀態
   */
  async checkApiHealth(): Promise<{ reachable: boolean; latency?: number; error?: string }> {
    return this.repository.checkApiHealth();
  }

  /**
   * 計算統計資料
   */
  private calculateStats(year: number, holidays: Holiday[], month?: number): HolidayStats {
    const holidayTypes: Record<string, number> = {};
    let totalHolidays = 0;
    let nationalHolidays = 0;
    let weekends = 0;
    let compensatoryDays = 0;
    let adjustedHolidays = 0;
    let workingDays = 0;

    for (const holiday of holidays) {
      if (holiday.isHoliday) {
        totalHolidays++;

        const description = holiday.description.toLowerCase();
        let categoryKey: string;

        if (description.includes('補假')) {
          compensatoryDays++;
          categoryKey = HOLIDAY_TYPES.COMPENSATORY;
        } else if (description.includes('調整放假')) {
          adjustedHolidays++;
          categoryKey = HOLIDAY_TYPES.ADJUSTED;
        } else if (!holiday.description || holiday.description === HOLIDAY_TYPES.WEEKEND) {
          // 上游把一般週末的 description 留空。這些日子過去被算進
          // nationalHolidays，導致 2026 年回報 114 個「國定假日」
          // （實際具名國定假日只有 16 個，其餘 98 個是週末）。
          //
          // 也接受字面「週末」：本次新增的 WEEKEND 桶名讓它成為新的碰撞候選，
          // 若上游哪天改用該字串，不在這裡處理就會既算成國定假日、又汙染週末桶。
          weekends++;
          categoryKey = HOLIDAY_TYPES.WEEKEND;
        } else {
          nationalHolidays++;
          categoryKey = HOLIDAY_TYPES.NATIONAL;
        }
        holidayTypes[categoryKey] = (holidayTypes[categoryKey] || 0) + 1;

        // 記錄具體假日類型；描述與分類桶同名時（例如「補假」）不重複計
        if (holiday.description && holiday.description !== categoryKey) {
          holidayTypes[holiday.description] = (holidayTypes[holiday.description] || 0) + 1;
        }
      } else if (holiday.description.includes('補行上班')) {
        workingDays++;
        holidayTypes[HOLIDAY_TYPES.WORKING] = (holidayTypes[HOLIDAY_TYPES.WORKING] || 0) + 1;
      }
    }

    return {
      year,
      month,
      totalHolidays,
      nationalHolidays,
      weekends,
      compensatoryDays,
      adjustedHolidays,
      workingDays,
      holidayTypes,
    };
  }
}

// 全域服務實例
let globalService: HolidayService | null = null;

/**
 * 取得全域假期服務實例
 */
export function getHolidayService(): HolidayService {
  if (!globalService) {
    globalService = new HolidayService();
  }
  return globalService;
}
