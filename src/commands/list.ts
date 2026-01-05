import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 月份名稱
 */
const MONTH_NAMES = [
  '', '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

/**
 * 按月份分組
 */
function groupByMonth(holidays: Holiday[]): Map<string, Holiday[]> {
  const groups = new Map<string, Holiday[]>();
  for (const h of holidays) {
    const month = h.date.substring(4, 6);
    if (!groups.has(month)) {
      groups.set(month, []);
    }
    groups.get(month)!.push(h);
  }
  return groups;
}

export type GroupBy = 'month' | 'type';

/**
 * 格式化 list 命令結果
 */
export function formatListResult(
  holidays: Holiday[],
  format: OutputFormat,
  options: { holidaysOnly: boolean; groupBy?: GroupBy }
): string {
  let filtered = holidays;
  if (options.holidaysOnly) {
    filtered = holidays.filter((h) => h.isHoliday);
  }

  // Handle groupBy option
  if (options.groupBy === 'month') {
    return formatGroupedByMonth(filtered, format);
  }

  if (format === 'json') {
    return JSON.stringify(
      {
        count: filtered.length,
        holidays: filtered.map((h) => ({
          date: formatDateString(h.date),
          week: h.week,
          isHoliday: h.isHoliday,
          description: h.description,
        })),
      },
      null,
      2
    );
  }

  if (format === 'table') {
    if (filtered.length === 0) {
      return '無假期資料';
    }

    const table = new Table({
      head: ['日期', '星期', '是否假期', '說明'],
    });

    for (const h of filtered) {
      table.push([
        formatDateString(h.date),
        h.week,
        h.isHoliday ? '✓' : '',
        h.description || (h.isHoliday ? '週末' : ''),
      ]);
    }

    return table.toString();
  }

  // simple format
  if (filtered.length === 0) {
    return '無假期資料';
  }

  let output = `假期清單 (共 ${filtered.length} 筆)：`;
  for (const h of filtered) {
    const status = h.isHoliday ? '假期' : '補班';
    const desc = h.description || (h.isHoliday ? '週末' : '');
    output += `\n- ${formatDateString(h.date)} (${h.week}) [${status}] ${desc}`;
  }

  return output;
}

/**
 * 格式化按月份分組的結果
 */
function formatGroupedByMonth(holidays: Holiday[], format: OutputFormat): string {
  const groups = groupByMonth(holidays);

  if (format === 'json') {
    const result: Record<string, Array<{ date: string; week: string; description: string }>> = {};
    for (const [month, items] of groups) {
      result[month] = items.map((h) => ({
        date: formatDateString(h.date),
        week: h.week,
        description: h.description || '週末',
      }));
    }
    return JSON.stringify({ groups: result, count: holidays.length }, null, 2);
  }

  if (format === 'table') {
    if (holidays.length === 0) {
      return '無假期資料';
    }

    let output = '';
    for (const [month, items] of groups) {
      const monthNum = parseInt(month, 10);
      const monthName = MONTH_NAMES[monthNum];
      output += `\n${monthName} (${items.length} 個假期)：\n`;

      const table = new Table({
        head: ['日期', '星期', '說明'],
      });

      for (const h of items) {
        table.push([formatDateString(h.date), h.week, h.description || '週末']);
      }
      output += table.toString();
    }
    return output.trim();
  }

  // simple format
  if (holidays.length === 0) {
    return '無假期資料';
  }

  let output = `假期清單 (共 ${holidays.length} 筆)：`;
  for (const [month, items] of groups) {
    const monthNum = parseInt(month, 10);
    const monthName = MONTH_NAMES[monthNum];
    output += `\n\n${monthName} (${items.length} 個假期)：`;
    for (const h of items) {
      const desc = h.description || '週末';
      output += `\n  - ${formatDateString(h.date)} (${h.week}) ${desc}`;
    }
  }
  return output;
}

/**
 * 建立 list 命令
 */
export function createListCommand(): Command {
  const cmd = new Command('list')
    .description('列出指定年份的所有假期')
    .argument('<year>', '年份 (2017-2026)')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .option('--holidays-only', '只顯示假期（不含補班日）')
    .option('--group-by <type>', '分組方式 (month)')
    .action(async (year: string, options: { format: OutputFormat; holidaysOnly?: boolean; groupBy?: GroupBy }) => {
      const service = getHolidayService();
      const yearNum = parseInt(year, 10);
      const holidays = await service.getHolidaysForYear(yearNum);
      const output = formatListResult(holidays, options.format, {
        holidaysOnly: options.holidaysOnly ?? false,
        groupBy: options.groupBy,
      });
      console.log(output);
    });

  return cmd;
}
