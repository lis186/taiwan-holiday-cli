/**
 * 集中管理的常數
 * 消除魔術字串和魔術數字
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// =============================================================================
// API 相關常數
// =============================================================================

/**
 * TaiwanCalendar API 基礎 URL
 */
export const API_BASE_URL = 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data';

/**
 * API 請求預設超時時間（毫秒）
 */
export const API_TIMEOUT_MS = 10000;

/**
 * API 健康檢查超時時間（毫秒）
 */
export const API_HEALTH_CHECK_TIMEOUT_MS = 5000;

// =============================================================================
// 快取相關常數
// =============================================================================

/**
 * 快取 TTL（毫秒）- 1 小時
 */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * 快取 key 前綴
 */
export const CACHE_KEY_PREFIX = 'holidays_';

// =============================================================================
// 設定相關常數
// =============================================================================

/**
 * CLI 專案名稱（用於設定檔）
 */
export const PROJECT_NAME = 'taiwan-holiday-cli';

/**
 * CLI 版本。
 *
 * 從 package.json 讀取，不在原始碼裡另存一份 —— 寫死的版本號會漂移
 * （這裡曾是 '1.0.1' 而 health 命令回報 '1.0.0'，兩者都與 package.json 不同步）。
 */
export const CLI_VERSION: string = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8')
).version;

/**
 * 輸出格式類型
 */
export const OUTPUT_FORMATS = ['simple', 'json', 'table'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/**
 * 有效的設定項目
 */
export const CONFIG_KEYS = ['format'] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

/**
 * 預設輸出格式
 */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'simple';

// =============================================================================
// CLI 命令相關常數
// =============================================================================

/**
 * 已知的 CLI 命令列表
 */
export const KNOWN_COMMANDS = [
  'check',
  'today',
  'range',
  'stats',
  'list',
  'years',
  'next',
  'month',
  'workdays',
  'between',
  'typhoon',
  'cache',
  'config',
  'health',
  'completion',
  'help',
] as const;

// =============================================================================
// 日期相關常數
// =============================================================================

/**
 * 月份範圍
 */
export const MONTH_RANGE = {
  min: 1,
  max: 12,
} as const;

/**
 * 快取 key 匹配正則
 */
export const CACHE_KEY_YEAR_PATTERN = /holidays_(\d{4})/;

// =============================================================================
// 颱風假（天然災害停止上班上課）
// =============================================================================

/**
 * TaiwanTyphoonDays 資料基礎 URL。
 *
 * 主來源用 raw.githubusercontent（快取 5 分鐘），jsDelivr（邊緣快取最長 12 小時）只當備援：
 * 颱風假資料每天更新，晚 12 小時看到等於答錯。
 */
export const TYPHOON_API_BASE_URL = 'https://raw.githubusercontent.com/lis186/TaiwanTyphoonDays/master/data';
export const TYPHOON_API_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/lis186/TaiwanTyphoonDays/data';

/**
 * DGPA 天然災害停止上班及上課情形即時頁（靜態 UTF-8 HTML，格式非官方承諾）
 */
export const TYPHOON_LIVE_URL = 'https://www.dgpa.gov.tw/typh/daily/nds.html';

/**
 * 颱風假快取 key 前綴（與假期資料分開）
 */
export const TYPHOON_CACHE_KEY_PREFIX = 'typhoon_';
