import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HolidayService, HolidayServiceError } from '../../src/services/holiday-service.js';
import { ValidationError } from '../../src/lib/errors.js';
import type { Holiday } from '../../src/types/holiday.js';
import { MIN_SUPPORTED_YEAR, getMaxQueryableYear, HOLIDAY_TYPES } from '../../src/types/holiday.js';
import { getCurrentYear } from '../../src/lib/date-parser.js';

// Mock ofetch
vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

import { ofetch } from 'ofetch';

const mockHolidays2025: Holiday[] = [
  { date: '20250101', week: '三', isHoliday: true, description: '開國紀念日' },
  { date: '20250102', week: '四', isHoliday: false, description: '' },
  { date: '20250104', week: '六', isHoliday: true, description: '' },
  { date: '20250105', week: '日', isHoliday: true, description: '' },
  { date: '20250110', week: '五', isHoliday: false, description: '補行上班日' },
  { date: '20251010', week: '五', isHoliday: true, description: '國慶日' },
];

describe('HolidayService', () => {
  let service: HolidayService;

  beforeEach(() => {
    // clearAllMocks 只清呼叫紀錄，不清 mockResolvedValueOnce/mockRejectedValueOnce
    // 的佇列 —— 未被消耗的 once 會洩漏到下一個測試，造成看不出原因的連鎖失敗。
    vi.mocked(ofetch).mockReset();
    vi.clearAllMocks();
    service = new HolidayService();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getHolidaysForYear', () => {
    it('should fetch holidays for a valid year', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const holidays = await service.getHolidaysForYear(2025);

      expect(holidays).toEqual(mockHolidays2025);
      expect(ofetch).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/2025.json',
        expect.any(Object)
      );
    });

    it('should throw error for year out of range', async () => {
      await expect(service.getHolidaysForYear(getMaxQueryableYear() + 1)).rejects.toThrow(
        ValidationError
      );
      await expect(service.getHolidaysForYear(MIN_SUPPORTED_YEAR - 1)).rejects.toThrow(
        ValidationError
      );
    });

    it('should use cache on second call', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      await service.getHolidaysForYear(2025);
      await service.getHolidaysForYear(2025);

      expect(ofetch).toHaveBeenCalledTimes(1);
    });

    it('should throw HolidayServiceError on network error', async () => {
      vi.mocked(ofetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getHolidaysForYear(2025)).rejects.toThrow(HolidayServiceError);
    });
  });

  describe('checkHoliday', () => {
    it('should return holiday info for a holiday date', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const result = await service.checkHoliday('2025-01-01');

      expect(result).not.toBeNull();
      expect(result?.isHoliday).toBe(true);
      expect(result?.description).toBe('開國紀念日');
    });

    it('should return holiday info for a non-holiday date', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const result = await service.checkHoliday('2025-01-02');

      expect(result).not.toBeNull();
      expect(result?.isHoliday).toBe(false);
    });

    it('should return null for date not in data', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce([]);

      const result = await service.checkHoliday('2025-06-15');

      expect(result).toBeNull();
    });
  });

  describe('getHolidaysInRange', () => {
    it('should return holidays within range', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const holidays = await service.getHolidaysInRange('2025-01-01', '2025-01-05');

      expect(holidays.length).toBe(4);
      expect(holidays[0].date).toBe('20250101');
    });

    it('should filter only holidays (isHoliday: true)', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const holidays = await service.getHolidaysInRange('2025-01-01', '2025-01-05', {
        holidaysOnly: true,
      });

      expect(holidays.every((h) => h.isHoliday)).toBe(true);
    });

    it('should throw error if start date is after end date', async () => {
      await expect(service.getHolidaysInRange('2025-01-10', '2025-01-01')).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle cross-year range', async () => {
      vi.mocked(ofetch)
        .mockResolvedValueOnce([{ date: '20241231', week: '二', isHoliday: true, description: '' }])
        .mockResolvedValueOnce(mockHolidays2025);

      const holidays = await service.getHolidaysInRange('2024-12-31', '2025-01-02');

      expect(holidays.length).toBeGreaterThan(0);
      expect(ofetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getHolidayStats', () => {
    it('should return stats for a year', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const stats = await service.getHolidayStats(2025);

      expect(stats.year).toBe(2025);
      expect(stats.totalHolidays).toBeGreaterThan(0);
      expect(stats.workingDays).toBeGreaterThanOrEqual(0);
    });

    it('should return stats for a specific month', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const stats = await service.getHolidayStats(2025, 1);

      expect(stats.year).toBe(2025);
      expect(stats.month).toBe(1);
    });

    it('should throw error for invalid month', async () => {
      await expect(service.getHolidayStats(2025, 13)).rejects.toThrow(ValidationError);
      await expect(service.getHolidayStats(2025, 0)).rejects.toThrow(ValidationError);
    });

    // holidayTypes 同時裝「分類桶」與「具體假日名」兩種語意。上游的 description
    // 有時剛好等於分類桶名稱（補假、調整放假），曾經被兩邊各加一次而翻倍。
    //
    // 這份 fixture 刻意涵蓋三種情況：description 等於桶名、包含但不等於桶名、
    // 以及空 description（週末）。
    const collisionFixture: Holiday[] = [
      { date: '20250127', week: '一', isHoliday: true, description: '補假' },
      { date: '20250128', week: '二', isHoliday: true, description: '補假' },
      { date: '20250203', week: '一', isHoliday: true, description: '調整放假' },
      { date: '20250204', week: '二', isHoliday: true, description: '調整放假' },
      { date: '20250205', week: '三', isHoliday: true, description: '調整放假' },
      { date: '20250206', week: '四', isHoliday: true, description: '國定假日' },
      { date: '20250207', week: '五', isHoliday: true, description: '春節調整放假' },
      { date: '20250208', week: '六', isHoliday: true, description: '' },
      { date: '20250215', week: '六', isHoliday: false, description: '補行上班' },
    ];

    it('should not double-count any description that collides with a category name', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(collisionFixture);

      const stats = await service.getHolidayStats(2025);

      expect(stats.holidayTypes['補假']).toBe(2); // 舊碼: 4
      expect(stats.holidayTypes['調整放假']).toBe(4); // 舊碼: 7
      expect(stats.holidayTypes['國定假日']).toBe(1); // 舊碼: 3（含被誤算的週末）
      expect(stats.holidayTypes['週末']).toBe(1); // 舊碼: 無此分類

      // 包含但不等於桶名 → 仍應同時進兩個 key（證明沒有過度修正）
      expect(stats.holidayTypes['春節調整放假']).toBe(1);
      // 非假日分支本來就不加具體名稱，不受影響
      expect(stats.holidayTypes['補行上班']).toBe(1);
    });

    // 週末的 description 是空字串，過去落入 else 分支被算成國定假日：
    // 2026 年因此回報 114 個「國定假日」，實際具名的只有 16 個。
    it('should not count plain weekends as named national holidays', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(collisionFixture);

      const stats = await service.getHolidayStats(2025);

      expect(stats.nationalHolidays).toBe(1); // 舊碼: 2（週末被算進來）
      expect(stats.weekends).toBe(1); // 舊碼: 無此欄位
    });

    // WEEKEND 桶名是本次新增的，若上游改用字面「週末」當 description，
    // 它會成為新的碰撞候選 —— 既被算成國定假日、又汙染週末桶。
    it('should treat a literal 週末 description as a weekend, not a national holiday', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce([
        { date: '20250208', week: '六', isHoliday: true, description: '週末' },
        { date: '20250209', week: '日', isHoliday: true, description: '' },
      ] as Holiday[]);

      const stats = await service.getHolidayStats(2025);

      expect(stats.weekends).toBe(2);
      expect(stats.nationalHolidays).toBe(0);
      expect(stats.holidayTypes['週末']).toBe(2);
      expect(stats.holidayTypes['國定假日']).toBeUndefined();
    });

    // 這條才是真正的護欄：不枚舉 key，而是斷言結構不變式。
    // 先前只針對「補假」寫測試，於是漏掉了「調整放假」這個第二個碰撞
    // （2019 年的補假筆數是 0，只錨定補假的測試在該年資料上舊碼也會通過）。
    it('should keep every category bucket in sync with its top-level counter', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(collisionFixture);

      const stats = await service.getHolidayStats(2025);

      expect(stats.holidayTypes[HOLIDAY_TYPES.COMPENSATORY] ?? 0).toBe(stats.compensatoryDays);
      expect(stats.holidayTypes[HOLIDAY_TYPES.ADJUSTED] ?? 0).toBe(stats.adjustedHolidays);
      expect(stats.holidayTypes[HOLIDAY_TYPES.NATIONAL] ?? 0).toBe(stats.nationalHolidays);
      expect(stats.holidayTypes[HOLIDAY_TYPES.WEEKEND] ?? 0).toBe(stats.weekends);
      expect(stats.holidayTypes[HOLIDAY_TYPES.WORKING] ?? 0).toBe(stats.workingDays);

      // 四個放假分類必須剛好切分所有放假日，沒有重複也沒有遺漏
      expect(
        stats.compensatoryDays + stats.adjustedHolidays + stats.nationalHolidays + stats.weekends
      ).toBe(stats.totalHolidays);
    });
  });

  describe('getWorkdaysStats', () => {
    it('should calculate workdays for a month', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const stats = await service.getWorkdaysStats(2025, 1);

      expect(stats.totalDays).toBe(31);
      expect(stats.workdays).toBeGreaterThan(0);
      expect(stats.holidays).toBeGreaterThan(0);
      expect(stats.workdays + stats.holidays).toBe(31);
    });
  });

  describe('getWorkdaysBetween', () => {
    it('should calculate workdays between two dates', async () => {
      vi.mocked(ofetch).mockResolvedValueOnce(mockHolidays2025);

      const stats = await service.getWorkdaysBetween('2025-01-01', '2025-01-05');

      expect(stats.totalDays).toBe(5);
      expect(stats.workdays + stats.holidays).toBe(5);
    });
  });

  describe('getRelatedMakeupDays', () => {
    it('should find makeup work days related to a date range', async () => {
      // getRelatedMakeupDays expands search by ±1 month, so it may query multiple years
      vi.mocked(ofetch)
        .mockResolvedValueOnce([]) // 2024 (expanded range includes Dec 2024)
        .mockResolvedValueOnce(mockHolidays2025); // 2025

      const makeupDays = await service.getRelatedMakeupDays('2025-01-01', '2025-01-31');

      expect(Array.isArray(makeupDays)).toBe(true);
    });
  });

  describe('getRelatedMakeupDays 的錯誤分流', () => {
    const notFound = (): Error =>
      Object.assign(new Error('Not Found'), { response: { status: 404 } });

    // 前後擴展一個月會跨進尚未發布的「未來」年份，那種情況應跳過。
    // 用當前年份的 12 月，讓擴展落到今年+1（真正可能未發布的年度）。
    it('should skip future years the upstream has not published', async () => {
      const cy = getCurrentYear();
      vi.mocked(ofetch)
        .mockResolvedValueOnce(mockHolidays2025) // 今年
        .mockRejectedValueOnce(notFound()); // 今年+1 尚未發布

      await expect(
        service.getRelatedMakeupDays(`${cy}-12-01`, `${cy}-12-31`)
      ).resolves.toBeInstanceOf(Array);
    });

    // 「未來年度 404」= 尚未發布，可跳過。
    // 「歷史／當年 404」= 上游把已發布的資料弄掉了，那是真的異常，
    // 靜默跳過會讓使用者拿到不完整的補班日清單卻以為是完整的。
    it('should not silently skip a past year whose data vanished upstream', async () => {
      vi.mocked(ofetch)
        .mockRejectedValueOnce(notFound()) // 2024（歷史年度）資料消失
        .mockResolvedValueOnce(mockHolidays2025);

      await expect(service.getRelatedMakeupDays('2025-01-01', '2025-01-31')).rejects.toThrow();
    });

    // 但網路故障不能被吞掉 —— 否則補班日靜默漏報，使用者拿到看似完整的答案
    it('should propagate network failures instead of silently missing makeup days', async () => {
      vi.mocked(ofetch)
        .mockResolvedValueOnce(mockHolidays2025)
        .mockRejectedValueOnce(new Error('ECONNRESET'));

      await expect(service.getRelatedMakeupDays('2025-12-01', '2025-12-31')).rejects.toThrow();
    });
  });

  describe('getAvailableYears', () => {
    /** 上游沒有該年度時，ofetch 會拋出帶 response.status 的錯誤 */
    const notFound = (): Error =>
      Object.assign(new Error('Not Found'), { response: { status: 404 } });

    it('should probe upstream for years beyond the current one', async () => {
      // 今年+1 有資料、今年+2 是 404 → 探測應停在今年+1
      vi.mocked(ofetch).mockResolvedValueOnce([]).mockRejectedValueOnce(notFound());

      const years = await service.getAvailableYears();
      const currentYear = getCurrentYear();

      expect(years[0]).toBe(MIN_SUPPORTED_YEAR);
      expect(years).toContain(currentYear);
      expect(years[years.length - 1]).toBe(currentYear + 1);
    });

    // 只有 404 代表「上游沒有這一年」。網路故障若也被當成 404，
    // 斷網時就會安靜地回報一個較短的範圍 —— 一個看起來完全正常的錯誤答案。
    it('should throw on network failure instead of silently reporting a shorter range', async () => {
      vi.mocked(ofetch).mockRejectedValueOnce(new Error('ECONNRESET'));

      await expect(service.getAvailableYears()).rejects.toThrow();
    });

    // Cache 建構時帶 useCacheOnError: true，會在 fetcher 失敗時回傳「過期」的值。
    // 對年份範圍而言那等於把網路故障偽裝成一個看似正常的舊答案 ——
    // 正是本次要消滅的失效模式，所以這個 key 必須關掉該行為。
    it('should throw on network failure even when a stale range is cached', async () => {
      // 第一次成功 → 範圍進快取
      vi.mocked(ofetch).mockResolvedValueOnce([]).mockRejectedValueOnce(notFound());
      await service.getAvailableYears();

      // 讓快取過期，然後在探測時遇到網路故障
      vi.setSystemTime(new Date(Date.now() + 25 * 60 * 60 * 1000));
      vi.mocked(ofetch).mockRejectedValueOnce(new Error('ECONNRESET'));

      await expect(service.getAvailableYears()).rejects.toThrow();
      vi.useRealTimers();
    });

    it('should not cache a range produced by a failed probe', async () => {
      vi.mocked(ofetch).mockRejectedValueOnce(new Error('ECONNRESET'));
      await expect(service.getAvailableYears()).rejects.toThrow();

      // 網路恢復後應重新探測，而不是回傳上一次失敗留下的答案
      vi.mocked(ofetch).mockResolvedValueOnce([]).mockRejectedValueOnce(notFound());

      const years = await service.getAvailableYears();
      expect(years[years.length - 1]).toBe(getCurrentYear() + 1);
    });
  });
});
