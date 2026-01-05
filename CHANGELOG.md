# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
