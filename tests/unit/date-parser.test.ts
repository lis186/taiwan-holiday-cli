import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseDate,
  parseRelativeDate,
  formatDate,
  isValidDate,
  getWeekdayName,
  DateParseError,
  getCurrentDate,
  getCurrentYear,
  getDaysInMonth,
  addDays,
  addMonths,
  dateToNormalized,
  parsedDateToDate,
  daysBetween,
  getYearsInRange,
} from '../../src/lib/date-parser.js';

describe('date-parser', () => {
  describe('parseDate', () => {
    describe('standard formats', () => {
      it('should parse YYYY-MM-DD format', () => {
        const result = parseDate('2025-10-10');
        expect(result.year).toBe(2025);
        expect(result.month).toBe(10);
        expect(result.day).toBe(10);
        expect(result.normalized).toBe('20251010');
        expect(result.iso).toBe('2025-10-10');
      });

      it('should parse YYYYMMDD format', () => {
        const result = parseDate('20251010');
        expect(result.year).toBe(2025);
        expect(result.month).toBe(10);
        expect(result.day).toBe(10);
        expect(result.normalized).toBe('20251010');
      });

      it('should parse YYYY/MM/DD format', () => {
        const result = parseDate('2025/10/10');
        expect(result.year).toBe(2025);
        expect(result.month).toBe(10);
        expect(result.day).toBe(10);
      });

      it('should handle single digit month and day', () => {
        const result = parseDate('2025-1-5');
        expect(result.month).toBe(1);
        expect(result.day).toBe(5);
        expect(result.normalized).toBe('20250105');
      });
    });

    describe('validation', () => {
      it('should throw DateParseError for invalid format', () => {
        expect(() => parseDate('invalid')).toThrow(DateParseError);
      });

      it('should throw DateParseError for invalid date', () => {
        expect(() => parseDate('2025-02-30')).toThrow(DateParseError);
      });

      it('should throw DateParseError for year out of range', () => {
        expect(() => parseDate('2030-01-01')).toThrow(DateParseError);
        expect(() => parseDate('2010-01-01')).toThrow(DateParseError);
      });

      it('should throw DateParseError for invalid month', () => {
        expect(() => parseDate('2025-13-01')).toThrow(DateParseError);
        expect(() => parseDate('2025-00-01')).toThrow(DateParseError);
      });

      it('should throw DateParseError for invalid day', () => {
        expect(() => parseDate('2025-01-32')).toThrow(DateParseError);
        expect(() => parseDate('2025-01-00')).toThrow(DateParseError);
      });
    });
  });

  describe('parseRelativeDate', () => {
    beforeEach(() => {
      // Mock current date to 2025-01-05
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-05'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should parse "today"', () => {
      const result = parseRelativeDate('today');
      expect(result.iso).toBe('2025-01-05');
    });

    it('should parse "tomorrow"', () => {
      const result = parseRelativeDate('tomorrow');
      expect(result.iso).toBe('2025-01-06');
    });

    it('should parse "yesterday"', () => {
      const result = parseRelativeDate('yesterday');
      expect(result.iso).toBe('2025-01-04');
    });

    it('should parse "next monday"', () => {
      const result = parseRelativeDate('next monday');
      expect(result.iso).toBe('2025-01-06'); // 2025-01-05 is Sunday
    });

    it('should parse "next friday"', () => {
      const result = parseRelativeDate('next friday');
      expect(result.iso).toBe('2025-01-10');
    });

    it('should parse "7d" (7 days)', () => {
      const result = parseRelativeDate('7d');
      expect(result.iso).toBe('2025-01-12');
    });

    it('should parse "2w" (2 weeks)', () => {
      const result = parseRelativeDate('2w');
      expect(result.iso).toBe('2025-01-19');
    });

    it('should parse "1m" (1 month)', () => {
      const result = parseRelativeDate('1m');
      expect(result.iso).toBe('2025-02-05');
    });

    it('should return null for non-relative date', () => {
      const result = parseRelativeDate('2025-01-01');
      expect(result).toBeNull();
    });

    it('should be case insensitive', () => {
      const result = parseRelativeDate('TOMORROW');
      expect(result?.iso).toBe('2025-01-06');
    });
  });

  describe('formatDate', () => {
    it('should format date to ISO format', () => {
      expect(formatDate(2025, 10, 10)).toBe('2025-10-10');
    });

    it('should pad single digit month and day', () => {
      expect(formatDate(2025, 1, 5)).toBe('2025-01-05');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date', () => {
      expect(isValidDate(2025, 10, 10)).toBe(true);
    });

    it('should return false for invalid month', () => {
      expect(isValidDate(2025, 13, 10)).toBe(false);
      expect(isValidDate(2025, 0, 10)).toBe(false);
    });

    it('should return false for invalid day', () => {
      expect(isValidDate(2025, 2, 30)).toBe(false);
      expect(isValidDate(2025, 1, 32)).toBe(false);
    });

    it('should handle leap year', () => {
      expect(isValidDate(2024, 2, 29)).toBe(true);
      expect(isValidDate(2025, 2, 29)).toBe(false);
    });

    it('should return false for year out of range', () => {
      expect(isValidDate(2030, 1, 1)).toBe(false);
      expect(isValidDate(2010, 1, 1)).toBe(false);
    });
  });

  describe('getWeekdayName', () => {
    it('should return correct weekday name', () => {
      // 2025-01-05 is Sunday
      expect(getWeekdayName(2025, 1, 5)).toBe('日');
      // 2025-01-06 is Monday
      expect(getWeekdayName(2025, 1, 6)).toBe('一');
      // 2025-10-10 is Friday
      expect(getWeekdayName(2025, 10, 10)).toBe('五');
    });
  });

  describe('getCurrentDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current date as ParsedDate', () => {
      const result = getCurrentDate();
      expect(result.year).toBe(2025);
      expect(result.month).toBe(6);
      expect(result.day).toBe(15);
      expect(result.normalized).toBe('20250615');
      expect(result.iso).toBe('2025-06-15');
    });
  });

  describe('getCurrentYear', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current year', () => {
      expect(getCurrentYear()).toBe(2025);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return correct days for each month', () => {
      expect(getDaysInMonth(2025, 1)).toBe(31);
      expect(getDaysInMonth(2025, 2)).toBe(28);
      expect(getDaysInMonth(2025, 3)).toBe(31);
      expect(getDaysInMonth(2025, 4)).toBe(30);
      expect(getDaysInMonth(2025, 5)).toBe(31);
      expect(getDaysInMonth(2025, 6)).toBe(30);
      expect(getDaysInMonth(2025, 7)).toBe(31);
      expect(getDaysInMonth(2025, 8)).toBe(31);
      expect(getDaysInMonth(2025, 9)).toBe(30);
      expect(getDaysInMonth(2025, 10)).toBe(31);
      expect(getDaysInMonth(2025, 11)).toBe(30);
      expect(getDaysInMonth(2025, 12)).toBe(31);
    });

    it('should handle leap year February', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2025, 2)).toBe(28);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const result = addDays({ year: 2025, month: 1, day: 15, normalized: '20250115', iso: '2025-01-15' }, 10);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(25);
      expect(result.iso).toBe('2025-01-25');
    });

    it('should handle month overflow', () => {
      const result = addDays({ year: 2025, month: 1, day: 25, normalized: '20250125', iso: '2025-01-25' }, 10);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(2);
      expect(result.day).toBe(4);
      expect(result.iso).toBe('2025-02-04');
    });

    it('should handle year overflow', () => {
      const result = addDays({ year: 2025, month: 12, day: 25, normalized: '20251225', iso: '2025-12-25' }, 10);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(4);
    });

    it('should handle negative days', () => {
      const result = addDays({ year: 2025, month: 1, day: 15, normalized: '20250115', iso: '2025-01-15' }, -10);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(5);
    });
  });

  describe('addMonths', () => {
    it('should add positive months', () => {
      const result = addMonths({ year: 2025, month: 1, day: 15, normalized: '20250115', iso: '2025-01-15' }, 3);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(4);
      expect(result.day).toBe(15);
    });

    it('should handle year overflow', () => {
      const result = addMonths({ year: 2025, month: 10, day: 15, normalized: '20251015', iso: '2025-10-15' }, 5);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it('should handle day overflow (e.g., Jan 31 + 1 month)', () => {
      const result = addMonths({ year: 2025, month: 1, day: 31, normalized: '20250131', iso: '2025-01-31' }, 1);
      // JavaScript Date behavior: Jan 31 + 1 month = March 3 (overflows Feb)
      expect(result.year).toBe(2025);
      expect(result.month).toBe(3);
      expect(result.day).toBe(3);
    });

    it('should handle negative months', () => {
      const result = addMonths({ year: 2025, month: 3, day: 15, normalized: '20250315', iso: '2025-03-15' }, -2);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });
  });

  describe('dateToNormalized', () => {
    it('should convert Date to normalized string', () => {
      const date = new Date('2025-06-15');
      expect(dateToNormalized(date)).toBe('20250615');
    });

    it('should pad single digit month and day', () => {
      const date = new Date('2025-01-05');
      expect(dateToNormalized(date)).toBe('20250105');
    });
  });

  describe('parsedDateToDate', () => {
    it('should convert ParsedDate to Date', () => {
      const parsed = { year: 2025, month: 6, day: 15, normalized: '20250615', iso: '2025-06-15' };
      const result = parsedDateToDate(parsed);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5); // 0-indexed
      expect(result.getDate()).toBe(15);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const start = { year: 2025, month: 1, day: 1, normalized: '20250101', iso: '2025-01-01' };
      const end = { year: 2025, month: 1, day: 10, normalized: '20250110', iso: '2025-01-10' };
      expect(daysBetween(start, end)).toBe(10);
    });

    it('should return 1 for same day', () => {
      const date = { year: 2025, month: 1, day: 15, normalized: '20250115', iso: '2025-01-15' };
      expect(daysBetween(date, date)).toBe(1);
    });

    it('should handle cross-month dates', () => {
      const start = { year: 2025, month: 1, day: 25, normalized: '20250125', iso: '2025-01-25' };
      const end = { year: 2025, month: 2, day: 5, normalized: '20250205', iso: '2025-02-05' };
      expect(daysBetween(start, end)).toBe(12); // Jan 25-31 (7) + Feb 1-5 (5) = 12
    });
  });

  describe('getYearsInRange', () => {
    it('should return years in range', () => {
      const start = { year: 2025, month: 1, day: 1, normalized: '20250101', iso: '2025-01-01' };
      const end = { year: 2025, month: 12, day: 31, normalized: '20251231', iso: '2025-12-31' };
      expect(getYearsInRange(start, end)).toEqual([2025]);
    });

    it('should return multiple years for cross-year range', () => {
      const start = { year: 2025, month: 10, day: 1, normalized: '20251001', iso: '2025-10-01' };
      const end = { year: 2026, month: 3, day: 31, normalized: '20260331', iso: '2026-03-31' };
      expect(getYearsInRange(start, end)).toEqual([2025, 2026]);
    });

    it('should expand search range when expandMonths is set', () => {
      const start = { year: 2025, month: 2, day: 1, normalized: '20250201', iso: '2025-02-01' };
      const end = { year: 2025, month: 2, day: 28, normalized: '20250228', iso: '2025-02-28' };
      // With expandMonths=1, should include Jan-Mar
      expect(getYearsInRange(start, end, 1)).toEqual([2025]);
    });

    it('should expand into previous year', () => {
      const start = { year: 2025, month: 1, day: 15, normalized: '20250115', iso: '2025-01-15' };
      const end = { year: 2025, month: 1, day: 20, normalized: '20250120', iso: '2025-01-20' };
      // With expandMonths=1, search starts from Dec 2024
      expect(getYearsInRange(start, end, 1)).toEqual([2024, 2025]);
    });
  });
});
