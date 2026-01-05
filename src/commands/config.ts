import { Command } from 'commander';
import { getConfigService } from '../lib/config.js';
import type { OutputFormat } from './check.js';

/**
 * 格式化設定清單結果
 */
export function formatConfigList(
  config: Record<string, string>,
  format: OutputFormat
): string {
  if (format === 'json') {
    return JSON.stringify(config, null, 2);
  }

  // simple format
  const entries = Object.entries(config);
  if (entries.length === 0) {
    return '無設定項目';
  }

  const lines = ['目前設定：'];
  for (const [key, value] of entries) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join('\n');
}

/**
 * 建立 config 命令
 */
export function createConfigCommand(): Command {
  const cmd = new Command('config').description('設定管理');

  // list subcommand
  cmd
    .command('list')
    .description('列出所有設定')
    .option('-f, --format <format>', '輸出格式 (simple | json)', 'simple')
    .action((options: { format: OutputFormat }) => {
      const service = getConfigService();
      const config = service.list();
      const output = formatConfigList(config, options.format);
      console.log(output);
    });

  // get subcommand
  cmd
    .command('get')
    .description('取得設定值')
    .argument('<key>', '設定項目名稱')
    .action((key: string) => {
      const service = getConfigService();
      const value = service.get(key);
      if (value === undefined) {
        console.error(`錯誤：找不到設定項目 "${key}"`);
        return;
      }
      console.log(value);
    });

  // set subcommand
  cmd
    .command('set')
    .description('設定值')
    .argument('<key>', '設定項目名稱')
    .argument('<value>', '設定值')
    .action((key: string, value: string) => {
      const service = getConfigService();
      try {
        service.set(key, value);
        console.log(`已設定 ${key} = ${value}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`錯誤：${error.message}`);
        }
      }
    });

  return cmd;
}
