# Taiwan Holiday CLI - Product Requirements Document

## 1. Overview

獨立的台灣假期查詢命令列工具，提供完整的假期查詢、統計與工作天計算功能。

### 1.1 專案資訊

| 項目 | 內容 |
|------|------|
| 專案名稱 | taiwan-holiday-cli |
| CLI 命令 | `holiday` |
| 資料來源 | [TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar) |
| 支援年份 | 2017-2026 |
| 版本 | 1.0.0（獨立 SemVer） |
| 授權 | MIT |

### 1.2 Tech Stack

| 類別 | 技術 |
|------|------|
| 語言 | TypeScript |
| Runtime | Node.js >= 20.0.0 |
| CLI Framework | Commander.js |
| HTTP Client | ofetch |
| 表格輸出 | cli-table3 |
| 配置管理 | conf |
| 環境變數 | dotenv |
| 測試框架 | vitest |
| 建置工具 | tsc / bun (binary) |
| 開發工具 | tsx |

### 1.3 相容性矩陣

| 項目 | 支援範圍 |
|------|----------|
| Node.js | 20, 22 |
| macOS | arm64, x64 |
| Linux | arm64, x64 |
| Windows | x64 |

---

## 2. 功能規格

### 2.1 Commands 總覽

| 命令 | 說明 |
|------|------|
| `holiday [date]` | 預設命令，等同 `holiday check <date>` |
| `holiday check <date>` | 檢查指定日期是否為假期 |
| `holiday range <start> <end>` | 查詢日期範圍內的假期 |
| `holiday stats <year> [month]` | 查詢假期統計資訊 |
| `holiday list <year>` | 列出指定年份所有假期 |
| `holiday years` | 列出支援的年份範圍 |
| `holiday today` | 查詢今天是否為假期 |
| `holiday next [count]` | 查詢接下來的假期 |
| `holiday month [year-month]` | 查詢指定月份的假期 |
| `holiday workdays <year-month>` | 計算指定月份的工作天數 |
| `holiday between <start> <end>` | 計算兩日期間的天數統計 |
| `holiday cache <action>` | 快取管理 |
| `holiday config <action>` | 設定管理 |
| `holiday health` | 系統健康檢查 |
| `holiday completion <shell>` | 產生 shell 自動補全腳本 |

---

### 2.2 命令詳細規格

#### 2.2.1 `holiday [date]` (預設命令)

直接輸入日期即可查詢，等同 `holiday check`。

```bash
$ holiday 2025-10-10
2025-10-10 (五) 是假期：國慶日

$ holiday tomorrow
2025-01-06 (一) 不是假期，是一般工作日
```

---

#### 2.2.2 `holiday check <date>`

檢查指定日期是否為台灣假期。

**參數：**
- `<date>` (必填): 日期，支援多種格式（見 2.3 日期格式）

**選項：**
- `-f, --format <format>`: 輸出格式 (json | table | simple)，預設 `simple`

**輸出範例：**

```bash
# Simple 格式
$ holiday check 2025-10-10
2025-10-10 (五) 是假期：國慶日

$ holiday check 2025-10-08
2025-10-08 (三) 不是假期，是一般工作日

# JSON 格式
$ holiday check 2025-10-10 -f json
{
  "date": "2025-10-10",
  "normalizedDate": "20251010",
  "week": "五",
  "isHoliday": true,
  "description": "國慶日"
}

# Table 格式
$ holiday check 2025-10-10 -f table
┌────────────┬──────┬──────────┬────────────┐
│ 日期       │ 星期 │ 是否假期 │ 說明       │
├────────────┼──────┼──────────┼────────────┤
│ 2025-10-10 │ 五   │ ✓        │ 國慶日     │
└────────────┴──────┴──────────┴────────────┘
```

---

#### 2.2.3 `holiday range <start> <end>`

查詢指定日期範圍內的所有假期。

**參數：**
- `<start>` (必填): 開始日期
- `<end>` (必填): 結束日期

**選項：**
- `-f, --format <format>`: 輸出格式 (json | table | simple)
- `--include-workdays`: 包含影響該範圍的補班日資訊（可能顯示範圍外的補班日）

**輸出範例：**

