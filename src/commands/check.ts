import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';

export type OutputFormat = 'simple' | 'json' | 'table';

/**
 * 格式化 check 命令結果
 */
export function formatCheckResult(
  holiday: Holiday | null,
  format: OutputFormat,
  inputDate?: string
): string {
  if (format === 'json') {
    if (holiday === null) {
      return JSON.stringify(
        {
          date: inputDate || null,
          normalizedDate: null,
          week: null,
          isHoliday: null,
          description: null,
          error: '查無資料',
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        date: formatDateString(holiday.date),
        normalizedDate: holiday.date,
        week: holiday.week,
        isHoliday: holiday.isHoliday,
        description: holiday.description,
      },
      null,
      2
    );
  }

  if (format === 'table') {
    const table = new Table({
      head: ['日期', '星期', '是否假期', '說明'],
    });

    if (holiday === null) {
      table.push([inputDate || '-', '-', '-', '查無資料']);
    } else {
      table.push([
        formatDateString(holiday.date),
        holiday.week,
        holiday.isHoliday ? '✓' : '',
        holiday.description || (holiday.isHoliday ? '週末' : '工作日'),
      ]);
    }

    return table.toString();
  }

  // simple format
  if (holiday === null) {
    return `${inputDate} 查無資料`;
  }

  const dateStr = formatDateString(holiday.date);
  if (holiday.isHoliday) {
    const desc = holiday.description || '週末';
    return `${dateStr} (${holiday.week}) 是假期：${desc}`;
  } else {
    if (holiday.description.includes('補行上班')) {
      return `${dateStr} (${holiday.week}) 不是假期，是補班日：${holiday.description}`;
    }
    return `${dateStr} (${holiday.week}) 不是假期，是一般工作日`;
  }
}

/**
 * 建立 check 命令
 */
export function createCheckCommand(): Command {
  const cmd = new Command('check')
    .description('查詢指定日期是否為假期')
    .argument('<date>', '日期 (支援 YYYY-MM-DD, YYYYMMDD, today, tomorrow, next monday 等)')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (date: string, options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const result = await service.checkHoliday(date);
      const output = formatCheckResult(result, options.format, date);
      console.log(output);
    });

  return cmd;
}
