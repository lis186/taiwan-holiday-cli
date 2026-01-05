import { Command } from 'commander';
import { getHolidayService } from '../services/holiday-service.js';
import type { OutputFormat } from './check.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cache: {
    available: boolean;
    itemCount: number;
  };
  api: {
    reachable: boolean;
    latency?: number;
    error?: string;
  };
  version: string;
}

/**
 * 格式化 health 結果
 */
export function formatHealthResult(health: HealthStatus, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(health, null, 2);
  }

  // simple format
  const lines: string[] = [];

  const statusText =
    health.status === 'healthy' ? '正常 ✓' : health.status === 'degraded' ? '降級 ⚠' : '異常 ✗';

  lines.push(`系統健康狀態：${statusText}`);
  lines.push('');
  lines.push('元件狀態：');

  // Cache status
  const cacheIcon = health.cache.available ? '✓' : '✗';
  lines.push(`  ${cacheIcon} 快取可用 (${health.cache.itemCount} 筆資料)`);

  // API status
  const apiIcon = health.api.reachable ? '✓' : '✗';
  if (health.api.reachable) {
    lines.push(`  ${apiIcon} 外部 API：可連線 (${health.api.latency}ms)`);
  } else {
    lines.push(`  ${apiIcon} 外部 API：${health.api.error || '無法連線'}`);
  }

  lines.push('');
  lines.push(`版本：${health.version}`);

  return lines.join('\n');
}

/**
 * 建立 health 命令
 */
export function createHealthCommand(): Command {
  const cmd = new Command('health')
    .description('系統健康檢查')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .action(async (options: { format: OutputFormat }) => {
      const service = getHolidayService();

      // Check cache
      const cacheStatus = service.getCacheStatus();
      const cacheAvailable = true;
      const cacheItemCount = cacheStatus.itemCount;

      // Check API
      const apiHealth = await service.checkApiHealth();

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!apiHealth.reachable) {
        status = cacheItemCount > 0 ? 'degraded' : 'unhealthy';
      }

      const health: HealthStatus = {
        status,
        cache: {
          available: cacheAvailable,
          itemCount: cacheItemCount,
        },
        api: apiHealth,
        version: '1.0.0',
      };

      const output = formatHealthResult(health, options.format);
      console.log(output);
    });

  return cmd;
}