```bash
$ holiday range 2025-10-01 2025-10-31
2025年10月假期清單 (共 5 個假期)：
- 2025-10-04 (六) 週末
- 2025-10-05 (日) 週末
- 2025-10-10 (五) 國慶日
- 2025-10-11 (六) 週末
- 2025-10-12 (日) 週末

$ holiday range 2025-10-01 2025-10-31 --include-workdays
2025年10月假期清單 (共 5 個假期，1 個補班日)：

假期：
- 2025-10-04 (六) 週末
- 2025-10-05 (日) 週末
- 2025-10-10 (五) 國慶日
- 2025-10-11 (六) 週末
- 2025-10-12 (日) 週末

影響此範圍的補班日：
- 2025-09-27 (六) 補行上班（為 10/10 國慶連假調整）
```

**跨年度查詢：** 自動並發請求多年度資料並快取。

---

#### 2.2.4 `holiday stats <year> [month]`

查詢假期統計資訊。

**參數：**
- `<year>` (必填): 年份 (2017-2026)
- `[month]` (可選): 月份 (1-12)

**選項：**
- `-f, --format <format>`: 輸出格式

**輸出範例：**

```bash
$ holiday stats 2025
2025 年假期統計：
  總假期天數：115 天
  國定假日：113 天
  補假天數：2 天
  調整放假：0 天
  補班天數：2 天

假期類型分布：
  春節：9 天
  國慶日：3 天
  清明節：4 天
  ...

$ holiday stats 2025 10
2025 年 10 月假期統計：
  總假期天數：9 天
  國定假日：8 天
  補假天數：1 天
```

---

#### 2.2.5 `holiday list <year>`

列出指定年份的所有假期。

**參數：**
- `<year>` (必填): 年份 (2017-2026)

**選項：**
- `-f, --format <format>`: 輸出格式
- `--holidays-only`: 只顯示假期（排除一般日期）
- `--group-by <type>`: 分組方式 (month | type)

**輸出範例：**

```bash
$ holiday list 2025 --holidays-only --group-by month
2025 年假期清單：

一月 (14 個假期)：
  2025-01-01 (三) 開國紀念日
  2025-01-04 (六) 週末
  ...

二月 (12 個假期)：
  ...
```

---

#### 2.2.6 `holiday years`

列出支援查詢的年份範圍。

**輸出範例：**

```bash
$ holiday years
支援的年份範圍：2017-2026

可用年份：
  2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026

資料來源：TaiwanCalendar
```

---

#### 2.2.7 `holiday today`

查詢今天是否為假期（`check` 的快捷方式）。

**輸出範例：**

```bash
$ holiday today
2025-01-05 (日) 是假期：週末
```

---

#### 2.2.8 `holiday next [count]`

查詢接下來的假期。

**參數：**
- `[count]` (可選): 要顯示的假期數量，預設 5

**選項：**
- `--skip-weekends`: 跳過一般週末，只顯示特殊假日

**輸出範例：**

```bash
$ holiday next 3
接下來的 3 個假期：
  2025-01-11 (六) 週末 - 6 天後
  2025-01-12 (日) 週末 - 7 天後
  2025-01-18 (六) 週末 - 13 天後

$ holiday next 3 --skip-weekends
接下來的 3 個特殊假日：
  2025-01-27 (一) 春節 - 22 天後
  2025-01-28 (二) 春節 - 23 天後
  2025-01-29 (三) 春節 - 24 天後
```

**邊界條件處理：** 當查詢超出支援年份範圍時，顯示可用資料並提示警告。

```bash
# 假設在 2026 年 12 月執行
$ holiday next 5
接下來的 2 個假期：
  2026-12-25 (五) 行憲紀念日
  2026-12-26 (六) 週末
⚠ 已達支援年份上限 (2026)，僅顯示 2 筆
```

---

#### 2.2.9 `holiday month [year-month]`

查詢指定月份的假期（預設當月）。

**參數：**
- `[year-month]` (可選): 年月，格式 `YYYY-MM`，預設當月

**輸出範例：**

```bash
$ holiday month
2025 年 1 月假期：
  2025-01-01 (三) 開國紀念日
  2025-01-04 (六) 週末
  ...
共 14 個假期

$ holiday month 2025-10
2025 年 10 月假期：
  ...
```

---

#### 2.2.10 `holiday workdays <year-month>`

計算指定月份的工作天數。

**參數：**
- `<year-month>` (必填): 年月，格式 `YYYY-MM`

**選項：**
- `-f, --format <format>`: 輸出格式

**輸出範例：**

