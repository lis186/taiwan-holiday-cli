import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBetweenCommand, formatBetweenResult } from '../../../src/commands/between.js';
import type { WorkdaysStats } from '../../../src/types/holiday.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock holiday service
const mockHolidayService = {
  getWorkdaysBetween: vi.fn(),
};

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('between command', () => {
  const mockStats: WorkdaysStats = {
    totalDays: 10,
    workdays: 7,
    holidays: 3,
    makeupWorkdays: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatBetweenResult', () => {
    it('should format stats in simple format', () => {
      const result = formatBetweenResult(mockStats, '2025-01-01', '2025-01-10', 'simple');
      expect(result).toContain('2025-01-01');
      expect(result).toContain('2025-01-10');
      expect(result).toContain('7');
      expect(result).toContain('工作天');
    });

    it('should format as JSON', () => {
      const result = formatBetweenResult(mockStats, '2025-01-01', '2025-01-10', 'json');
      const parsed = JSON.parse(result);
      expect(parsed.startDate).toBe('2025-01-01');
      expect(parsed.endDate).toBe('2025-01-10');
      expect(parsed.workdays).toBe(7);
    });

    it('should format as table', () => {
      const result = formatBetweenResult(mockStats, '2025-01-01', '2025-01-10', 'table');
      expect(result).toContain('2025-01-01');
      expect(result).toContain('2025-01-10');
      expect(result).toContain('工作天');
      expect(result).toContain('7');
    });
  });

  describe('createBetweenCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createBetweenCommand();
      expect(cmd.name()).toBe('between');
    });

    it('should have start and end arguments', () => {
      const cmd = createBetweenCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(2);
      expect(args[0].name()).toBe('start');
      expect(args[1].name()).toBe('end');
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getWorkdaysBetween.mockResolvedValue(mockStats);

      const cmd = createBetweenCommand();
      await cmd.parseAsync(['node', 'test', '2025-01-01', '2025-01-10']);

      expect(mockHolidayService.getWorkdaysBetween).toHaveBeenCalledWith('2025-01-01', '2025-01-10');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should have workdays option', () => {
      const cmd = createBetweenCommand();
      const option = cmd.options.find((opt) => opt.long === '--workdays');
      expect(option).toBeDefined();
    });

    it('should output only workdays count when --workdays is used', async () => {
      mockHolidayService.getWorkdaysBetween.mockResolvedValue(mockStats);

      const cmd = createBetweenCommand();
      await cmd.parseAsync(['node', 'test', '2025-01-01', '2025-01-10', '--workdays']);

      expect(mockConsoleLog).toHaveBeenCalledWith('7');
    });
  });
});
