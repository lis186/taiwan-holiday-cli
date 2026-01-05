import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import type { WorkdaysStats } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 workdays 命令結果
 */
export function formatWorkdaysResult(
  stats: WorkdaysStats,
  year: number,
  month: number,
  format: OutputFormat
): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        year,
        month,
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

    return `${year}年${month}月工作天統計：\n${table.toString()}`;
  }

  // simple format
  let output = `${year}年${month}月工作天統計：`;
  output += `\n- 總天數：${stats.totalDays} 天`;
  output += `\n- 工作天：${stats.workdays} 天`;
  output += `\n- 假期：${stats.holidays} 天`;
  output += `\n- 補班日：${stats.makeupWorkdays} 天`;

  return output;
}

/**
 * 建立 workdays 命令
 */
export function createWorkdaysCommand(): Command {
  const cmd = new Command('workdays')
    .description('計算指定月份的工作天數')
    .argument('<year>', '年份 (2017-2026)')
    .argument('<month>', '月份 (1-12)')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (year: string, month: string, options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      const stats = await service.getWorkdaysStats(yearNum, monthNum);
      const output = formatWorkdaysResult(stats, yearNum, monthNum, options.format);
      console.log(output);
    });

  return cmd;
}
