import { describe, it, expect, afterEach } from 'vitest';
import {
  createConsoleLogSpy,
  createConsoleErrorSpy,
  createMockHolidayService,
  mockHolidayData,
  mockStatsData,
  mockCacheStatus,
} from './mocks.js';

describe('test helpers', () => {
  describe('createConsoleLogSpy', () => {
    it('should create a working console.log spy', () => {
      const spy = createConsoleLogSpy();
      console.log('test message');
      expect(spy).toHaveBeenCalledWith('test message');
      spy.mockRestore();
    });
  });

  describe('createConsoleErrorSpy', () => {
    it('should create a working console.error spy', () => {
      const spy = createConsoleErrorSpy();
      console.error('error message');
      expect(spy).toHaveBeenCalledWith('error message');
      spy.mockRestore();
    });
  });

  describe('createMockHolidayService', () => {
    it('should create a mock with all expected methods', () => {
      const mock = createMockHolidayService();

      expect(mock.checkHoliday).toBeDefined();
      expect(mock.getHolidaysForYear).toBeDefined();
      expect(mock.getHolidaysInRange).toBeDefined();
      expect(mock.getHolidayStats).toBeDefined();
      expect(mock.getWorkdaysStats).toBeDefined();
      expect(mock.getWorkdaysBetween).toBeDefined();
      expect(mock.getRelatedMakeupDays).toBeDefined();
      expect(mock.getSupportedYears).toBeDefined();
      expect(mock.getCacheStatus).toBeDefined();
      expect(mock.clearCache).toBeDefined();
      expect(mock.checkApiHealth).toBeDefined();
      expect(mock.setBypassCache).toBeDefined();
    });

    it('should have mockable methods', () => {
      const mock = createMockHolidayService();
      mock.checkHoliday.mockResolvedValue(mockHolidayData.nationalDay);

      expect(mock.checkHoliday).not.toHaveBeenCalled();
    });
  });

  describe('mockHolidayData', () => {
    it('should have all expected holiday types', () => {
      expect(mockHolidayData.nationalDay).toBeDefined();
      expect(mockHolidayData.newYear).toBeDefined();
      expect(mockHolidayData.lunarNewYear).toBeDefined();
      expect(mockHolidayData.makeupWorkday).toBeDefined();
      expect(mockHolidayData.weekend).toBeDefined();
      expect(mockHolidayData.workday).toBeDefined();
    });

    it('should have correct holiday structure', () => {
      const holiday = mockHolidayData.nationalDay;
      expect(holiday.date).toBe('20261010');
      expect(holiday.week).toBe('六');
      expect(holiday.isHoliday).toBe(true);
      expect(holiday.description).toBe('國慶日');
    });
  });

  describe('mockStatsData', () => {
    it('should have all expected stats types', () => {
      expect(mockStatsData.yearStats).toBeDefined();
      expect(mockStatsData.monthStats).toBeDefined();
      expect(mockStatsData.workdaysStats).toBeDefined();
    });
  });

  describe('mockCacheStatus', () => {
    it('should have expected cache status structure', () => {
      expect(mockCacheStatus.itemCount).toBe(2);
      expect(mockCacheStatus.items).toHaveLength(2);
      expect(mockCacheStatus.hitRate).toBe(0.85);
    });
  });
});
