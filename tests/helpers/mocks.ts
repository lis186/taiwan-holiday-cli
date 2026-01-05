import { vi } from 'vitest';

/**
 * 建立 console.log spy
 * @returns mockConsoleLog spy
 */
export function createConsoleLogSpy() {
  return vi.spyOn(console, 'log').mockImplementation(() => {});
}

/**
 * 建立 console.error spy
 * @returns mockConsoleError spy
 */
export function createConsoleErrorSpy() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

/**
 * 建立 HolidayService mock 工廠
 * @returns mock holiday service object
 */
export function createMockHolidayService() {
  return {
    checkHoliday: vi.fn(),
    getHolidaysForYear: vi.fn(),
    getHolidaysInRange: vi.fn(),
    getHolidayStats: vi.fn(),
    getWorkdaysStats: vi.fn(),
    getWorkdaysBetween: vi.fn(),
    getRelatedMakeupDays: vi.fn(),
    getSupportedYears: vi.fn(),
    getCacheStatus: vi.fn(),
    clearCache: vi.fn(),
    checkApiHealth: vi.fn(),
    setBypassCache: vi.fn(),
  };
}

/**
 * 建立常用 mock 假期資料
 */
export const mockHolidayData = {
  nationalDay: {
    date: '20251010',
    week: '五',
    isHoliday: true,
    description: '國慶日',
  },
  newYear: {
    date: '20250101',
    week: '三',
    isHoliday: true,
    description: '開國紀念日',
  },
  lunarNewYear: {
    date: '20250128',
    week: '二',
    isHoliday: true,
    description: '春節',
  },
  makeupWorkday: {
    date: '20250927',
    week: '六',
    isHoliday: false,
    description: '補行上班日',
  },
  weekend: {
    date: '20250104',
    week: '六',
    isHoliday: true,
    description: '',
  },
  workday: {
    date: '20250106',
    week: '一',
    isHoliday: false,
    description: '',
  },
};

/**
 * 建立常用 mock 統計資料
 */
export const mockStatsData = {
  yearStats: {
    year: 2025,
    totalHolidays: 115,
    nationalHolidays: 113,
    compensatoryDays: 2,
    adjustedHolidays: 0,
    workingDays: 2,
    holidayTypes: { '國慶日': 3 },
  },
  monthStats: {
    year: 2025,
    month: 10,
    totalHolidays: 9,
    nationalHolidays: 8,
    compensatoryDays: 1,
    adjustedHolidays: 0,
    workingDays: 0,
    holidayTypes: { '國慶日': 3 },
  },
  workdaysStats: {
    totalDays: 31,
    workdays: 22,
    holidays: 9,
    makeupWorkdays: 0,
  },
};

/**
 * 建立常用 mock 快取狀態
 */
export const mockCacheStatus = {
  itemCount: 2,
  items: ['holidays_2024', 'holidays_2025'],
  hitRate: 0.85,
};
