# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-02

年份支援不再寫死在套件裡，並修正兩個長期存在的統計錯誤。

MAJOR 版號在 `taiwan-holiday-cli`、`taiwan-holiday-mcp`、`taiwan-holiday-skills`
三個專案間共享，代表「同一世代、互相搭配」；MINOR/PATCH 各自獨立。

### Breaking

- **移除公開匯出 `SUPPORTED_YEAR_RANGE`。** 改用 `MIN_SUPPORTED_YEAR` 與
  `getMaxQueryableYear()`。原本的 `end` 欄位是個謊 —— 它宣稱是「支援上限」，
  實際上只是打包當時的寫死值。
- **`HolidayStats.nationalHolidays` 的語意變更。** 過去把 `description` 為空的
  一般週末也算成國定假日，2026 年因此回報 114 個「國定假日」（實際具名的只有 16 個，
  另外 98 個是週末）。現在只計具名國定假日，週末移到新欄位 `weekends`。
- **`stats` 的 `holidayTypes` 數值變更**（見下方 Fixed），先前的數字在全部 11 年都是錯的。

### Added

- `weekends` 欄位與 `HOLIDAY_TYPES.WEEKEND` 分類。
- `scripts/upstream-canary.mjs` 與每月排程的 `upstream-canary` workflow：
  驗證上游資料完整性（筆數、首末日、無重複、無亂序），並在上游發布新年度時開 issue 通知。

### Fixed

- **年份上限不再寫死。** 收到年份就向上游探測，上游有資料就能查 ——
  上游發布新年度時**不需要更新本套件**。查詢上游尚未發布的年度會明確說明
  「上游尚未發布 N 年資料」，而不是謊稱不支援。
- **`holidayTypes` 重複計數。** 分類桶與具體假日名共用一個 map，當上游的
  `description` 剛好等於分類桶名稱時會被加兩次。影響 `補假`（10 個年度）與
  `調整放假`（2017–2023）—— 用真實上游資料驗證，舊邏輯在**全部 11 個年度都算錯**。
- **探測失敗不再被誤判為「該年份不存在」。** 只有 HTTP 404 代表上游沒有這一年；
  網路故障、超時、5xx 會明確報錯。先前斷網時會安靜回報一個較短的年份範圍
  並快取 24 小時 —— 一個看起來完全正常的錯誤答案。
- `health` 命令與 `--version` 現在都從 `package.json` 讀版本。先前
  `CLI_VERSION` 寫死 `1.0.1`、`health` 回報 `1.0.0`、package.json 是 `1.0.1`，三方不同步。

### Removed

- `src/services/year-service.ts` 及其測試（386 行死碼）：無任何呼叫端，
  且它請求的 jsDelivr 目錄 API 端點並不存在（實測連線失敗），
  但 14 個測試因為 mock 掉網路而全部通過 —— 一段有綠燈保護的死碼。

### Internal

- 補上缺失的 `eslint` devDependency 與 `eslint.config.js`（`npm run lint` 先前是 exit 127）。

## [1.0.1] - 2026-01-06

### Fixed

- `holiday next [count]` 現在正確支援 count 參數，可顯示多個假期
- 搜尋範圍限制在支援的年份內 (2017-2026)

### Added

- `holiday next` 新增 `--skip-weekends` 選項，跳過一般週末只顯示特殊假日

## [1.0.0] - 2025-01-05

### Added

- Initial release
- `holiday check <date>` - 查詢指定日期是否為假期
- `holiday today` - 查詢今天是否為假期
- `holiday range <start> <end>` - 查詢日期範圍內的假期
- `holiday stats <year> [month]` - 查詢假期統計資訊
- `holiday list <year>` - 列出指定年份所有假期
- `holiday years` - 列出支援的年份範圍
- `holiday next [count]` - 查詢接下來的假期
- `holiday month [year-month]` - 查詢指定月份的假期
- `holiday workdays <year-month>` - 計算指定月份的工作天數
- `holiday between <start> <end>` - 計算兩日期間的天數統計
- `holiday cache <action>` - 快取管理
- `holiday config <action>` - 設定管理
- `holiday health` - 系統健康檢查
- `holiday completion <shell>` - Shell 自動補全腳本產生
- 支援多種日期格式 (ISO, slash, compact, relative)
- 支援自然語言日期 (today, tomorrow, next monday)
- 支援多種輸出格式 (simple, json, table)
- 內建快取機制，支援離線使用
- 95%+ 測試覆蓋率
- TypeScript strict mode
- 統一錯誤處理與退出碼

### Data Source

- 支援年份：2017-2026
- 資料來源：[TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar)
