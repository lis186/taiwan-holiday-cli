import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import type { CacheStatus } from '../lib/cache.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化快取狀態
 */
export function formatCacheStatus(status: CacheStatus, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(status, null, 2);
  }

  // simple format
  if (status.itemCount === 0) {
    return '快取狀態：無快取資料';
  }

  let output = '快取狀態：';
  output += `\n- 快取項目數：${status.itemCount}`;
  output += `\n- 已快取年份：${status.cachedYears.join(', ')}`;
  output += `\n- TTL：${Math.round(status.ttl / 60000)} 分鐘`;

  return output;
}

/**
 * 建立 cache 命令
 */
export function createCacheCommand(): Command {
  const cmd = new Command('cache').description('管理快取');

  cmd
    .command('status')
    .description('顯示快取狀態')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .action((options: { format: OutputFormat }) => {
      const service = getHolidayService();
      const status = service.getCacheStatus();
      const output = formatCacheStatus(status, options.format);
      console.log(output);
    });

  cmd
    .command('clear')
    .description('清除快取')
    .action(() => {
      const service = getHolidayService();
      service.clearCache();
      console.log('快取已清除');
    });

  return cmd;
}
