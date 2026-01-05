import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache } from '../../src/lib/cache.js';
import type { Holiday } from '../../src/types/holiday.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-05T12:00:00Z'));
    cache = new Cache({ ttl: 3600000 }); // 1 hour TTL
  });

  afterEach(() => {
    vi.useRealTimers();
    cache.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const holidays: Holiday[] = [
        { date: '20250101', week: '三', isHoliday: true, description: '開國紀念日' },
      ];
      cache.set('holidays_2025', holidays);
      const result = cache.get<Holiday[]>('holidays_2025');
      expect(result).toEqual(holidays);
    });

    it('should return undefined for non-existent key', () => {
      const result = cache.get<Holiday[]>('non_existent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for expired cache', () => {
      const holidays: Holiday[] = [
        { date: '20250101', week: '三', isHoliday: true, description: '開國紀念日' },
      ];
      cache.set('holidays_2025', holidays);

      // Advance time by 2 hours (past TTL)
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      const result = cache.get<Holiday[]>('holidays_2025');
      expect(result).toBeUndefined();
    });

    it('should return data within TTL', () => {
      const holidays: Holiday[] = [
        { date: '20250101', week: '三', isHoliday: true, description: '開國紀念日' },
      ];
      cache.set('holidays_2025', holidays);

      // Advance time by 30 minutes (within TTL)
      vi.advanceTimersByTime(30 * 60 * 1000);

      const result = cache.get<Holiday[]>('holidays_2025');
      expect(result).toEqual(holidays);
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('non_existent')).toBe(false);
    });

    it('should return false for expired key', () => {
      cache.set('key', 'value');
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      expect(cache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      cache.delete('key');
      expect(cache.get('key')).toBeUndefined();
    });

    it('should not throw for non-existent key', () => {
      expect(() => cache.delete('non_existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return cache status', () => {
      cache.set('holidays_2024', []);
      cache.set('holidays_2025', []);

      const status = cache.getStatus();
      expect(status.cachedYears).toContain(2024);
      expect(status.cachedYears).toContain(2025);
      expect(status.itemCount).toBe(2);
      expect(status.ttl).toBe(3600000);
    });

    it('should not include expired items in status', () => {
      cache.set('holidays_2024', []);
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      cache.set('holidays_2025', []);

      const status = cache.getStatus();
      expect(status.cachedYears).not.toContain(2024);
      expect(status.cachedYears).toContain(2025);
    });
  });

  describe('getTimestamp', () => {
    it('should return timestamp for cached item', () => {
      const now = Date.now();
      cache.set('key', 'value');
      const timestamp = cache.getTimestamp('key');
      expect(timestamp).toBe(now);
    });

    it('should return undefined for non-existent key', () => {
      const timestamp = cache.getTimestamp('non_existent');
      expect(timestamp).toBeUndefined();
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if exists', async () => {
      cache.set('key', 'cached_value');
      const fetcher = vi.fn().mockResolvedValue('fetched_value');

      const result = await cache.getOrFetch('key', fetcher);

      expect(result).toBe('cached_value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not exists', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched_value');

      const result = await cache.getOrFetch('key', fetcher);

      expect(result).toBe('fetched_value');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cache.get('key')).toBe('fetched_value');
    });

    it('should fetch if cache expired', async () => {
      cache.set('key', 'old_value');
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      const fetcher = vi.fn().mockResolvedValue('new_value');
      const result = await cache.getOrFetch('key', fetcher);

      expect(result).toBe('new_value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should use cache on fetch error if useCacheOnError is true', async () => {
      cache.set('key', 'cached_value');
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // expire cache

      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      // Re-set with expired data still in memory
      const cacheWithFallback = new Cache({ ttl: 3600000, useCacheOnError: true });
      cacheWithFallback.set('key', 'cached_value');
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // The expired cache should still be retrievable for fallback
      const result = await cacheWithFallback.getOrFetch('key', fetcher, { useCacheOnError: true });

      expect(result).toBe('cached_value');
    });
  });
});
