import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createYearsCommand, formatYearsResult } from '../../../src/commands/years.js';
import { createConsoleLogSpy, createMockHolidayService } from '../../helpers/mocks.js';

// Mock console.log using helper
const mockConsoleLog = createConsoleLogSpy();

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();
mockHolidayService.getSupportedYears.mockReturnValue([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('years command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('formatYearsResult', () => {
    const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

    it('should format years in simple format', () => {
      const result = formatYearsResult(years, 'simple');
      expect(result).toContain('2017');
      expect(result).toContain('2026');
    });

    it('should format years as JSON', () => {
      const result = formatYearsResult(years, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.years).toEqual(years);
      expect(parsed.count).toBe(10);
    });
  });

  describe('createYearsCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createYearsCommand();
      expect(cmd.name()).toBe('years');
    });

    it('should have format option', () => {
      const cmd = createYearsCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should execute action and output result', () => {
      const cmd = createYearsCommand();
      cmd.parse(['node', 'test']);

      expect(mockHolidayService.getSupportedYears).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
