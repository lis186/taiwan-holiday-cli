import { ofetch } from 'ofetch';
import { Cache } from '../lib/cache.js';
import {
  TYPHOON_API_BASE_URL,
  TYPHOON_API_FALLBACK_URL,
  TYPHOON_CACHE_KEY_PREFIX,
  TYPHOON_LIVE_URL,
  API_TIMEOUT_MS,
  CACHE_TTL_MS,
  CLI_VERSION,
} from '../lib/constants.js';
import { parsePage, type ParsedPage } from '../lib/typhoon-live-parser.js';
import { getCurrentYear } from '../lib/date-parser.js';
import { DataError, ValidationError } from '../lib/errors.js';
import type { TyphoonEvent } from '../types/typhoon.js';
import { TYPHOON_MIN_YEAR } from '../types/typhoon.js';

/**
 * 判斷抓取錯誤是否為 404
 */
function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

/**
 * 颱風假資料儲存庫
 *
 * 上游契約：2001 年到當年每年都有檔案，沒有事件的年份是 []。
 * 唯一合法的缺檔是「當年度檔案還沒產生」（1 月 1 日首次排程更新之前，排程實測可能晚數小時），
 * 以 null 表示，讓呼叫端回報「資料源未就緒」而不是「查無紀錄」。歷史年份缺檔一律是異常。
 */
export class TyphoonRepository {
  private readonly cache: Cache;
  private readonly timeout = API_TIMEOUT_MS;
  private bypassCache = false;

  constructor() {
    this.cache = new Cache({ ttl: CACHE_TTL_MS, useCacheOnError: true });
  }

  setBypassCache(bypass: boolean): void {
    this.bypassCache = bypass;
  }

  /**
   * 取得指定年份的事件；當年度（含之後）檔案尚未產生時回傳 null。
   */
  async getEventsForYear(year: number): Promise<TyphoonEvent[] | null> {
    this.validateYear(year);

    const cacheKey = `${TYPHOON_CACHE_KEY_PREFIX}${year}`;

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
        `無法取得 ${year} 年颱風假資料: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async fetchFromApi(year: number): Promise<TyphoonEvent[] | null> {
    try {
      return await this.fetchOnce(TYPHOON_API_BASE_URL, year);
    } catch (error) {
      if (isNotFound(error)) {
        return this.handleNotFound(year);
      }
      if (error instanceof DataError) {
        throw error;
      }
      // 主來源連不上才改用備援；404 由上面處理，不換來源（兩邊內容相同）
      try {
        return await this.fetchOnce(TYPHOON_API_FALLBACK_URL, year);
      } catch (fallbackError) {
        if (isNotFound(fallbackError)) {
          return this.handleNotFound(year);
        }
        throw fallbackError;
      }
    }
  }

  /**
   * 抓 DGPA 即時頁並解析。每次呼叫都重新抓：CLI 是一次性程序，記憶體快取跨不了呼叫，
   * 而即時頁本身就是 no-cache。頁面只有約 15 KB，一次呼叫一個請求。
   */
  async getLivePage(): Promise<{ page: ParsedPage; fetchedAt: string }> {
    const html: string = await ofetch(TYPHOON_LIVE_URL, {
      timeout: this.timeout,
      responseType: 'text',
      headers: {
        'User-Agent': `taiwan-holiday-cli/${CLI_VERSION} (+https://github.com/lis186/taiwan-holiday-cli)`,
      },
    });
    return { page: parsePage(html), fetchedAt: new Date().toISOString() };
  }

  private async fetchOnce(baseUrl: string, year: number): Promise<TyphoonEvent[]> {
    // raw.githubusercontent 回 text/plain，ofetch 不會自動解析；不強制 JSON 會拿到字串，
    // 後續當成「沒有事件」靜默答錯。所以強制解析，並驗證一定是陣列。
    const data: unknown = await ofetch(`${baseUrl}/${year}.json`, {
      timeout: this.timeout,
      responseType: 'json',
    });
    if (!Array.isArray(data)) {
      throw new DataError(`${year} 年颱風假資料格式錯誤：預期為陣列`);
    }
    return data as TyphoonEvent[];
  }

  private handleNotFound(year: number): null {
    if (year >= getCurrentYear()) {
      return null;
    }
    throw new DataError(
      `上游缺少 ${year} 年颱風假資料，可能是資料源異常，請回報 lis186/TaiwanTyphoonDays。`
    );
  }

  private validateYear(year: number): void {
    if (year < TYPHOON_MIN_YEAR || year > getCurrentYear() + 1) {
      throw new ValidationError(
        `年份 ${year} 超出颱風假資料範圍 (${TYPHOON_MIN_YEAR}-${getCurrentYear()})`
      );
    }
  }
}
