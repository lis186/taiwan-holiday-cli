import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCheckCommand, formatCheckResult } from '../../../src/commands/check.js';
import { createMockHolidayService } from '../../helpers/mocks.js';
import type { Holiday } from '../../../src/types/holiday.js';

// Mock holiday service using helper
const mockHolidayService = createMockHolidayService();

vi.mock('../../../src/services/holiday-service.js', () => ({
  getHolidayService: () => mockHolidayService,
}));

describe('check command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatCheckResult', () => {
    const holidayData: Holiday = {
      date: '20251010',
      week: '五',
      isHoliday: true,
      description: '國慶日',
    };

    const workdayData: Holiday = {
      date: '20251008',
      week: '三',
      isHoliday: false,
      description: '',
    };

    describe('simple format', () => {
      it('should format holiday in simple format', () => {
        const result = formatCheckResult(holidayData, 'simple');
        expect(result).toContain('2025-10-10');
        expect(result).toContain('五');
        expect(result).toContain('假期');
        expect(result).toContain('國慶日');
      });

      it('should format workday in simple format', () => {
        const result = formatCheckResult(workdayData, 'simple');
        expect(result).toContain('2025-10-08');
        expect(result).toContain('三');
        expect(result).toContain('不是假期');
        expect(result).toContain('工作日');
      });

      it('should format null result (date not in data)', () => {
        const result = formatCheckResult(null, 'simple', '2025-06-15');
        expect(result).toContain('2025-06-15');
        expect(result).toContain('查無資料');
      });
    });

    describe('json format', () => {
      it('should format holiday as JSON', () => {
        const result = formatCheckResult(holidayData, 'json');
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          date: '2025-10-10',
          normalizedDate: '20251010',
          week: '五',
          isHoliday: true,
          description: '國慶日',
        });
      });

      it('should format workday as JSON', () => {
        const result = formatCheckResult(workdayData, 'json');
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          date: '2025-10-08',
          normalizedDate: '20251008',
          week: '三',
          isHoliday: false,
          description: '',
        });
      });

      it('should format null result as JSON', () => {
        const result = formatCheckResult(null, 'json', '2025-06-15');
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          date: '2025-06-15',
          normalizedDate: null,
          week: null,
          isHoliday: null,
          description: null,
          error: '查無資料',
        });
      });
    });

    describe('table format', () => {
      it('should format holiday as table', () => {
        const result = formatCheckResult(holidayData, 'table');
        expect(result).toContain('日期');
        expect(result).toContain('星期');
        expect(result).toContain('是否假期');
        expect(result).toContain('說明');
        expect(result).toContain('2025-10-10');
        expect(result).toContain('五');
        expect(result).toContain('✓');
        expect(result).toContain('國慶日');
      });

      it('should format workday as table', () => {
        const result = formatCheckResult(workdayData, 'table');
        expect(result).toContain('2025-10-08');
        expect(result).toContain('三');
        // Should not have checkmark for non-holiday
        expect(result).not.toContain('✓');
      });
    });
  });

  describe('createCheckCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createCheckCommand();
      expect(cmd.name()).toBe('check');
    });

    it('should have date argument', () => {
      const cmd = createCheckCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].name()).toBe('date');
    });

    it('should have format option', () => {
      const cmd = createCheckCommand();
      const formatOption = cmd.options.find((opt) => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });
  });
});
