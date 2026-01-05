import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTodayCommand } from '../../../src/commands/today.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock holiday service
const mockHolidayService = {
  checkHoliday: vi.fn(),
};

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('today command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  describe('createTodayCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createTodayCommand();
      expect(cmd.name()).toBe('today');
    });

    it('should have format option', () => {
      const cmd = createTodayCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should have description', () => {
      const cmd = createTodayCommand();
      expect(cmd.description()).toContain('今天');
    });

    it('should execute action and output result', async () => {
      const mockHoliday: Holiday = {
        date: '20250105',
        week: '日',
        isHoliday: true,
        description: '',
      };
      mockHolidayService.checkHoliday.mockResolvedValue(mockHoliday);

      const cmd = createTodayCommand();
      // Parse without args, should use today
      await cmd.parseAsync(['node', 'test']);

      expect(mockHolidayService.checkHoliday).toHaveBeenCalledWith('today');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
