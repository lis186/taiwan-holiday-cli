import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNextCommand,
  formatNextResult,
  formatNextResults,
  findNextHoliday,
  findNextHolidays,
} from '../../../src/commands/next.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('next command', () => {
  const mockHolidays: Holiday[] = [
    { date: '20260110', week: '六', isHoliday: true, description: '測試假期' },
    { date: '20260115', week: '四', isHoliday: true, description: '另一個假期' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('findNextHoliday', () => {
    it('should find next holiday from a list', () => {
      const today = '20260105';
      const result = findNextHoliday(mockHolidays, today);
      expect(result).toBeDefined();
      expect(result?.date).toBe('20260110');
    });

    it('should return null if no future holiday', () => {
      const today = '20260120';
      const result = findNextHoliday(mockHolidays, today);
      expect(result).toBeNull();
    });
  });

  describe('formatNextResult', () => {
    const holiday: Holiday = {
      date: '20260110',
      week: '六',
      isHoliday: true,
      description: '測試假期',
    };

    const holidayNoDesc: Holiday = {
      date: '20260111',
      week: '日',
      isHoliday: true,
      description: '',
    };

    it('should format next holiday in simple format', () => {
      const result = formatNextResult(holiday, 'simple');
      expect(result).toContain('2026-01-10');
      expect(result).toContain('六');
      expect(result).toContain('測試假期');
    });

    it('should format weekend holiday in simple format', () => {
      const result = formatNextResult(holidayNoDesc, 'simple');
      expect(result).toContain('週末');
    });

    it('should format as JSON', () => {
      const result = formatNextResult(holiday, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.date).toBe('2026-01-10');
      expect(parsed.description).toBe('測試假期');
    });

    it('should handle null result in simple format', () => {
      const result = formatNextResult(null, 'simple');
      expect(result).toContain('查無');
    });

    it('should handle null result in json format', () => {
      const result = formatNextResult(null, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.found).toBe(false);
    });
  });

  describe('createNextCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createNextCommand();
      expect(cmd.name()).toBe('next');
    });

    it('should have format option', () => {
      const cmd = createNextCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue(mockHolidays);

      const cmd = createNextCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should have skip-weekends option', () => {
      const cmd = createNextCommand();
      const option = cmd.options.find((opt) => opt.long === '--skip-weekends');
      expect(option).toBeDefined();
    });
  });

  describe('findNextHoliday with skipWeekends', () => {
    const mixedHolidays: Holiday[] = [
      { date: '20260111', week: '日', isHoliday: true, description: '' },  // weekend
      { date: '20260117', week: '六', isHoliday: true, description: '' },  // weekend
      { date: '20260217', week: '二', isHoliday: true, description: '春節' },  // special
    ];

    it('should skip weekends when option is true', () => {
      const today = '20260105';
      const result = findNextHoliday(mixedHolidays, today, true);
      expect(result).toBeDefined();
      expect(result?.date).toBe('20260217');
      expect(result?.description).toBe('春節');
    });

    it('should not skip weekends when option is false', () => {
      const today = '20260105';
      const result = findNextHoliday(mixedHolidays, today, false);
      expect(result).toBeDefined();
      expect(result?.date).toBe('20260111');
    });
  });

  describe('findNextHolidays', () => {
    const manyHolidays: Holiday[] = [
      { date: '20260110', week: '六', isHoliday: true, description: '' },
      { date: '20260111', week: '日', isHoliday: true, description: '' },
      { date: '20260117', week: '六', isHoliday: true, description: '' },
      { date: '20260118', week: '日', isHoliday: true, description: '' },
      { date: '20260217', week: '二', isHoliday: true, description: '春節' },
    ];

    it('should find multiple holidays', () => {
      const today = '20260105';
      const result = findNextHolidays(manyHolidays, today, 3);
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('20260110');
      expect(result[2].date).toBe('20260117');
    });

    it('should return fewer if not enough holidays', () => {
      const today = '20260105';
      const result = findNextHolidays(manyHolidays, today, 10);
      expect(result).toHaveLength(5);
    });

    it('should skip weekends when option is true', () => {
      const today = '20260105';
      const result = findNextHolidays(manyHolidays, today, 2, true);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('春節');
    });
  });

  describe('formatNextResults', () => {
    const holidays: Holiday[] = [
      { date: '20260110', week: '六', isHoliday: true, description: '' },
      { date: '20260217', week: '二', isHoliday: true, description: '春節' },
    ];

    it('should format multiple holidays in simple format', () => {
      const result = formatNextResults(holidays, 'simple');
      expect(result).toContain('接下來 2 個假期');
      expect(result).toContain('2026-01-10');
      expect(result).toContain('2026-02-17');
      expect(result).toContain('春節');
    });

    it('should format as JSON with count', () => {
      const result = formatNextResults(holidays, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.found).toBe(true);
      expect(parsed.count).toBe(2);
      expect(parsed.holidays).toHaveLength(2);
    });

    it('should handle empty array in simple format', () => {
      const result = formatNextResults([], 'simple');
      expect(result).toContain('查無');
    });

    it('should handle empty array in json format', () => {
      const result = formatNextResults([], 'json');
      const parsed = JSON.parse(result);
      expect(parsed.found).toBe(false);
      expect(parsed.holidays).toHaveLength(0);
    });
  });

  describe('createNextCommand with count argument', () => {
    it('should accept count argument', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue([
        { date: '20260110', week: '六', isHoliday: true, description: '' },
        { date: '20260111', week: '日', isHoliday: true, description: '' },
        { date: '20260117', week: '六', isHoliday: true, description: '' },
      ]);

      const cmd = createNextCommand();
      await cmd.parseAsync(['node', 'test', '3']);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0][0];
      expect(output).toContain('接下來 3 個假期');
    });
  });
});
