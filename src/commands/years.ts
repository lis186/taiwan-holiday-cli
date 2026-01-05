import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化 years 命令結果
 */
export function formatYearsResult(years: number[], format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify({ years, count: years.length }, null, 2);
  }

  // simple format
  const first = years[0];
  const last = years[years.length - 1];
  return `支援的年份範圍：${first}-${last} (共 ${years.length} 年)`;
}

/**
 * 建立 years 命令
 */
export function createYearsCommand(): Command {
  const cmd = new Command('years')
    .description('列出支援的年份範圍')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .action((options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const years = service.getSupportedYears();
      const output = formatYearsResult(years, options.format);
      console.log(output);
    });

  return cmd;
}