```bash
$ holiday workdays 2025-10
2025 年 10 月工作天統計：
  總天數：31 天
  工作天：22 天
  假期：9 天
  補班日：0 天
```

---

#### 2.2.11 `holiday between <start> <end>`

計算兩日期間的天數統計。

**參數：**
- `<start>` (必填): 開始日期
- `<end>` (必填): 結束日期

**選項：**
- `-f, --format <format>`: 輸出格式
- `--workdays`: 只顯示工作天數

**輸出範例：**

```bash
$ holiday between 2025-01-01 2025-01-31
2025-01-01 到 2025-01-31 統計：
  總天數：31 天
  工作天：17 天
  假期：14 天

$ holiday between 2025-01-01 2025-01-31 --workdays
17
```

---

#### 2.2.12 `holiday cache <action>`

快取管理。

**子命令：**
- `holiday cache status`: 顯示快取狀態
- `holiday cache clear`: 清除所有快取

**輸出範例：**

```bash
$ holiday cache status
快取狀態：
  位置：~/.config/holiday/cache
  已快取年份：2024, 2025
  快取大小：45 KB
  TTL：1 小時

$ holiday cache clear
已清除所有快取
```

---

#### 2.2.13 `holiday config <action>`

設定管理。

**子命令：**
- `holiday config list`: 列出所有設定
- `holiday config get <key>`: 取得設定值
- `holiday config set <key> <value>`: 設定值

**可設定項目：**
- `format`: 預設輸出格式 (simple | json | table)

**輸出範例：**

```bash
$ holiday config list
目前設定：
  format: simple

$ holiday config set format table
已設定 format = table

$ holiday config get format
table
```

---

#### 2.2.14 `holiday health`

系統健康檢查。

**輸出範例：**

```bash
$ holiday health
系統健康狀態：正常 ✓

元件狀態：
  ✓ 快取可用
  ✓ 外部 API：可連線

版本：1.0.0
快取 TTL：1 小時
```

---

#### 2.2.15 `holiday completion <shell>`

產生 shell 自動補全腳本。

**參數：**
- `<shell>`: shell 類型 (bash | zsh | fish)

**輸出範例：**

```bash
$ holiday completion bash >> ~/.bashrc
$ holiday completion zsh >> ~/.zshrc
$ holiday completion fish >> ~/.config/fish/completions/holiday.fish
```

---

### 2.3 日期格式支援

#### 標準格式

| 格式 | 範例 | 說明 |
|------|------|------|
| YYYY-MM-DD | 2025-10-10 | ISO 8601 格式 |
| YYYYMMDD | 20251010 | 緊湊格式 |
| YYYY/MM/DD | 2025/10/10 | 斜線分隔 |

#### 相對日期

| 格式 | 範例 | 說明 |
|------|------|------|
| today | `holiday today` | 今天 |
| tomorrow | `holiday check tomorrow` | 明天 |
| yesterday | `holiday check yesterday` | 昨天 |
| next {weekday} | `holiday check next friday` | 下週五 |
| {n}d | `holiday range today 7d` | 未來 7 天 |
| {n}w | `holiday range today 2w` | 未來 2 週 |
| {n}m | `holiday range today 1m` | 未來 1 個月 |

---

### 2.4 全域選項

| 選項 | 說明 |
|------|------|
| `-f, --format <format>` | 輸出格式：json \| table \| simple (預設) |
| `-q, --quiet` | 安靜模式，只輸出必要資訊 |
| `-v, --verbose` | 詳細模式，顯示額外除錯資訊 |
| `--no-color` | 停用彩色輸出 |
| `--no-cache` | 強制從 API 重新獲取，不使用快取 |
| `--version` | 顯示版本號 |
| `--help` | 顯示說明 |

---

## 3. 資料結構

### 3.1 Holiday 介面

```typescript
interface Holiday {
  /** 日期，格式為 YYYYMMDD */
  date: string;
  /** 星期幾，中文表示（一、二、三、四、五、六、日） */
  week: string;
  /** 是否為假日 */
  isHoliday: boolean;
  /** 假日說明 */
  description: string;
}
```

### 3.2 HolidayStats 介面

```typescript
interface HolidayStats {
  /** 年份 */
  year: number;
  /** 總假日天數 */
  totalHolidays: number;
  /** 國定假日天數 */
  nationalHolidays: number;
  /** 補假天數 */
  compensatoryDays: number;
  /** 調整放假天數 */
  adjustedHolidays: number;
  /** 補班天數 */
  workingDays: number;
  /** 假日類型分布 */
  holidayTypes: Record<string, number>;
}
```

