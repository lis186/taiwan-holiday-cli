import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import { parseDate, getCurrentDate, addDays } from '../lib/date-parser.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 判斷是否為一般週末（無特殊說明的週六日）
 */
function isRegularWeekend(holiday: Holiday): boolean {
  const weekDay = holiday.week;
  const desc = holiday.description || '';
  // 週六日且說明為空或只是「週末」
  return (weekDay === '六' || weekDay === '日') && (desc === '' || desc === '週末');
}

/**
 * 從假期列表中找出下一個假期
 */
export function findNextHoliday(holidays: Holiday[], today: string, skipWeekends = false): Holiday | null {
  for (const h of holidays) {
    if (h.isHoliday && h.date > today) {
      if (skipWeekends && isRegularWeekend(h)) {
        continue;
      }
      return h;
    }
  }
  return null;
}

/**
 * 格式化 next 命令結果
 */
export function formatNextResult(holiday: Holiday | null, format: OutputFormat): string {
  if (holiday === null) {
    if (format === 'json') {
      return JSON.stringify({ found: false, message: '查無下一個假期' }, null, 2);
    }
    return '查無下一個假期';
  }

  if (format === 'json') {
    return JSON.stringify(
      {
        found: true,
        date: formatDateString(holiday.date),
        week: holiday.week,
        description: holiday.description || '週末',
      },
      null,
      2
    );
  }

  // simple format
  const desc = holiday.description || '週末';
  return `下一個假期：${formatDateString(holiday.date)} (${holiday.week}) ${desc}`;
}

/**
 * 建立 next 命令
 */
export function createNextCommand(): Command {
  const cmd = new Command('next')
    .description('查詢下一個假期')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .option('--skip-weekends', '跳過一般週末，只顯示特殊假日')
    .action(async (options: { format: OutputFormat; skipWeekends?: boolean }) => {
      const service = getHolidayService();
      const today = getCurrentDate();

      // Search within next 90 days
      const endDate = addDays(today, 90);

      const holidays = await service.getHolidaysInRange(today.iso, endDate.iso, {
        holidaysOnly: true,
      });
      const nextHoliday = findNextHoliday(holidays, today.normalized, options.skipWeekends);
      const output = formatNextResult(nextHoliday, options.format);
      console.log(output);
    });

  return cmd;
}
