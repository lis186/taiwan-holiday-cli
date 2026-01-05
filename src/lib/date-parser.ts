import { ParsedDate, SUPPORTED_YEAR_RANGE, WEEKDAY_NAMES } from '../types/holiday.js';

/**
 * 日期解析錯誤
 */
export class DateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateParseError';
  }
}

/**
 * 檢查是否為閏年
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 取得指定月份的天數
 */
function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

/**
 * 驗證日期是否有效
 */
export function isValidDate(year: number, month: number, day: number): boolean {
  // 檢查年份範圍
  if (year < SUPPORTED_YEAR_RANGE.start || year > SUPPORTED_YEAR_RANGE.end) {
    return false;
  }

  // 檢查月份
  if (month < 1 || month > 12) {
    return false;
  }

  // 檢查日期
  if (day < 1 || day > getDaysInMonth(year, month)) {
    return false;
  }

  return true;
}

/**
 * 格式化日期為 ISO 格式 (YYYY-MM-DD)
 */
export function formatDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * 取得星期幾的中文名稱
 */
export function getWeekdayName(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return WEEKDAY_NAMES[date.getDay()];
}

/**
 * 解析標準日期格式
 */
export function parseDate(dateStr: string): ParsedDate {
  // 先嘗試解析相對日期
  const relativeResult = parseRelativeDate(dateStr);
  if (relativeResult) {
    return relativeResult;
  }

  let year: number;
  let month: number;
  let day: number;

  // YYYYMMDD 格式
  const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    year = parseInt(compactMatch[1], 10);
    month = parseInt(compactMatch[2], 10);
    day = parseInt(compactMatch[3], 10);
  } else {
    // YYYY-MM-DD 或 YYYY/MM/DD 格式
    const separatorMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (separatorMatch) {
      year = parseInt(separatorMatch[1], 10);
      month = parseInt(separatorMatch[2], 10);
      day = parseInt(separatorMatch[3], 10);
    } else {
      throw new DateParseError(`無效的日期格式：${dateStr}，請使用 YYYY-MM-DD 或 YYYYMMDD`);
    }
  }

  // 驗證年份範圍
  if (year < SUPPORTED_YEAR_RANGE.start || year > SUPPORTED_YEAR_RANGE.end) {
    throw new DateParseError(
      `年份 ${year} 超出支援範圍 (${SUPPORTED_YEAR_RANGE.start}-${SUPPORTED_YEAR_RANGE.end})`
    );
  }

  // 驗證月份
  if (month < 1 || month > 12) {
    throw new DateParseError(`無效的月份：${month}，月份必須在 1-12 之間`);
  }

  // 驗證日期
  const maxDay = getDaysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    throw new DateParseError(`無效的日期：${year}-${month}-${day}`);
  }

  const normalized = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  const iso = formatDate(year, month, day);

  return { year, month, day, normalized, iso };
}

/**
 * 星期名稱對應
 */
const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * 解析相對日期
 * @returns ParsedDate 或 null（如果不是相對日期格式）
 */
export function parseRelativeDate(dateStr: string): ParsedDate | null {
  const lower = dateStr.toLowerCase().trim();
  const now = new Date();

  let targetDate: Date | null = null;

  // today
  if (lower === 'today') {
    targetDate = now;
  }
  // tomorrow
  else if (lower === 'tomorrow') {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
  }
  // yesterday
  else if (lower === 'yesterday') {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - 1);
  }
  // next {weekday}
  else if (lower.startsWith('next ')) {
    const weekdayStr = lower.slice(5);
    const targetWeekday = WEEKDAY_MAP[weekdayStr];
    if (targetWeekday !== undefined) {
      targetDate = new Date(now);
      const currentDay = now.getDay();
      let daysUntil = targetWeekday - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      targetDate.setDate(targetDate.getDate() + daysUntil);
    }
  }
  // {n}d - days
  else {
    const daysMatch = lower.match(/^(\d+)d$/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
    }
  }

  // {n}w - weeks
  if (!targetDate) {
    const weeksMatch = lower.match(/^(\d+)w$/);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1], 10);
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + weeks * 7);
    }
  }

  // {n}m - months
  if (!targetDate) {
    const monthsMatch = lower.match(/^(\d+)m$/);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1], 10);
      targetDate = new Date(now);
      targetDate.setMonth(targetDate.getMonth() + months);
    }
  }

  if (!targetDate) {
    return null;
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();

  const normalized = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  const iso = formatDate(year, month, day);

  return { year, month, day, normalized, iso };
}