### 3.3 假日類型常數

```typescript
const HOLIDAY_TYPES = {
  NATIONAL: '國定假日',
  COMPENSATORY: '補假',
  ADJUSTED: '調整放假',
  WORKING: '補行上班',
  LUNAR_NEW_YEAR: '春節',
  TOMB_SWEEPING: '清明節',
  DRAGON_BOAT: '端午節',
  MID_AUTUMN: '中秋節',
  NATIONAL_DAY: '國慶日'
};
```

---

## 4. 技術架構

### 4.1 專案結構

```
taiwan-holiday-cli/
├── src/
│   ├── index.ts              # 入口點
│   ├── cli.ts                # CLI 設定
│   ├── commands/             # 命令實作
│   │   ├── check.ts
│   │   ├── range.ts
│   │   ├── stats.ts
│   │   ├── list.ts
│   │   ├── years.ts
│   │   ├── today.ts
│   │   ├── next.ts
│   │   ├── month.ts
│   │   ├── workdays.ts
│   │   ├── between.ts
│   │   ├── cache.ts
│   │   ├── config.ts
│   │   ├── health.ts
│   │   └── completion.ts
│   ├── services/             # 服務層
│   │   └── holiday-service.ts
│   ├── lib/                  # 共用程式庫
│   │   ├── output.ts         # 輸出格式化
│   │   ├── date-parser.ts    # 日期解析（含相對日期）
│   │   └── cache.ts          # 快取管理
│   ├── types/                # 型別定義
│   │   └── holiday.ts
│   └── utils/                # 工具函數
│       ├── format.ts
│       └── color.ts
├── tests/                    # 測試
│   ├── unit/                 # 單元測試
│   ├── integration/          # 整合測試
│   └── e2e/                  # E2E 測試
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 相依套件

```json
{
  "dependencies": {
    "commander": "^12.1.0",
    "cli-table3": "^0.6.5",
    "ofetch": "^1.4.1",
    "conf": "^13.0.1",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "tsx": "^4.21.0",
    "vitest": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8"
  }
}
```

### 4.3 快取策略

| 項目 | 設定 |
|------|------|
| 快取位置 | 使用 `conf` 套件管理 (`~/.config/holiday/`) |
| 快取 TTL | 1 小時（固定） |
| 快取 Key | `holidays_{year}` |
| 離線 fallback | 網路失敗時自動使用快取，並顯示警告 |
| 並發請求 | 跨年度查詢時並發請求，結果自動快取 |

**離線 fallback 範例：**

```bash
$ holiday check 2025-10-10
⚠ 網路無法連線，使用快取資料 (2025-01-05 12:30)
2025-10-10 (五) 是假期：國慶日
```

---

## 5. 輸出規範

### 5.1 stdout/stderr 分離

| 輸出類型 | 導向 |
|----------|------|
| 正常結果 | stdout |
| 錯誤訊息 | stderr |
| 警告訊息 | stderr |
| 除錯訊息 | stderr (需 `--verbose`) |

**範例：**

```bash
# 正常輸出 → stdout
$ holiday check 2025-10-10
2025-10-10 (五) 是假期：國慶日

# 錯誤輸出 → stderr，exit code 1
$ holiday check invalid
錯誤：無效的日期格式    # → stderr

# 可用於 pipe
$ holiday list 2025 -f json | jq '.holidays[0]'
```

### 5.2 輸出格式

#### Simple 格式（預設）

人類友善的簡潔輸出，適合終端機使用。

#### JSON 格式

結構化 JSON 輸出，適合程式處理和管道操作。

#### Table 格式

使用 cli-table3 的表格輸出，適合檢視多筆資料。

---

## 6. 錯誤處理

### 6.1 錯誤類型

| 錯誤類型 | 說明 | 退出碼 |
|----------|------|--------|
| INVALID_YEAR | 無效的年份 | 1 |
| INVALID_MONTH | 無效的月份 | 1 |
| INVALID_DATE | 無效的日期 | 1 |
| INVALID_DATE_FORMAT | 無效的日期格式 | 1 |
| NETWORK_ERROR | 網路錯誤 | 2 |
| API_ERROR | API 錯誤 | 2 |
| TIMEOUT_ERROR | 請求超時 | 2 |

### 6.2 錯誤訊息範例

```bash
$ holiday check 2030-01-01
錯誤：年份 2030 超出支援範圍 (2017-2026)    # → stderr, exit 1

