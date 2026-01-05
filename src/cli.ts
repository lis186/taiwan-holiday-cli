#!/usr/bin/env node
import { Command } from 'commander';
import { createCheckCommand } from './commands/check.js';
import { createTodayCommand } from './commands/today.js';
import { createRangeCommand } from './commands/range.js';
import { createStatsCommand } from './commands/stats.js';
import { createListCommand } from './commands/list.js';
import { createYearsCommand } from './commands/years.js';
import { createNextCommand } from './commands/next.js';
import { createMonthCommand } from './commands/month.js';
import { createWorkdaysCommand } from './commands/workdays.js';
import { createBetweenCommand } from './commands/between.js';
import { createCacheCommand } from './commands/cache.js';
import { createConfigCommand } from './commands/config.js';
import { createHealthCommand } from './commands/health.js';
import { createCompletionCommand } from './commands/completion.js';
import { HolidayServiceError, getHolidayService } from './services/holiday-service.js';
import { DateParseError } from './lib/date-parser.js';

const program = new Command();

program
  .name('holiday')
  .description('台灣國定假日查詢 CLI 工具')
  .version('1.0.0')
  .option('--no-cache', '強制從 API 重新獲取，不使用快取');

// Handle --no-cache global option
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.cache === false) {
    const service = getHolidayService();
    service.setBypassCache(true);
  }
});

// Add all commands
program.addCommand(createCheckCommand());
program.addCommand(createTodayCommand());
program.addCommand(createRangeCommand());
program.addCommand(createStatsCommand());
program.addCommand(createListCommand());
program.addCommand(createYearsCommand());
program.addCommand(createNextCommand());
program.addCommand(createMonthCommand());
program.addCommand(createWorkdaysCommand());
program.addCommand(createBetweenCommand());
program.addCommand(createCacheCommand());
program.addCommand(createConfigCommand());
program.addCommand(createHealthCommand());
program.addCommand(createCompletionCommand());


// Error handling
program.exitOverride();

// Preprocess argv: if first non-option arg is not a known command, insert 'check'
function preprocessArgv(): string[] {
  const argv = [...process.argv];
  const args = argv.slice(2);

  if (args.length > 0) {
    const firstArg = args[0];
    // Skip if starts with - (option), is a known command, or looks like a version
    if (!firstArg.startsWith('-') && !firstArg.startsWith('v')) {
      const knownCommands = ['check', 'today', 'range', 'stats', 'list', 'years', 'next', 'month', 'workdays', 'between', 'cache', 'config', 'health', 'completion', 'help'];
      // Check if it looks like a date (contains digits and possibly separators)
      const looksLikeDate = /^\d|^today|^tomorrow|^yesterday|^next/.test(firstArg.toLowerCase());
      if (!knownCommands.includes(firstArg) && looksLikeDate) {
        // Insert 'check' command
        argv.splice(2, 0, 'check');
      }
    }
  }

  return argv;
}

async function main() {
  try {
    await program.parseAsync(preprocessArgv());
  } catch (error) {
    if (error instanceof HolidayServiceError) {
      console.error(`錯誤: ${error.message}`);
      process.exit(1);
    } else if (error instanceof DateParseError) {
      console.error(`日期格式錯誤: ${error.message}`);
      process.exit(1);
    } else if (error instanceof Error) {
      // Commander.js exit override errors (help, version, etc.)
      const errorName = (error as { code?: string }).code;
      if (errorName === 'commander.helpDisplayed' || errorName === 'commander.version') {
        return;
      }
      // Other Commander errors
      if (error.message.includes('exitOverride')) {
        return;
      }
      console.error(`錯誤: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

main();
