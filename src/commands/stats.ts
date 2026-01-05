import { Command } from 'commander';
import Table from 'cli-table3';
import { getHolidayService } from '../services/holiday-service.js';
import type { HolidayStats } from '../types/holiday.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 stats 命令結果
 */
export function formatStatsResult(stats: HolidayStats, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(stats, null, 2);
  }

  if (format === 'table') {
    const table = new Table({
      head: ['項目', '數值'],
    });

    const period = stats.month ? `${stats.year}年${stats.month}月` : `${stats.year}年`;
    table.push(['統計期間', period]);
    table.push(['總假期天數', stats.totalHolidays.toString()]);
    table.push(['國定假日', stats.nationalHolidays.toString()]);
    table.push(['補假', stats.compensatoryDays.toString()]);
    table.push(['調整放假', stats.adjustedHolidays.toString()]);
    table.push(['補班日', stats.workingDays.toString()]);

    return table.toString();
  }

  // simple format
  const period = stats.month ? `${stats.year}年${stats.month}月` : `${stats.year}年`;
  let output = `${period}假期統計：`;
  output += `\n- 總假期天數：${stats.totalHolidays} 天`;
  output += `\n- 國定假日：${stats.nationalHolidays} 天`;
  output += `\n- 補假：${stats.compensatoryDays} 天`;
  output += `\n- 調整放假：${stats.adjustedHolidays} 天`;
  output += `\n- 補班日：${stats.workingDays} 天`;

  return output;
}

/**
 * 建立 stats 命令
 */
export function createStatsCommand(): Command {
  const cmd = new Command('stats')
    .description('查詢假期統計資訊')
    .argument('<year>', '年份 (2017-2026)')
    .argument('[month]', '月份 (1-12，可選)')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (year: string, month: string | undefined, options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const yearNum = parseInt(year, 10);
      const monthNum = month ? parseInt(month, 10) : undefined;

      const stats = await service.getHolidayStats(yearNum, monthNum);
      const output = formatStatsResult(stats, options.format);
      console.log(output);
    });

  return cmd;
}