$ holiday check invalid-date
錯誤：無效的日期格式，請使用 YYYY-MM-DD 或 YYYYMMDD    # → stderr, exit 1
```

---

## 7. 測試策略

### 7.1 測試範圍

| 類型 | 範圍 | 工具 |
|------|------|------|
| 單元測試 | 所有模組（date-parser, holiday-service, output 等） | vitest |
| 整合測試 | commands + services 整合 | vitest |
| E2E 測試 | 實際 CLI 執行與輸出驗證 | vitest |

### 7.2 覆蓋率目標

| 指標 | 目標 |
|------|------|
| Statements | >= 85% |
| Branches | >= 85% |
| Functions | >= 85% |
| Lines | >= 85% |

---

## 8. CI/CD

### 8.1 GitHub Actions Workflow

#### PR 檢查

```yaml
on: [pull_request]
jobs:
  test:
    - npm ci
    - npm run lint
    - npm run test
    - npm run test:coverage  # 檢查覆蓋率 >= 85%
```

#### 發布流程

```yaml
on:
  push:
    tags: ['v*']
jobs:
  publish:
    - npm publish  # 發布到 npm
  release:
    - 建置多平台 binary
    - 發布到 GitHub Release
```

### 8.2 多平台 Binary 建置

```bash
# macOS ARM64
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/holiday-macos-arm64

# macOS x64
bun build src/index.ts --compile --target=bun-darwin-x64 --outfile dist/holiday-macos-x64

# Linux x64
bun build src/index.ts --compile --target=bun-linux-x64 --outfile dist/holiday-linux-x64

# Linux ARM64
bun build src/index.ts --compile --target=bun-linux-arm64 --outfile dist/holiday-linux-arm64

# Windows x64
bun build src/index.ts --compile --target=bun-windows-x64 --outfile dist/holiday-windows-x64.exe
```

---

## 9. 功能對照表

### 原 MCP Server → CLI 對照

| MCP Server 功能 | CLI 命令 | 狀態 |
|-----------------|----------|------|
| `check_holiday` tool | `holiday check <date>` | ✅ |
| `get_holidays_in_range` tool | `holiday range <start> <end>` | ✅ |
| `get_holiday_stats` tool | `holiday stats <year> [month]` | ✅ |
| `taiwan-holidays://years` resource | `holiday years` | ✅ |
| `taiwan-holidays://holidays/{year}` resource | `holiday list <year>` | ✅ |
| `taiwan-holidays://stats/{year}` resource | `holiday stats <year>` | ✅ |
| `taiwan-holidays://health` resource | `holiday health` | ✅ |
| 快取機制 | 簡化固定 TTL 快取 | ✅ |
| 錯誤處理 | CLI 錯誤處理 | ✅ |
| 日期解析 | 日期解析模組（含相對日期） | ✅ |
| Circuit Breaker | ❌ 移除 | - |
| Request Throttler | ❌ 移除 | - |
| Smart Cache | ❌ 簡化為固定 TTL | - |

### CLI 專屬功能

| 功能 | 命令 | 狀態 |
|------|------|------|
| 預設命令 | `holiday <date>` = `holiday check <date>` | ✅ |
| 查詢今天 | `holiday today` | ✅ |
| 查詢下個假期 | `holiday next [count]` | ✅ |
| 查詢指定月份 | `holiday month [year-month]` | ✅ |
| 工作天計算 | `holiday workdays <year-month>` | ✅ |
| 區間統計 | `holiday between <start> <end>` | ✅ |
| 快取管理 | `holiday cache status/clear` | ✅ |
| 設定管理 | `holiday config list/get/set` | ✅ |
| 相對日期 | `tomorrow`, `next friday`, `2w` | ✅ |
| 離線 fallback | 自動使用快取 + 警告 | ✅ |
| Shell 自動補全 | `holiday completion` | ✅ |
| 多種輸出格式 | `-f, --format` | ✅ |
| 強制刷新 | `--no-cache` | ✅ |

---

## 10. 未來擴展

- [ ] 支援更多年份（需資料來源支援）
- [ ] 整合行事曆匯出 (iCal)
- [ ] 互動模式
