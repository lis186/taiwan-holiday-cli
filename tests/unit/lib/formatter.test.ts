import { describe, it, expect } from 'vitest';
import {
  formatDateString,
  formatHolidayStatus,
  formatHolidayDescription,
} from '../../../src/lib/formatter.js';

describe('formatter', () => {
  describe('formatDateString', () => {
    it('should convert YYYYMMDD to YYYY-MM-DD', () => {
      expect(formatDateString('20250101')).toBe('2025-01-01');
      expect(formatDateString('20251010')).toBe('2025-10-10');
      expect(formatDateString('20251231')).toBe('2025-12-31');
    });

    it('should handle edge cases', () => {
      expect(formatDateString('20170101')).toBe('2017-01-01');
      expect(formatDateString('20261231')).toBe('2026-12-31');
    });
  });

  describe('formatHolidayStatus', () => {
    it('should return checkmark for holiday', () => {
      expect(formatHolidayStatus(true)).toBe('✓');
    });

    it('should return empty string for non-holiday', () => {
      expect(formatHolidayStatus(false)).toBe('');
    });
  });

  describe('formatHolidayDescription', () => {
    it('should return description if provided', () => {
      expect(formatHolidayDescription('國慶日', true)).toBe('國慶日');
      expect(formatHolidayDescription('補行上班日', false)).toBe('補行上班日');
    });

    it('should return 週末 for holiday without description', () => {
      expect(formatHolidayDescription('', true)).toBe('週末');
      expect(formatHolidayDescription(undefined as unknown as string, true)).toBe('週末');
    });

    it('should return empty string for non-holiday without description', () => {
      expect(formatHolidayDescription('', false)).toBe('');
    });
  });
});
