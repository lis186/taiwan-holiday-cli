# taiwan-holiday-cli

[![CI](https://github.com/lis186/taiwan-holiday-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/lis186/taiwan-holiday-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/taiwan-holiday-cli.svg)](https://www.npmjs.com/package/taiwan-holiday-cli)
[![npm downloads](https://img.shields.io/npm/dm/taiwan-holiday-cli.svg)](https://www.npmjs.com/package/taiwan-holiday-cli)
[![node](https://img.shields.io/node/v/taiwan-holiday-cli.svg)](https://www.npmjs.com/package/taiwan-holiday-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

台灣國定假日查詢 CLI 工具 - 快速查詢台灣假期、計算工作天數

> 🎉 現已發佈於 [npm](https://www.npmjs.com/package/taiwan-holiday-cli)，可直接安裝使用！

## Features

- 查詢指定日期是否為假期
- 支援自然語言日期輸入（today, tomorrow, next monday...）
- 查詢日期範圍內的假期
- 計算工作天數統計
- 查詢颱風假（天然災害停止上班上課）：今天、明天看 DGPA 即時頁，其他日期看歸檔（2001-07-30 起）
- 支援多種輸出格式（simple, json, table）
- 內建快取機制，離線可用
- Shell 自動補全支援

## Requirements

- Node.js >= 20.0.0

## Installation

```bash
# 全域安裝
npm install -g taiwan-holiday-cli

# 或使用 npx 直接執行（無需安裝）
npx taiwan-holiday-cli today
```

驗證安裝：

```bash
holiday --version
# 2.0.0
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
holiday next                # 顯示下一個假期
holiday next 5              # 顯示接下來 5 個假期
holiday next 5 --skip-weekends  # 跳過週末，只顯示特殊假日
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

### 颱風假查詢

```bash
holiday typhoon                       # 今天（臺灣時間），讀 DGPA 即時頁
holiday typhoon tomorrow -c 臺北市     # 明天，讀即時頁上今天公告的「明天」
holiday typhoon 2024-10-31 -c 台北市   # 其他日期讀歸檔；台／臺視為相同
holiday typhoon 2024-10-31 -f json    # 給腳本或 LLM 使用
```

**資料來源依日期而定：** 今天、明天直接讀 [DGPA 天然災害停止上班及上課情形](https://www.dgpa.gov.tw/typh/daily/nds.html)
即時頁（每次查詢一個請求），結果標 `reason: "live"`；即時頁抓不到或格式不認得時，退回歸檔結果並註明。
其他日期讀 [TaiwanTyphoonDays](https://github.com/lis186/TaiwanTyphoonDays) 歸檔。

第一行就是答案，並標明能不能信：

```
2024-10-31 臺北市：停止上班（全天）、停止上課（全天）〔已定案〕
```

JSON 的頂層 `work`／`school` 是結論，`status` 為下列之一：

| `status` | 意義 |
|---|---|
| `stopped` | 全縣市停止，時段見 `period`／`from` |
| `conditional` | 只有部分子區域、部分學制或部分時段停止，要看 `cities[].rows` 判斷是否適用。未指定縣市時，只要有任何停止就是這個值 |
| `normal` | 有公告且照常；即時頁目前沒有該縣市的公告（`reason: "live"`，之後仍可能公告）；或事件後超過 21 天仍無任何公告（`basis: "no_announcement"`） |
| `unknown` | 無法判斷，**不可當成照常**。例如記錄無法解析、歸檔還沒收錄、即時頁還沒有明天的公告 |

`basis` 說明依據：`own`（當日公告）、`forecast`（前一天公告的「明天」預告，可能被推翻）、`no_announcement`。

`reason` 說明結果為何還可能改變，`null` 表示已定案：`live`（即時頁，當天仍可能更新）、`pending`（距今 21 天內，歸檔可能還沒收錄）、`source_not_ready`（當年度資料檔尚未產生）。

注意事項：

- **昨天到 21 天前是空窗。** 即時頁只有今天與明天，歸檔通常在事件後 1～5 天才收錄（最久 19 天），所以這段期間沒有紀錄時回 `unknown`。
- 即時頁上沒列出的縣市，回「目前沒有公告」的 `normal`，但仍標 `reason: "live"`：之後仍可能公告。明天的公告通常在前一天晚上發布。
- 即時頁格式不是官方承諾；請以各縣市政府公告為準。
- 縣市名保留當時名稱（如改制前的臺北縣），不對應現行行政區。
- 無法結構化的記錄會保留原文（`rows[].raw`），請以原文為準。

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
# 2026-01-04 (日) 是假期：週末

# JSON 格式
holiday today -f json
# {
#   "date": "2026-01-04",
#   "week": "日",
#   "isHoliday": true,
#   "description": ""
# }

# Table 格式
holiday today -f table
# ┌────────────┬──────┬──────────┬──────┐
# │ 日期       │ 星期 │ 是否假期 │ 說明 │
# ├────────────┼──────┼──────────┼──────┤
# │ 2026-01-04 │ 日   │ ✓        │ 週末 │
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

從 2017 年起（上游資料的起點）。**上限不寫死在套件裡** —— 可查的年份由上游
[TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar) 有沒有該年度資料決定，
所以上游一發布新年度，不需要更新本套件就能查詢。

```bash
holiday years
# 支援的年份範圍：2017-2027 (共 11 年)   ← 執行時探測得到的結果
```

若查詢上游尚未發布的年度，會明確告知，而不是謊稱不支援：

```bash
holiday check 2028-01-01
# 資料錯誤: 上游尚未發布 2028 年資料。中華民國政府行政機關辦公日曆表通常在前一年年中公布。
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

## 搭配 Claude / LLM 使用

`-f json` 輸出格式穩定，可直接讓 Claude 透過 shell 呼叫。
打包好的 Claude Skill：[`taiwan-holiday-skills`](https://github.com/lis186/taiwan-holiday-skills)。
MCP server 版本（Claude Desktop / Cursor 等 MCP client 適用）：[`taiwan-holiday-mcp`](https://github.com/lis186/taiwan-holiday-mcp)。

## Data Source

假期資料來自 [TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar) 專案，感謝 [@ruyut](https://github.com/ruyut) 的維護。

颱風假資料來自 [TaiwanTyphoonDays](https://github.com/lis186/TaiwanTyphoonDays)，由行政院人事行政總處公告整理而成，每日自動更新。

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
