import { ofetch } from 'ofetch';
import { Cache } from '../lib/cache.js';
import type { Holiday } from '../types/holiday.js';
import { SUPPORTED_YEAR_RANGE } from '../types/holiday.js';

/**
 * Repository 錯誤
 */
export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * 假期資料儲存庫
 * 負責資料獲取與快取管理
 */
export class HolidayRepository {
  private readonly baseUrl = 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data';
  private readonly cache: Cache;
  private readonly timeout = 10000;
  private bypassCache = false;

  constructor() {
    this.cache = new Cache({ ttl: 60 * 60 * 1000, useCacheOnError: true });
  }

  /**
   * 設定是否繞過快取
   */
  setBypassCache(bypass: boolean): void {
    this.bypassCache = bypass;
  }

  /**
   * 取得指定年份的假期資料
   */
  async getHolidaysForYear(year: number): Promise<Holiday[]> {
    this.validateYear(year);

    const cacheKey = `holidays_${year}`;

    try {
      if (this.bypassCache) {
        const data = await this.fetchFromApi(year);
        this.cache.set(cacheKey, data);
        return data;
      }

      return await this.cache.getOrFetch(cacheKey, () => this.fetchFromApi(year));
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `無法取得 ${year} 年假期資料: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 從 API 獲取資料
   */
  private async fetchFromApi(year: number): Promise<Holiday[]> {
    const url = `${this.baseUrl}/${year}.json`;
    return await ofetch<Holiday[]>(url, { timeout: this.timeout });
  }

  /**
   * 驗證年份
   */
  private validateYear(year: number): void {
    if (year < SUPPORTED_YEAR_RANGE.start || year > SUPPORTED_YEAR_RANGE.end) {
      throw new RepositoryError(
        `年份 ${year} 超出支援範圍 (${SUPPORTED_YEAR_RANGE.start}-${SUPPORTED_YEAR_RANGE.end})`
      );
    }
  }

  /**
   * 取得支援的年份列表
   */
  getSupportedYears(): number[] {
    const years: number[] = [];
    for (let year = SUPPORTED_YEAR_RANGE.start; year <= SUPPORTED_YEAR_RANGE.end; year++) {
      years.push(year);
    }
    return years;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 取得快取狀態
   */
  getCacheStatus() {
    return this.cache.getStatus();
  }

  /**
   * 檢查 API 健康狀態
   */
  async checkApiHealth(): Promise<{ reachable: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const year = new Date().getFullYear();
      const url = `${this.baseUrl}/${year}.json`;
      await ofetch(url, { timeout: 5000 });
      const latency = Date.now() - start;
      return { reachable: true, latency };
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : '無法連線',
      };
    }
  }
}
