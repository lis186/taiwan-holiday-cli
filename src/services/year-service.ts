import { ofetch } from 'ofetch';
import { Cache } from '../lib/cache.js';

const YEARS_CACHE_KEY = 'available_years';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const JSDELIVR_API_URL = 'https://data.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/';
const DEFAULT_START_YEAR = 2017;

interface JsDelivrFile {
  name: string;
  type: string;
}

interface JsDelivrResponse {
  files: JsDelivrFile[];
}

interface YearCache {
  timestamp: number;
  years: number[];
}

/**
 * 年份探索服務
 * 動態從 jsDelivr API 探索可用的年份資料
 */
export class YearService {
  private readonly cache: Cache;
  private readonly timeout = 10000;

  constructor() {
    this.cache = new Cache({ ttl: CACHE_TTL_MS, useCacheOnError: true });
  }

  /**
   * 從 jsDelivr API 取得可用年份
   */
  private async fetchYearsFromApi(): Promise<number[]> {
    const response = await ofetch<JsDelivrResponse>(JSDELIVR_API_URL, {
      timeout: this.timeout,
    });

    const years = response.files
      .filter((file) => file.name.endsWith('.json'))
      .map((file) => parseInt(file.name.replace('.json', ''), 10))
      .filter((year) => !isNaN(year) && year >= DEFAULT_START_YEAR);

    return years.sort((a, b) => a - b);
  }

  /**
   * 取得可用年份列表
   * 優先使用快取，快取過期或不存在時從 API 取得
   */
  async getAvailableYears(): Promise<number[]> {
    const cachedData = this.cache.get<YearCache>(YEARS_CACHE_KEY);

    // 快取有效，直接返回
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      return cachedData.years;
    }

    try {
      const years = await this.fetchYearsFromApi();

      if (years.length > 0) {
        this.cache.set(YEARS_CACHE_KEY, {
          timestamp: Date.now(),
          years,
        });
        return years;
      }
    } catch {
      // API 失敗，嘗試使用舊快取
      if (cachedData) {
        return cachedData.years;
      }
    }

    // 完全沒有資料，返回預設值
    return this.getDefaultYears();
  }

  /**
   * 取得支援的年份範圍
   */
  async getSupportedYearRange(): Promise<{ start: number; end: number }> {
    const years = await this.getAvailableYears();

    if (years.length === 0) {
      return {
        start: DEFAULT_START_YEAR,
        end: new Date().getFullYear(),
      };
    }

    return {
      start: years[0],
      end: years[years.length - 1],
    };
  }

  /**
   * 檢查年份是否支援
   */
  async isYearSupported(year: number): Promise<boolean> {
    const years = await this.getAvailableYears();
    return years.includes(year);
  }

  /**
   * 取得用於 shell completion 的年份字串
   */
  async getYearsForCompletion(): Promise<string> {
    const years = await this.getAvailableYears();
    return years.join(' ');
  }

  /**
   * 取得預設年份列表（當 API 和快取都不可用時）
   */
  private getDefaultYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = DEFAULT_START_YEAR; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }
}

// 全域服務實例
let globalYearService: YearService | null = null;

/**
 * 取得全域年份服務實例
 */
export function getYearService(): YearService {
  if (!globalYearService) {
    globalYearService = new YearService();
  }
  return globalYearService;
}
