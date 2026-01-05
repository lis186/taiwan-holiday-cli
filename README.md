# taiwan-holiday-cli

[![CI](https://github.com/lis186/taiwan-holiday-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/lis186/taiwan-holiday-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/taiwan-holiday-cli.svg)](https://www.npmjs.com/package/taiwan-holiday-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

台灣國定假日查詢 CLI 工具 - 快速查詢台灣假期、計算工作天數

## Features

- 查詢指定日期是否為假期
- 支援自然語言日期輸入（today, tomorrow, next monday...）
- 查詢日期範圍內的假期
- 計算工作天數統計
- 支援多種輸出格式（simple, json, table）
- 內建快取機制，離線可用
- Shell 自動補全支援

## Installation

```bash
# npm
npm install -g taiwan-holiday-cli

# or run directly with npx
npx taiwan-holiday-cli today
```

## Quick Start

```bash
# 查詢今天是否為假期
holiday today

# 查詢指定日期
holiday 2026-10-10

# 查詢明天
holiday tomorrow

# 查詢下週一
holiday "next monday"
```

## Commands

### 日期查詢

```bash
# 查詢指定日期
holiday check <date>
holiday <date>              # 簡寫

# 查詢今天
holiday today

# 查詢接下來的假期
holiday next [count]        # 預設顯示 5 個
```

### 範圍查詢

```bash
# 查詢日期範圍內的假期
holiday range <start> <end>
holiday range 2026-01-01 2026-01-31

# 查詢指定月份
holiday month [year-month]
holiday month 2026-10
```

### 統計功能

```bash
# 年度假期統計
holiday stats <year>
holiday stats 2026

# 月份假期統計
holiday stats <year> <month>
holiday stats 2026 10

# 計算工作天數
holiday workdays <year-month>
holiday workdays 2026-01

# 計算兩日期間的天數
holiday between <start> <end>
holiday between 2026-01-01 2026-01-31
```

### 其他命令

```bash
# 列出指定年份所有假期
holiday list <year>

# 顯示支援的年份範圍
holiday years

# 快取管理
holiday cache status        # 查看快取狀態
holiday cache clear         # 清除快取

# 設定管理
holiday config list         # 列出設定
holiday config get <key>    # 取得設定值
holiday config set <key> <value>  # 設定值

# 系統健康檢查
holiday health

# Shell 自動補全
holiday completion bash     # Bash
holiday completion zsh      # Zsh
holiday completion fish     # Fish
```

## Output Formats

所有查詢命令都支援 `-f, --format` 選項：

```bash
# Simple 格式（預設）
holiday today
# 2026-01-05 (一) 是假期：週末

# JSON 格式
holiday today -f json
# {
#   "date": "2026-01-05",
#   "week": "一",
#   "isHoliday": true,
#   "description": ""
# }

# Table 格式
holiday today -f table
# ┌────────────┬──────┬──────────┬──────┐
# │ 日期       │ 星期 │ 是否假期 │ 說明 │
# ├────────────┼──────┼──────────┼──────┤
# │ 2026-01-05 │ 一   │ ✓        │ 週末 │
# └────────────┴──────┴──────────┴──────┘
```

設定預設格式：

```bash
holiday config set format json
```

## Date Formats

支援多種日期格式：

| 格式 | 範例 |
|------|------|
| ISO | `2026-01-01` |
| 斜線 | `2026/01/01` |
| 無分隔 | `20260101` |
| 相對日期 | `today`, `tomorrow`, `yesterday` |
| 自然語言 | `next monday`, `next friday` |

## Supported Years

目前支援 2017-2026 年的台灣假期資料。

```bash
holiday years
# 支援的年份範圍：2017-2026 (共 10 年)
```

## Global Options

```bash
--no-cache    # 強制從 API 重新獲取，不使用快取
--help        # 顯示說明
--version     # 顯示版本
```

## Shell Completion

### Bash

```bash
holiday completion bash >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
holiday completion zsh >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
holiday completion fish > ~/.config/fish/completions/holiday.fish
```

## Data Source

假期資料來自 [TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar) 專案，感謝 [@ruyut](https://github.com/ruyut) 的維護。

## Development

```bash
# Clone
git clone https://github.com/lis186/taiwan-holiday-cli.git
cd taiwan-holiday-cli

# Install dependencies
npm install

# Development
npm run dev -- today

# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

歡迎貢獻！請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)。
