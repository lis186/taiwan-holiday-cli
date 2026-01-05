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
import { getHolidayService } from './services/holiday-service.js';
import { AppError, getExitCode, formatErrorMessage } from './lib/errors.js';
import { output } from './lib/output.js';

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
    // Commander.js exit override errors (help, version, etc.)
    if (error instanceof Error) {
      const errorName = (error as { code?: string }).code;
      if (errorName === 'commander.helpDisplayed' || errorName === 'commander.version') {
        return;
      }
      // Other Commander errors
      if (error.message.includes('exitOverride')) {
        return;
      }
    }

    // Handle application errors with unified error handling
    if (error instanceof AppError) {
      output.errorRaw(formatErrorMessage(error));
      process.exit(getExitCode(error));
    } else if (error instanceof Error) {
      output.error(error.message);
      process.exit(getExitCode(error));
    }

    throw error;
  }
}

main();
