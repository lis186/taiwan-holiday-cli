import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseDate,
  parseRelativeDate,
  formatDate,
  isValidDate,
  getWeekdayName,
  DateParseError,
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
});
