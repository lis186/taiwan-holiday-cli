import { Command } from 'commander';

const COMMANDS = [
  'check',
  'today',
  'range',
  'stats',
  'list',
  'years',
  'next',
  'month',
  'workdays',
  'between',
  'cache',
  'config',
  'health',
  'completion',
  'help',
];

/**
 * 產生 Bash 自動補全腳本
 */
export function generateBashCompletion(): string {
  return `# Bash completion for holiday CLI
_holiday_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="${COMMANDS.join(' ')}"

  case "\${prev}" in
    holiday)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    check|range|between)
      COMPREPLY=( $(compgen -W "today tomorrow yesterday" -- "\${cur}") )
      return 0
      ;;
    stats|list|workdays)
      local years="2017 2018 2019 2020 2021 2022 2023 2024 2025 2026"
      COMPREPLY=( $(compgen -W "\${years}" -- "\${cur}") )
      return 0
      ;;
    cache)
      COMPREPLY=( $(compgen -W "status clear" -- "\${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "list get set" -- "\${cur}") )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
    -f|--format)
      COMPREPLY=( $(compgen -W "simple json table" -- "\${cur}") )
      return 0
      ;;
  esac

  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "-f --format -h --help" -- "\${cur}") )
    return 0
  fi
}

complete -F _holiday_completions holiday
`;
}

/**
 * 產生 Zsh 自動補全腳本
 */
export function generateZshCompletion(): string {
  return `#compdef holiday

_holiday() {
  local -a commands
  commands=(
    'check:查詢指定日期是否為假期'
    'today:查詢今天是否為假期'
    'range:查詢指定日期範圍內的假期'
    'stats:查詢假期統計資訊'
    'list:列出指定年份的所有假期'
    'years:列出支援的年份範圍'
    'next:查詢下一個假期'
    'month:列出指定月份的假期'
    'workdays:計算指定月份的工作天數'
    'between:計算兩日期間的工作天數'
    'cache:管理快取'
    'config:設定管理'
    'health:系統健康檢查'
    'completion:產生 shell 自動補全腳本'
    'help:顯示說明'
  )

  _arguments -C \\
    '-f[輸出格式]:format:(simple json table)' \\
    '--format[輸出格式]:format:(simple json table)' \\
    '-h[顯示說明]' \\
    '--help[顯示說明]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case "\$state" in
    command)
      _describe -t commands 'holiday commands' commands
      ;;
    args)
      case "\$words[1]" in
        stats|list|workdays)
          _values 'year' 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026
          ;;
        cache)
          _values 'action' 'status' 'clear'
          ;;
        config)
          _values 'action' 'list' 'get' 'set'
          ;;
        completion)
          _values 'shell' 'bash' 'zsh' 'fish'
          ;;
      esac
      ;;
  esac
}

_holiday "\$@"
`;
}

/**
 * 產生 Fish 自動補全腳本
 */
export function generateFishCompletion(): string {
  const lines = [
    '# Fish completion for holiday CLI',
    '',
    '# Disable file completions for commands that don\'t need them',
    'complete -c holiday -f',
    '',
    '# Commands',
    'complete -c holiday -n "__fish_use_subcommand" -a "check" -d "查詢指定日期是否為假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "today" -d "查詢今天是否為假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "range" -d "查詢指定日期範圍內的假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "stats" -d "查詢假期統計資訊"',
    'complete -c holiday -n "__fish_use_subcommand" -a "list" -d "列出指定年份的所有假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "years" -d "列出支援的年份範圍"',
    'complete -c holiday -n "__fish_use_subcommand" -a "next" -d "查詢下一個假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "month" -d "列出指定月份的假期"',
    'complete -c holiday -n "__fish_use_subcommand" -a "workdays" -d "計算指定月份的工作天數"',
    'complete -c holiday -n "__fish_use_subcommand" -a "between" -d "計算兩日期間的工作天數"',
    'complete -c holiday -n "__fish_use_subcommand" -a "cache" -d "管理快取"',
    'complete -c holiday -n "__fish_use_subcommand" -a "config" -d "設定管理"',
    'complete -c holiday -n "__fish_use_subcommand" -a "health" -d "系統健康檢查"',
    'complete -c holiday -n "__fish_use_subcommand" -a "completion" -d "產生 shell 自動補全腳本"',
    'complete -c holiday -n "__fish_use_subcommand" -a "help" -d "顯示說明"',
    '',
    '# Global options',
    'complete -c holiday -s f -l format -d "輸出格式" -a "simple json table"',
    'complete -c holiday -s h -l help -d "顯示說明"',
    '',
    '# cache subcommands',
    'complete -c holiday -n "__fish_seen_subcommand_from cache" -a "status" -d "顯示快取狀態"',
    'complete -c holiday -n "__fish_seen_subcommand_from cache" -a "clear" -d "清除所有快取"',
    '',
    '# config subcommands',
    'complete -c holiday -n "__fish_seen_subcommand_from config" -a "list" -d "列出所有設定"',
    'complete -c holiday -n "__fish_seen_subcommand_from config" -a "get" -d "取得設定值"',
    'complete -c holiday -n "__fish_seen_subcommand_from config" -a "set" -d "設定值"',
    '',
    '# completion subcommands',
    'complete -c holiday -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"',
    '',
    '# Year completions for stats, list, workdays',
    'complete -c holiday -n "__fish_seen_subcommand_from stats list workdays" -a "2017 2018 2019 2020 2021 2022 2023 2024 2025 2026"',
  ];

  return lines.join('\n');
}

type ShellType = 'bash' | 'zsh' | 'fish';

/**
 * 建立 completion 命令
 */
export function createCompletionCommand(): Command {
  const cmd = new Command('completion')
    .description('產生 shell 自動補全腳本')
    .argument('<shell>', 'Shell 類型 (bash | zsh | fish)')
    .action((shell: string) => {
      const validShells: ShellType[] = ['bash', 'zsh', 'fish'];

      if (!validShells.includes(shell as ShellType)) {
        console.error(`錯誤：不支援的 shell 類型 "${shell}"，可用選項：${validShells.join(', ')}`);
        return;
      }

      let script: string;

      switch (shell as ShellType) {
        case 'bash':
          script = generateBashCompletion();
          break;
        case 'zsh':
          script = generateZshCompletion();
          break;
        case 'fish':
          script = generateFishCompletion();
          break;
      }

      console.log(script);
    });

  return cmd;
}
