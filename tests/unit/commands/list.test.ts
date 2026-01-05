import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createListCommand, formatListResult } from '../../../src/commands/list.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('list command', () => {
  const mockHolidays: Holiday[] = [
    { date: '20260101', week: '四', isHoliday: true, description: '開國紀念日' },
    { date: '20260217', week: '二', isHoliday: true, description: '春節' },
    { date: '20261010', week: '六', isHoliday: true, description: '國慶日' },
    { date: '20260926', week: '六', isHoliday: false, description: '補行上班日' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatListResult', () => {
    describe('simple format', () => {
      it('should format holidays in simple format', () => {
        const result = formatListResult(mockHolidays, 'simple', { holidaysOnly: false });
        expect(result).toContain('2026-01-01');
        expect(result).toContain('開國紀念日');
        expect(result).toContain('國慶日');
      });

      it('should filter holidays only', () => {
        const result = formatListResult(mockHolidays, 'simple', { holidaysOnly: true });
        expect(result).toContain('開國紀念日');
        expect(result).not.toContain('補行上班日');
      });
    });

    describe('json format', () => {
      it('should format holidays as JSON', () => {
        const result = formatListResult(mockHolidays, 'json', { holidaysOnly: false });
        const parsed = JSON.parse(result);
        expect(parsed.holidays).toHaveLength(4);
        expect(parsed.holidays[0].description).toBe('開國紀念日');
      });

      it('should filter holidays only in JSON', () => {
        const result = formatListResult(mockHolidays, 'json', { holidaysOnly: true });
        const parsed = JSON.parse(result);
        expect(parsed.holidays).toHaveLength(3);
        expect(parsed.holidays.every((h: Holiday) => h.isHoliday)).toBe(true);
      });
    });

    describe('table format', () => {
      it('should format holidays as table', () => {
        const result = formatListResult(mockHolidays, 'table', { holidaysOnly: false });
        expect(result).toContain('日期');
        expect(result).toContain('星期');
        expect(result).toContain('說明');
      });
    });
  });

  describe('createListCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createListCommand();
      expect(cmd.name()).toBe('list');
    });

    it('should have year argument', () => {
      const cmd = createListCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBeGreaterThanOrEqual(1);
      expect(args[0].name()).toBe('year');
    });

    it('should have format option', () => {
      const cmd = createListCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should have holidays-only option', () => {
      const cmd = createListCommand();
      const option = cmd.options.find((opt) => opt.long === '--holidays-only');
      expect(option).toBeDefined();
    });

    it('should have group-by option', () => {
      const cmd = createListCommand();
      const option = cmd.options.find((opt) => opt.long === '--group-by');
      expect(option).toBeDefined();
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getHolidaysForYear.mockResolvedValue(mockHolidays);

      const cmd = createListCommand();
      await cmd.parseAsync(['node', 'test', '2026']);

      expect(mockHolidayService.getHolidaysForYear).toHaveBeenCalledWith(2026);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('formatListResult edge cases', () => {
    it('should handle table format with holidays', () => {
      const result = formatListResult(mockHolidays, 'table', { holidaysOnly: false });
      expect(result).toContain('日期');
      expect(result).toContain('是否假期');
    });

    it('should handle empty list in table format', () => {
      const result = formatListResult([], 'table', { holidaysOnly: false });
      expect(result).toContain('無假期');
    });

    it('should handle empty list in simple format', () => {
      const result = formatListResult([], 'simple', { holidaysOnly: false });
      expect(result).toContain('無假期');
    });
  });

  describe('formatListResult with groupBy', () => {
    const yearHolidays: Holiday[] = [
      { date: '20260101', week: '四', isHoliday: true, description: '開國紀念日' },
      { date: '20260111', week: '日', isHoliday: true, description: '' },
      { date: '20260217', week: '二', isHoliday: true, description: '春節' },
      { date: '20261010', week: '六', isHoliday: true, description: '國慶日' },
    ];

    it('should group by month in simple format', () => {
      const result = formatListResult(yearHolidays, 'simple', { holidaysOnly: true, groupBy: 'month' });
      expect(result).toContain('一月');
      expect(result).toContain('二月');
      expect(result).toContain('十月');
    });

    it('should group by month in json format', () => {
      const result = formatListResult(yearHolidays, 'json', { holidaysOnly: true, groupBy: 'month' });
      const parsed = JSON.parse(result);
      expect(parsed.groups).toBeDefined();
      expect(Object.keys(parsed.groups)).toContain('01');
      expect(Object.keys(parsed.groups)).toContain('02');
      expect(Object.keys(parsed.groups)).toContain('10');
    });
  });
});
