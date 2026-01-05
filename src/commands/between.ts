import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import type { WorkdaysStats } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 between 命令結果
 */
export function formatBetweenResult(
  stats: WorkdaysStats,
  startDate: string,
  endDate: string,
  format: OutputFormat
): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        startDate,
        endDate,
        ...stats,
      },
      null,
      2
    );
  }

  if (format === 'table') {
    const table = new Table({
      head: ['項目', '天數'],
    });

    table.push(['總天數', stats.totalDays.toString()]);
    table.push(['工作天', stats.workdays.toString()]);
    table.push(['假期', stats.holidays.toString()]);
    table.push(['補班日', stats.makeupWorkdays.toString()]);

    return `${startDate} 至 ${endDate} 工作天統計：\n${table.toString()}`;
  }

  // simple format
  let output = `${startDate} 至 ${endDate} 工作天統計：`;
  output += `\n- 總天數：${stats.totalDays} 天`;
  output += `\n- 工作天：${stats.workdays} 天`;
  output += `\n- 假期：${stats.holidays} 天`;
  output += `\n- 補班日：${stats.makeupWorkdays} 天`;

  return output;
}

/**
 * 建立 between 命令
 */
export function createBetweenCommand(): Command {
  const cmd = new Command('between')
    .description('計算兩日期間的工作天數')
    .argument('<start>', '開始日期')
    .argument('<end>', '結束日期')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .option('-w, --workdays', '只顯示工作天數')
    .action(async (start: string, end: string, options: { format: OutputFormat; workdays?: boolean }) => {
      const service = getHolidayService();
      const stats = await service.getWorkdaysBetween(start, end);

      if (options.workdays) {
        console.log(stats.workdays.toString());
        return;
      }

      const output = formatBetweenResult(stats, start, end, options.format);
      console.log(output);
    });

  return cmd;
}
