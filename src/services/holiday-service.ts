import { parseDate } from '../lib/date-parser.js';
import { HolidayRepository, RepositoryError } from './holiday-repository.js';
import type { Holiday, HolidayStats, WorkdaysStats } from '../types/holiday.js';
import { SUPPORTED_YEAR_RANGE, HOLIDAY_TYPES } from '../types/holiday.js';

/**
 * 假期服務錯誤
 */
export class HolidayServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HolidayServiceError';
  }
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
      if (error instanceof RepositoryError) {
        throw new HolidayServiceError(error.message);
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
      throw new HolidayServiceError(`開始日期 ${startDateStr} 不能晚於結束日期 ${endDateStr}`);
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
      throw new HolidayServiceError(`無效的月份: ${month}，月份必須在 1-12 之間`);
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
    const daysInMonth = new Date(year, month, 0).getDate();

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

    const workdays = daysInMonth - holidayCount;

    return {
      totalDays: daysInMonth,
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
      throw new HolidayServiceError(`開始日期 ${startDateStr} 不能晚於結束日期 ${endDateStr}`);
    }

    // 計算總天數
    const startDate = new Date(start.year, start.month - 1, start.day);
    const endDate = new Date(end.year, end.month - 1, end.day);
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

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
    const searchStart = new Date(start.year, start.month - 2, 1);
    const searchEnd = new Date(end.year, end.month, 0);

    const years = new Set<number>();
    for (let d = new Date(searchStart); d <= searchEnd; d.setMonth(d.getMonth() + 1)) {
      years.add(d.getFullYear());
    }

    for (const year of years) {
      if (year >= SUPPORTED_YEAR_RANGE.start && year <= SUPPORTED_YEAR_RANGE.end) {
        const holidays = await this.getHolidaysForYear(year);
        for (const holiday of holidays) {
          if (holiday.description.includes('補行上班')) {
            result.push(holiday);
          }
        }
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 取得支援的年份列表
   */
  getSupportedYears(): number[] {
    const years: number[] = [];
    for (let year = SUPPORTED_YEAR_RANGE.start; year <= SUPPORTED_YEAR_RANGE.end; year++) {
      years.push(year);
    }
    return years;
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
    let compensatoryDays = 0;
    let adjustedHolidays = 0;
    let workingDays = 0;

    for (const holiday of holidays) {
      if (holiday.isHoliday) {
        totalHolidays++;

        const description = holiday.description.toLowerCase();

        if (description.includes('補假')) {
          compensatoryDays++;
          holidayTypes[HOLIDAY_TYPES.COMPENSATORY] =
            (holidayTypes[HOLIDAY_TYPES.COMPENSATORY] || 0) + 1;
        } else if (description.includes('調整放假')) {
          adjustedHolidays++;
          holidayTypes[HOLIDAY_TYPES.ADJUSTED] = (holidayTypes[HOLIDAY_TYPES.ADJUSTED] || 0) + 1;
        } else {
          nationalHolidays++;
          holidayTypes[HOLIDAY_TYPES.NATIONAL] = (holidayTypes[HOLIDAY_TYPES.NATIONAL] || 0) + 1;
        }

        // 記錄具體假日類型
        if (holiday.description) {
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
