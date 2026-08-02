import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HolidayRepository } from '../../../src/services/holiday-repository.js';
import { mockHolidayData } from '../../helpers/mocks.js';
import { MIN_SUPPORTED_YEAR, getMaxQueryableYear } from '../../../src/types/holiday.js';
import { getCurrentYear } from '../../../src/lib/date-parser.js';

// Hoisted mocks
const { mockOfetch, mockCacheInstance } = vi.hoisted(() => ({
  mockOfetch: vi.fn(),
  mockCacheInstance: {
    getOrFetch: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ itemCount: 0, cachedYears: [], ttl: 3600000 }),
  },
}));

// Mock ofetch
vi.mock('ofetch', () => ({
  ofetch: mockOfetch,
}));

// Mock Cache
vi.mock('../../../src/lib/cache.js', () => ({
  Cache: vi.fn().mockImplementation(() => mockCacheInstance),
}));

describe('HolidayRepository', () => {
  let repository: HolidayRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new HolidayRepository();
  });

  describe('getHolidaysForYear', () => {
    it('should validate year range', async () => {
      await expect(repository.getHolidaysForYear(MIN_SUPPORTED_YEAR - 1)).rejects.toThrow(
        '超出可查詢範圍'
      );
      await expect(repository.getHolidaysForYear(getMaxQueryableYear() + 1)).rejects.toThrow(
        '超出可查詢範圍'
      );
    });

    it('should accept valid year', async () => {
      const mockHolidays = [mockHolidayData.nationalDay];
      const { Cache } = await import('../../../src/lib/cache.js');

      const mockCache = (Cache as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockCache) {
        mockCache.getOrFetch.mockResolvedValue(mockHolidays);
      }

      const result = await repository.getHolidaysForYear(2025);
      expect(result).toEqual(mockHolidays);
    });
  });

  describe('setBypassCache', () => {
    it('should set bypass cache flag', () => {
      expect(() => repository.setBypassCache(true)).not.toThrow();
      expect(() => repository.setBypassCache(false)).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cache', () => {
      expect(() => repository.clearCache()).not.toThrow();
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status', () => {
      const status = repository.getCacheStatus();
      expect(status).toBeDefined();
      expect(status).toHaveProperty('itemCount');
    });
  });

  describe('getAvailableYears', () => {
    it('should include every year from the upstream start up to the current one', async () => {
      // 快取被 mock 成直接執行 fetcher，探測結果由 mockOfetch 決定
      mockCacheInstance.getOrFetch.mockImplementation(
        async (_key: string, fetcher: () => Promise<number[]>) => fetcher()
      );
      // 必須是帶 response.status 的 404 形狀；普通 Error 現在會被視為網路故障而拋出
      mockOfetch.mockRejectedValue(
        Object.assign(new Error('Not Found'), { response: { status: 404 } })
      );

      const years = await repository.getAvailableYears();

      expect(years[0]).toBe(MIN_SUPPORTED_YEAR);
      expect(years[years.length - 1]).toBe(getCurrentYear());
    });

    it('should propagate a network failure instead of truncating the range', async () => {
      mockCacheInstance.getOrFetch.mockImplementation(
        async (_key: string, fetcher: () => Promise<number[]>) => fetcher()
      );
      mockOfetch.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(repository.getAvailableYears()).rejects.toThrow('ETIMEDOUT');
    });
  });

  describe('bypassCache mode', () => {
    it('should fetch directly when bypassCache is true', async () => {
      const mockHolidays = [mockHolidayData.nationalDay];
      mockOfetch.mockResolvedValueOnce(mockHolidays);

      repository.setBypassCache(true);
      const result = await repository.getHolidaysForYear(2025);

      expect(mockOfetch).toHaveBeenCalled();
      expect(mockCacheInstance.set).toHaveBeenCalledWith('holidays_2025', mockHolidays);
      expect(result).toEqual(mockHolidays);
    });
  });

  describe('checkApiHealth', () => {
    it('should return reachable true on success', async () => {
      mockOfetch.mockResolvedValueOnce([]);

      const result = await repository.checkApiHealth();

      expect(result.reachable).toBe(true);
      expect(result.latency).toBeDefined();
    });

    it('should return reachable false on error', async () => {
      mockOfetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await repository.checkApiHealth();

      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('error handling', () => {
    it('should wrap non-RepositoryError in RepositoryError', async () => {
      mockCacheInstance.getOrFetch.mockRejectedValueOnce(new Error('API error'));

      await expect(repository.getHolidaysForYear(2025)).rejects.toThrow('無法取得 2025 年假期資料');
    });
  });
});
