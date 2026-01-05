import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 month 命令結果
 */
export function formatMonthResult(
  holidays: Holiday[],
  year: number,
  month: number,
  format: OutputFormat
): string {
  const holidaysOnly = holidays.filter((h) => h.isHoliday);

  if (format === 'json') {
    return JSON.stringify(
      {
        year,
        month,
        count: holidaysOnly.length,
        holidays: holidaysOnly.map((h) => ({
          date: formatDateString(h.date),
          week: h.week,
          description: h.description || '週末',
        })),
      },
      null,
      2
    );
  }

  if (format === 'table') {
    if (holidaysOnly.length === 0) {
      return `${year}年${month}月無假期`;
    }

    const table = new Table({
      head: ['日期', '星期', '說明'],
    });

    for (const h of holidaysOnly) {
      table.push([formatDateString(h.date), h.week, h.description || '週末']);
    }

    return `${year}年${month}月假期：\n${table.toString()}`;
  }

  // simple format
  if (holidaysOnly.length === 0) {
    return `${year}年${month}月無假期`;
  }

  let output = `${year}年${month}月假期 (共 ${holidaysOnly.length} 天)：`;
  for (const h of holidaysOnly) {
    const desc = h.description || '週末';
    output += `\n- ${formatDateString(h.date)} (${h.week}) ${desc}`;
  }

  return output;
}

/**
 * 建立 month 命令
 */
export function createMonthCommand(): Command {
  const cmd = new Command('month')
    .description('列出指定月份的假期')
    .argument('<year>', '年份 (2017-2026)')
    .argument('<month>', '月份 (1-12)')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (year: string, month: string, options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      // Calculate date range for the month
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

      const holidays = await service.getHolidaysInRange(startDate, endDate, { holidaysOnly: true });
      const output = formatMonthResult(holidays, yearNum, monthNum, options.format);
      console.log(output);
    });

  return cmd;
}
