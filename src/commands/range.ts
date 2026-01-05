import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import { formatDateString } from '../lib/formatter.js';
import type { Holiday } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 range 命令結果
 */
export function formatRangeResult(
  holidays: Holiday[],
  makeupDays: Holiday[],
  format: OutputFormat
): string {
  const holidaysOnly = holidays.filter((h) => h.isHoliday);

  if (format === 'json') {
    const result: {
      count: number;
      holidays: Array<{
        date: string;
        week: string;
        description: string;
      }>;
      makeupDays?: Array<{
        date: string;
        week: string;
        description: string;
      }>;
    } = {
      count: holidaysOnly.length,
      holidays: holidaysOnly.map((h) => ({
        date: formatDateString(h.date),
        week: h.week,
        description: h.description || '週末',
      })),
    };

    if (makeupDays.length > 0) {
      result.makeupDays = makeupDays.map((h) => ({
        date: formatDateString(h.date),
        week: h.week,
        description: h.description,
      }));
    }

    return JSON.stringify(result, null, 2);
  }

  if (format === 'table') {
    if (holidaysOnly.length === 0 && makeupDays.length === 0) {
      return '查詢範圍內無假期';
    }

    const table = new Table({
      head: ['日期', '星期', '說明'],
    });

    for (const h of holidaysOnly) {
      table.push([formatDateString(h.date), h.week, h.description || '週末']);
    }

    let output = table.toString();

    if (makeupDays.length > 0) {
      output += '\n\n影響此範圍的補班日：';
      const makeupTable = new Table({
        head: ['日期', '星期', '說明'],
      });
      for (const h of makeupDays) {
        makeupTable.push([formatDateString(h.date), h.week, h.description]);
      }
      output += '\n' + makeupTable.toString();
    }

    return output;
  }

  // simple format
  if (holidaysOnly.length === 0) {
    let output = '查詢範圍內無假期';
    if (makeupDays.length > 0) {
      output += `\n\n影響此範圍的補班日 (${makeupDays.length} 個)：`;
      for (const h of makeupDays) {
        output += `\n- ${formatDateString(h.date)} (${h.week}) ${h.description}`;
      }
    }
    return output;
  }

  let output = `假期清單 (共 ${holidaysOnly.length} 個假期)：`;
  for (const h of holidaysOnly) {
    const desc = h.description || '週末';
    output += `\n- ${formatDateString(h.date)} (${h.week}) ${desc}`;
  }

  if (makeupDays.length > 0) {
    output += `\n\n影響此範圍的補班日 (${makeupDays.length} 個)：`;
    for (const h of makeupDays) {
      output += `\n- ${formatDateString(h.date)} (${h.week}) ${h.description}`;
    }
  }

  return output;
}

/**
 * 建立 range 命令
 */
export function createRangeCommand(): Command {
  const cmd = new Command('range')
    .description('查詢指定日期範圍內的假期')
    .argument('<start>', '開始日期')
    .argument('<end>', '結束日期')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .option('--include-workdays', '包含影響該範圍的補班日資訊')
    .action(
      async (
        start: string,
        end: string,
        options: { format: OutputFormat; includeWorkdays?: boolean }
      ) => {
        const service = getHolidayService();
        const holidays = await service.getHolidaysInRange(start, end, { holidaysOnly: true });

        let makeupDays: Holiday[] = [];
        if (options.includeWorkdays) {
          makeupDays = await service.getRelatedMakeupDays(start, end);
        }

        const output = formatRangeResult(holidays, makeupDays, options.format);
        console.log(output);
      }
    );

  return cmd;
}
