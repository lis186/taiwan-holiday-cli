import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import { parseDate, getCurrentDate, addDays } from '../lib/date-parser.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';
import { SUPPORTED_YEAR_RANGE } from '../types/holiday.js';
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
  const results = findNextHolidays(holidays, today, 1, skipWeekends);
  return results.length > 0 ? results[0] : null;
}

/**
 * 從假期列表中找出接下來的多個假期
 */
export function findNextHolidays(
  holidays: Holiday[],
  today: string,
  count: number,
  skipWeekends = false
): Holiday[] {
  const results: Holiday[] = [];
  for (const h of holidays) {
    if (h.isHoliday && h.date > today) {
      if (skipWeekends && isRegularWeekend(h)) {
        continue;
      }
      results.push(h);
      if (results.length >= count) {
        break;
      }
    }
  }
  return results;
}

/**
 * 格式化 next 命令結果（單個假期，向後相容）
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
 * 格式化 next 命令結果（多個假期）
 */
export function formatNextResults(holidays: Holiday[], format: OutputFormat): string {
  if (holidays.length === 0) {
    if (format === 'json') {
      return JSON.stringify({ found: false, holidays: [], message: '查無假期' }, null, 2);
    }
    return '查無假期';
  }

  if (format === 'json') {
    return JSON.stringify(
      {
        found: true,
        count: holidays.length,
        holidays: holidays.map((h) => ({
          date: formatDateString(h.date),
          week: h.week,
          description: h.description || '週末',
        })),
      },
      null,
      2
    );
  }

  // simple format
  const lines = holidays.map((h) => {
    const desc = h.description || '週末';
    return `${formatDateString(h.date)} (${h.week}) ${desc}`;
  });
  return `接下來 ${holidays.length} 個假期：\n${lines.join('\n')}`;
}

/**
 * 建立 next 命令
 */
export function createNextCommand(): Command {
  const cmd = new Command('next')
    .description('查詢接下來的假期')
    .argument('[count]', '顯示幾個假期', '1')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .option('--skip-weekends', '跳過一般週末，只顯示特殊假日')
    .action(async (countStr: string, options: { format: OutputFormat; skipWeekends?: boolean }) => {
      const count = parseInt(countStr, 10) || 1;
      const service = getHolidayService();
      const today = getCurrentDate();

      // Search within supported year range
      const maxYear = SUPPORTED_YEAR_RANGE.end;
      const maxEndDate = { year: maxYear, month: 12, day: 31, normalized: `${maxYear}1231`, iso: `${maxYear}-12-31` };
      const searchEndDate = addDays(today, 365);
      const endDate = searchEndDate.normalized > maxEndDate.normalized ? maxEndDate : searchEndDate;

      const holidays = await service.getHolidaysInRange(today.iso, endDate.iso, {
        holidaysOnly: true,
      });

      if (count === 1) {
        // 單一假期（向後相容）
        const nextHoliday = findNextHoliday(holidays, today.normalized, options.skipWeekends);
        const output = formatNextResult(nextHoliday, options.format);
        console.log(output);
      } else {
        // 多個假期
        const nextHolidays = findNextHolidays(holidays, today.normalized, count, options.skipWeekends);
        const output = formatNextResults(nextHolidays, options.format);
        console.log(output);
      }
    });

  return cmd;
}
