import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorkdaysCommand, formatWorkdaysResult } from '../../../src/commands/workdays.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';
import type { WorkdaysStats } from '../../../src/types/holiday.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('workdays command', () => {
  const mockStats: WorkdaysStats = {
    totalDays: 31,
    workdays: 22,
    holidays: 9,
    makeupWorkdays: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatWorkdaysResult', () => {
    it('should format workdays stats in simple format', () => {
      const result = formatWorkdaysResult(mockStats, 2026, 10, 'simple');
      expect(result).toContain('2026年10月');
      expect(result).toContain('22');
      expect(result).toContain('工作天');
    });

    it('should format as JSON', () => {
      const result = formatWorkdaysResult(mockStats, 2026, 10, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.year).toBe(2026);
      expect(parsed.month).toBe(10);
      expect(parsed.workdays).toBe(22);
    });

    it('should format as table', () => {
      const result = formatWorkdaysResult(mockStats, 2026, 10, 'table');
      expect(result).toContain('2026年10月');
      expect(result).toContain('工作天');
      expect(result).toContain('22');
    });
  });

  describe('createWorkdaysCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createWorkdaysCommand();
      expect(cmd.name()).toBe('workdays');
    });

    it('should have year and month arguments', () => {
      const cmd = createWorkdaysCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(2);
    });

    it('should execute action and output result', async () => {
      mockHolidayService.getWorkdaysStats.mockResolvedValue(mockStats);

      const cmd = createWorkdaysCommand();
      await cmd.parseAsync(['node', 'test', '2026', '10']);

      expect(mockHolidayService.getWorkdaysStats).toHaveBeenCalledWith(2026, 10);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
