import type { CacheItem } from '../types/holiday.js';
import { CACHE_TTL_MS, CACHE_KEY_YEAR_PATTERN } from './constants.js';

/**
 * 快取選項
 */
export interface CacheOptions {
  /** TTL in milliseconds (default: 1 hour) */
  ttl?: number;
  /** Whether to use expired cache on fetch error */
  useCacheOnError?: boolean;
}

/**
 * 快取狀態
 */
export interface CacheStatus {
  /** 已快取的年份 */
  cachedYears: number[];
  /** 快取項目數量 */
  itemCount: number;
  /** TTL (ms) */
  ttl: number;
}

/**
 * 簡單的記憶體快取
 */
export class Cache {
  private store: Map<string, CacheItem<unknown>> = new Map();
  private readonly ttl: number;
  private readonly useCacheOnError: boolean;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? CACHE_TTL_MS;
    this.useCacheOnError = options.useCacheOnError ?? false;
  }

  /**
   * 儲存資料到快取
   */
  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.ttl,
    });
  }

  /**
   * 從快取取得資料
   */
  get<T>(key: string): T | undefined {
    const item = this.store.get(key);
    if (!item) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      return undefined;
    }

    return item.data as T;
  }

  /**
   * 從快取取得資料（包含過期資料，用於 fallback）
   */
  private getExpired<T>(key: string): T | undefined {
    const item = this.store.get(key);
    if (!item) {
      return undefined;
    }
    return item.data as T;
  }

  /**
   * 檢查 key 是否存在且未過期
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 刪除快取項目
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 取得快取狀態
   */
  getStatus(): CacheStatus {
    const cachedYears: number[] = [];
    let itemCount = 0;

    for (const [key, item] of this.store.entries()) {
      // Only count non-expired items
      if (Date.now() - item.timestamp <= item.ttl) {
        itemCount++;

        // Extract year from key like "holidays_2025"
        const match = key.match(CACHE_KEY_YEAR_PATTERN);
        if (match) {
          cachedYears.push(parseInt(match[1], 10));
        }
      }
    }

    return {
      cachedYears: cachedYears.sort((a, b) => a - b),
      itemCount,
      ttl: this.ttl,
    };
  }

  /**
   * 取得快取項目的時間戳記
   */
  getTimestamp(key: string): number | undefined {
    const item = this.store.get(key);
    if (!item) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      return undefined;
    }

    return item.timestamp;
  }

  /**
   * 取得快取或執行 fetcher
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { useCacheOnError?: boolean }
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch new data
    try {
      const data = await fetcher();
      this.set(key, data);
      return data;
    } catch (error) {
      // If useCacheOnError, try to return expired cache
      const useCache = options?.useCacheOnError ?? this.useCacheOnError;
      if (useCache) {
        const expiredData = this.getExpired<T>(key);
        if (expiredData !== undefined) {
          return expiredData;
        }
      }
      throw error;
    }
  }
}

// Global cache instance
let globalCache: Cache | null = null;

/**
 * 取得全域快取實例
 */
export function getCache(): Cache {
  if (!globalCache) {
    globalCache = new Cache();
  }
  return globalCache;
}

/**
 * 重設全域快取（用於測試）
 */
export function resetCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
  globalCache = null;
}
