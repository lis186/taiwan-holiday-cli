import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import { formatCheckResult, type OutputFormat } from './check.js';

/**
 * 建立 today 命令
 */
export function createTodayCommand(): Command {
  const cmd = new Command('today')
    .description('查詢今天是否為假期')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const result = await service.checkHoliday('today');
      const output = formatCheckResult(result, options.format, 'today');
      console.log(output);
    });

  return cmd;
}
