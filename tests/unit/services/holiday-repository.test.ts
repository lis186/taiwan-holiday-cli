import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HolidayRepository } from '../../../src/services/holiday-repository.js';
import { mockHolidayData } from '../../helpers/mocks.js';

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
      await expect(repository.getHolidaysForYear(2016)).rejects.toThrow('超出支援範圍');
      await expect(repository.getHolidaysForYear(2027)).rejects.toThrow('超出支援範圍');
    });

    it('should accept valid year', async () => {
      const mockHolidays = [mockHolidayData.nationalDay];
      const { ofetch } = await import('ofetch');
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

  describe('getSupportedYears', () => {
    it('should return array of supported years', () => {
      const years = repository.getSupportedYears();
      expect(years).toContain(2017);
      expect(years).toContain(2026);
      expect(years.length).toBe(10);
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
