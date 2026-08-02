import { ofetch } from 'ofetch';
import { Cache } from '../lib/cache.js';
import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_HEALTH_CHECK_TIMEOUT_MS,
  CACHE_TTL_MS,
} from '../lib/constants.js';
import { getCurrentYear } from '../lib/date-parser.js';
import { DataError, ValidationError, YearNotPublishedError } from '../lib/errors.js';
import type { Holiday } from '../types/holiday.js';
import { MIN_SUPPORTED_YEAR, getMaxQueryableYear } from '../types/holiday.js';

/**
 * Repository 錯誤（向後相容別名）
 * @deprecated 請使用 DataError
 */
export const RepositoryError = DataError;

const AVAILABLE_YEARS_CACHE_KEY = 'available_years';

/**
 * 判斷抓取錯誤是否為 404（上游沒有該檔案）
 */
function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

/**
 * 假期資料儲存庫
 * 負責資料獲取與快取管理
 */
export class HolidayRepository {
  private readonly baseUrl = API_BASE_URL;
  private readonly cache: Cache;
  private readonly timeout = API_TIMEOUT_MS;
  private bypassCache = false;

  constructor() {
    this.cache = new Cache({ ttl: CACHE_TTL_MS, useCacheOnError: true });
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
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        `無法取得 ${year} 年假期資料: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 從 API 獲取資料
   */
  private async fetchFromApi(year: number): Promise<Holiday[]> {
    const url = `${this.baseUrl}/${year}.json`;
    try {
      return await ofetch<Holiday[]>(url, { timeout: this.timeout });
    } catch (error) {
      if (isNotFound(error)) {
        // 未來年度的 404 = 辦公日曆表還沒公布，呼叫端可安全跳過。
        //
        // 但當年或歷史年度的 404 代表上游把已發布的資料弄掉了 —— 那是真的異常。
        // 若也標成「尚未發布」，getRelatedMakeupDays 會靜默跳過它，
        // 使用者就會拿到不完整的補班日清單卻以為是完整的。
        if (year > getCurrentYear()) {
          throw new YearNotPublishedError(
            `上游尚未發布 ${year} 年資料。中華民國政府行政機關辦公日曆表通常在前一年年中公布。`,
            year
          );
        }
        throw new DataError(
          `上游缺少 ${year} 年資料。該年度應已發布，可能是上游資料異常，請回報 ruyut/TaiwanCalendar。`
        );
      }
      throw error;
    }
  }

  /**
   * 驗證年份是否值得向上游查詢。
   *
   * 只擋掉上游確定沒有的（早於 2017）與荒謬的輸入；
   * 某一年到底有沒有資料，交給實際抓取的結果回答。
   */
  private validateYear(year: number): void {
    if (year < MIN_SUPPORTED_YEAR || year > getMaxQueryableYear()) {
      throw new ValidationError(
        `年份 ${year} 超出可查詢範圍 (${MIN_SUPPORTED_YEAR}-${getMaxQueryableYear()})`
      );
    }
  }

  /**
   * 探測上游實際有哪些年份的資料。
   *
   * 2017 到今年視為必然存在（上游維護完整歷史），
   * 今年之後逐年往前探測，遇到第一個缺漏就停。
   */
  async getAvailableYears(): Promise<number[]> {
    // 這個 key 必須關掉 useCacheOnError：對假期資料而言，失敗時回傳過期內容是
    // 合理的降級；但對「可查哪些年份」而言，那等於把網路故障偽裝成一個看似
    // 正常的舊答案 —— 正是本次要消滅的失效模式。
    return this.cache.getOrFetch(
      AVAILABLE_YEARS_CACHE_KEY,
      async () => {
        const currentYear = getCurrentYear();
        const years: number[] = [];

        for (let year = MIN_SUPPORTED_YEAR; year <= currentYear; year++) {
          years.push(year);
        }

        const maxYear = getMaxQueryableYear();
        for (let year = currentYear + 1; year <= maxYear; year++) {
          if (!(await this.isYearAvailable(year))) {
            break;
          }
          years.push(year);
        }

        return years;
      },
      { useCacheOnError: false }
    );
  }

  /**
   * 上游是否有這一年的資料。
   *
   * 只有 404 代表「上游確定沒有這一年」。網路故障、超時、5xx 一律往外拋 ——
   * 把它們也當成 404 的話，斷網時會安靜地回報一個較短的年份範圍，
   * 那是個看起來完全正常的錯誤答案，比明確失敗糟得多。
   */
  private async isYearAvailable(year: number): Promise<boolean> {
    try {
      await ofetch(`${this.baseUrl}/${year}.json`, {
        method: 'HEAD',
        timeout: this.timeout,
      });
      return true;
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }
      throw error;
    }
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
      const year = getCurrentYear();
      const url = `${this.baseUrl}/${year}.json`;
      await ofetch(url, { timeout: API_HEALTH_CHECK_TIMEOUT_MS });
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
