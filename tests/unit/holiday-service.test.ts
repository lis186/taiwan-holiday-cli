import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HolidayService, HolidayServiceError } from '../../src/services/holiday-service.js';
import type { Holiday } from '../../src/types/holiday.js';

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
      await expect(service.getHolidaysForYear(2030)).rejects.toThrow(HolidayServiceError);
      await expect(service.getHolidaysForYear(2010)).rejects.toThrow(HolidayServiceError);
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
        HolidayServiceError
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
      await expect(service.getHolidayStats(2025, 13)).rejects.toThrow(HolidayServiceError);
      await expect(service.getHolidayStats(2025, 0)).rejects.toThrow(HolidayServiceError);
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

  describe('getSupportedYears', () => {
    it('should return array of supported years', () => {
      const years = service.getSupportedYears();

      expect(years).toContain(2017);
      expect(years).toContain(2026);
      expect(years.length).toBe(10);
    });
  });
});
