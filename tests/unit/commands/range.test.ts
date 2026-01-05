import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRangeCommand, formatRangeResult } from '../../../src/commands/range.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock holiday service
const mockHolidayService = {
  getHolidaysInRange: vi.fn(),
  getRelatedMakeupDays: vi.fn(),
};

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('range command', () => {
  const mockHolidays: Holiday[] = [
    { date: '20251004', week: '六', isHoliday: true, description: '' },
    { date: '20251005', week: '日', isHoliday: true, description: '' },
    { date: '20251010', week: '五', isHoliday: true, description: '國慶日' },
  ];

  const mockMakeupDays: Holiday[] = [
    { date: '20250927', week: '六', isHoliday: false, description: '補行上班日' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatRangeResult', () => {
    describe('simple format', () => {
      it('should format holidays in simple format', () => {
        const result = formatRangeResult(mockHolidays, [], 'simple');
        expect(result).toContain('2025-10-04');
        expect(result).toContain('2025-10-05');
        expect(result).toContain('2025-10-10');
        expect(result).toContain('國慶日');
        expect(result).toContain('3');
      });

      it('should include makeup days when provided', () => {
        const result = formatRangeResult(mockHolidays, mockMakeupDays, 'simple');
        expect(result).toContain('補班日');
        expect(result).toContain('2025-09-27');
      });

      it('should handle empty results', () => {
        const result = formatRangeResult([], [], 'simple');
        expect(result).toContain('無假期');
      });
    });

    describe('json format', () => {
      it('should format holidays as JSON', () => {
        const result = formatRangeResult(mockHolidays, [], 'json');
        const parsed = JSON.parse(result);
        expect(parsed.holidays).toHaveLength(3);
        expect(parsed.holidays[0].date).toBe('2025-10-04');
        expect(parsed.count).toBe(3);
      });

      it('should include makeup days in JSON', () => {
        const result = formatRangeResult(mockHolidays, mockMakeupDays, 'json');
        const parsed = JSON.parse(result);
        expect(parsed.makeupDays).toHaveLength(1);
        expect(parsed.makeupDays[0].date).toBe('2025-09-27');
      });
    });

    describe('table format', () => {
      it('should format holidays as table', () => {
        const result = formatRangeResult(mockHolidays, [], 'table');
        expect(result).toContain('日期');
        expect(result).toContain('星期');
        expect(result).toContain('說明');
        expect(result).toContain('2025-10-04');
        expect(result).toContain('六');
      });
    });
  });

  describe('createRangeCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createRangeCommand();
      expect(cmd.name()).toBe('range');
    });

    it('should have start and end arguments', () => {
      const cmd = createRangeCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(2);
      expect(args[0].name()).toBe('start');
      expect(args[1].name()).toBe('end');
    });

    it('should have format option', () => {
      const cmd = createRangeCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should have include-workdays option', () => {
      const cmd = createRangeCommand();
      const option = cmd.options.find((opt) => opt.long === '--include-workdays');
      expect(option).toBeDefined();
    });

    it('should execute action without include-workdays', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue(mockHolidays);

      const cmd = createRangeCommand();
      await cmd.parseAsync(['node', 'test', '2025-10-01', '2025-10-31']);

      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
      expect(mockHolidayService.getRelatedMakeupDays).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute action with include-workdays', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue(mockHolidays);
      mockHolidayService.getRelatedMakeupDays.mockResolvedValue(mockMakeupDays);

      const cmd = createRangeCommand();
      await cmd.parseAsync(['node', 'test', '2025-10-01', '2025-10-31', '--include-workdays']);

      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
      expect(mockHolidayService.getRelatedMakeupDays).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('formatRangeResult edge cases', () => {
    it('should handle table format with holidays', () => {
      const result = formatRangeResult(mockHolidays, [], 'table');
      expect(result).toContain('日期');
      expect(result).toContain('星期');
      expect(result).toContain('說明');
    });

    it('should handle table format with empty results', () => {
      const result = formatRangeResult([], [], 'table');
      expect(result).toContain('無假期');
    });

    it('should handle table format with makeup days', () => {
      const result = formatRangeResult(mockHolidays, mockMakeupDays, 'table');
      expect(result).toContain('補班日');
    });

    it('should handle simple format with only makeup days', () => {
      const result = formatRangeResult([], mockMakeupDays, 'simple');
      expect(result).toContain('無假期');
      expect(result).toContain('補班日');
    });
  });
});
