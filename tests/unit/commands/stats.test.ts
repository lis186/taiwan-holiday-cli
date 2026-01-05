import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStatsCommand, formatStatsResult } from '../../../src/commands/stats.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { HolidayStats } from '../../../src/types/holiday.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('stats command', () => {
  const mockStats: HolidayStats = {
    year: 2025,
    month: undefined,
    totalHolidays: 115,
    nationalHolidays: 10,
    compensatoryDays: 5,
    adjustedHolidays: 3,
    workingDays: 7,
    holidayTypes: {
      '國定假日': 10,
      '補假': 5,
      '調整放假': 3,
      '補行上班': 7,
    },
  };

  const mockMonthStats: HolidayStats = {
    year: 2025,
    month: 10,
    totalHolidays: 12,
    nationalHolidays: 2,
    compensatoryDays: 0,
    adjustedHolidays: 1,
    workingDays: 1,
    holidayTypes: {
      '國慶日': 1,
      '週末': 8,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatStatsResult', () => {
    describe('simple format', () => {
      it('should format year stats in simple format', () => {
        const result = formatStatsResult(mockStats, 'simple');
        expect(result).toContain('2025');
        expect(result).toContain('115');
        expect(result).toContain('假期');
      });

      it('should format month stats in simple format', () => {
        const result = formatStatsResult(mockMonthStats, 'simple');
        expect(result).toContain('2025');
        expect(result).toContain('10');
        expect(result).toContain('12');
      });
    });

    describe('json format', () => {
      it('should format stats as JSON', () => {
        const result = formatStatsResult(mockStats, 'json');
        const parsed = JSON.parse(result);
        expect(parsed.year).toBe(2025);
        expect(parsed.totalHolidays).toBe(115);
        expect(parsed.nationalHolidays).toBe(10);
      });
    });

    describe('table format', () => {
      it('should format stats as table', () => {
        const result = formatStatsResult(mockStats, 'table');
        expect(result).toContain('項目');
        expect(result).toContain('數值');
        expect(result).toContain('總假期');
      });
    });
  });

  describe('createStatsCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createStatsCommand();
      expect(cmd.name()).toBe('stats');
    });

    it('should have year argument', () => {
      const cmd = createStatsCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBeGreaterThanOrEqual(1);
      expect(args[0].name()).toBe('year');
    });

    it('should have optional month argument', () => {
      const cmd = createStatsCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(2);
      expect(args[1].name()).toBe('month');
    });

    it('should have format option', () => {
      const cmd = createStatsCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getHolidayStats.mockResolvedValue(mockStats);

      const cmd = createStatsCommand();
      await cmd.parseAsync(['node', 'test', '2025']);

      expect(mockHolidayService.getHolidayStats).toHaveBeenCalledWith(2025, undefined);
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute action with month', async () => {
      mockHolidayService.getHolidayStats.mockResolvedValue(mockMonthStats);

      const cmd = createStatsCommand();
      await cmd.parseAsync(['node', 'test', '2025', '10']);

      expect(mockHolidayService.getHolidayStats).toHaveBeenCalledWith(2025, 10);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('formatStatsResult table format', () => {
    it('should format year stats as table', () => {
      const result = formatStatsResult(mockStats, 'table');
      expect(result).toContain('項目');
      expect(result).toContain('數值');
      expect(result).toContain('總假期');
    });

    it('should format month stats as table', () => {
      const result = formatStatsResult(mockMonthStats, 'table');
      expect(result).toContain('2025年10月');
    });
  });
});
