# 即時頁格級 fixtures（複製自上游）

來源：[lis186/TaiwanTyphoonDays](https://github.com/lis186/TaiwanTyphoonDays) `tests/fixtures/live/`，
commit `3b635f8136049f0859d59e48ab84fdbfdddf0128`。拆格規則與各樣本涵蓋的情況見上游該目錄的 README。

每份 `*.html` 是 DGPA 原始頁面（未修改的位元組），同名 `*.json` 是上游 `scripts/parse.py` `parse_page()` 的輸出。
`tests/unit/lib/typhoon-live-parser.fixtures.test.ts` 檢查本專案 `parsePage()` 的
`{pageDate, updatedAt, noticeNone, areas}` 與它們逐欄相同。

更新：從上游複製新版檔案、改上面的 SHA；JSON 有變動時，上游 commit 會說明原因，請同步調整 `src/lib/typhoon-live-parser.ts`。

資料來源：行政院人事行政總處，依[政府網站資料開放宣告](https://www.dgpa.gov.tw/archive?uid=75)使用。
