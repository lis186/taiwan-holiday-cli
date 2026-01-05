/**
 * 共用格式化工具
 * 統一處理日期格式化、假期狀態顯示等邏輯
 */

/**
 * 格式化日期 YYYYMMDD -> YYYY-MM-DD
 */
export function formatDateString(date: string): string {
  return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
}

/**
 * 格式化假期狀態（表格用）
 */
export function formatHolidayStatus(isHoliday: boolean): string {
  return isHoliday ? '✓' : '';
}

/**
 * 格式化假期說明
 * @param description 原始說明
 * @param isHoliday 是否為假期
 * @returns 格式化後的說明
 */
export function formatHolidayDescription(description: string, isHoliday: boolean): string {
  if (description) {
    return description;
  }
  return isHoliday ? '週末' : '';
}
