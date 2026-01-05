import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMonthCommand, formatMonthResult } from '../../../src/commands/month.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('month command', () => {
  const mockHolidays: Holiday[] = [
    { date: '20261004', week: '日', isHoliday: true, description: '' },
    { date: '20261005', week: '一', isHoliday: true, description: '' },
    { date: '20261010', week: '六', isHoliday: true, description: '國慶日' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatMonthResult', () => {
    it('should format month holidays in simple format', () => {
      const result = formatMonthResult(mockHolidays, 2026, 10, 'simple');
      expect(result).toContain('2026年10月');
      expect(result).toContain('國慶日');
    });

    it('should format as JSON', () => {
      const result = formatMonthResult(mockHolidays, 2026, 10, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.year).toBe(2026);
      expect(parsed.month).toBe(10);
      expect(parsed.holidays).toHaveLength(3);
    });

    it('should format as table', () => {
      const result = formatMonthResult(mockHolidays, 2026, 10, 'table');
      expect(result).toContain('2026年10月');
      expect(result).toContain('日期');
      expect(result).toContain('星期');
    });

    it('should handle empty holidays in simple format', () => {
      const result = formatMonthResult([], 2026, 10, 'simple');
      expect(result).toContain('無假期');
    });

    it('should handle empty holidays in table format', () => {
      const result = formatMonthResult([], 2026, 10, 'table');
      expect(result).toContain('無假期');
    });
  });

  describe('createMonthCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createMonthCommand();
      expect(cmd.name()).toBe('month');
    });

    it('should have year and month arguments', () => {
      const cmd = createMonthCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(2);
      expect(args[0].name()).toBe('year');
      expect(args[1].name()).toBe('month');
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue(mockHolidays);

      const cmd = createMonthCommand();
      await cmd.parseAsync(['node', 'test', '2026', '10']);

      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
