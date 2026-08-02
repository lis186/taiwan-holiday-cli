import { describe, it, expect } from 'vitest';
// @ts-expect-error - 哨兵是純 JS 腳本，無型別宣告；測試只需驗行為
import { validateYearData, currentYearInTaipei, daysInYear } from '../../../scripts/upstream-validate.mjs';

/** 產生某年度合法的完整資料 */
function buildYear(year: number): Array<Record<string, unknown>> {
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const out: Array<Record<string, unknown>> = [];
  const cursor = new Date(Date.UTC(year, 0, 1));
  while (cursor.getUTCFullYear() === year) {
    const date =
      `${cursor.getUTCFullYear()}` +
      String(cursor.getUTCMonth() + 1).padStart(2, '0') +
      String(cursor.getUTCDate()).padStart(2, '0');
    const day = cursor.getUTCDay();
    out.push({
      date,
      week: WEEKDAYS[day],
      // 週六日放假，湊出落在 100-140 合理區間內的天數
      isHoliday: day === 0 || day === 6,
      description: '',
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

describe('upstream-validate', () => {
  it('合法資料應無任何問題', () => {
    expect(validateYearData(2027, buildYear(2027))).toEqual([]);
  });

  it('閏年應接受 366 筆', () => {
    expect(daysInYear(2024)).toBe(366);
    expect(validateYearData(2024, buildYear(2024))).toEqual([]);
  });

  // 以下每一項都是「會讓哨兵誤判為正常」的畸形資料。
  // 少了對應檢查，上游壞掉時哨兵會保持綠燈 —— 比沒有哨兵更糟。
  it.each([
    ['非陣列', 2027, { not: 'array' }, '回應不是陣列'],
    ['空陣列', 2027, [], '回應是空陣列'],
    ['null 元素', 2027, [null], '不是物件'],
    ['primitive 元素', 2027, [42], '不是物件'],
  ])('應診斷 %s 而非 crash', (_label, year, data, expected) => {
    const problems = validateYearData(year as number, data);
    expect(problems.join(' ')).toContain(expected as string);
  });

  it('description 為 null 應被抓到（runtime 的 .includes() 會炸）', () => {
    const data = buildYear(2027);
    data[10].description = null;
    expect(validateYearData(2027, data).join(' ')).toContain('description 不是字串');
  });

  it('筆數不足應被抓到', () => {
    expect(validateYearData(2027, buildYear(2027).slice(0, 300)).join(' ')).toContain('應有 365 筆');
  });

  it('用無效日期湊筆數應被抓到', () => {
    const data = buildYear(2027);
    data[59].date = '20270230'; // 2 月 30 日
    expect(validateYearData(2027, data).join(' ')).toContain('第 59 筆應為');
  });

  // 只驗「week 在合法值域內」擋不住整體錯位 —— 這條才是護欄
  it('星期整體錯位應被抓到', () => {
    const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
    const data = buildYear(2027);
    for (const d of data) {
      const i = WEEKDAYS.indexOf(d.week as string);
      d.week = WEEKDAYS[(i + 1) % 7]; // 全部往後移一天
    }
    expect(validateYearData(2027, data).join(' ')).toContain('星期應為');
  });

  it('放假天數異常應被抓到', () => {
    const data = buildYear(2027).map((d) => ({ ...d, isHoliday: false }));
    expect(validateYearData(2027, data).join(' ')).toContain('落在合理區間之外');
  });

  it('重複日期應被抓到', () => {
    const data = buildYear(2027);
    data[100].date = data[99].date;
    expect(validateYearData(2027, data).join(' ')).toContain('有重複日期');
  });

  describe('currentYearInTaipei', () => {
    it('UTC 12/31 16:00 之後應已是台北的隔年', () => {
      // 2026-12-31T16:00:00Z = 2027-01-01T00:00 台北
      expect(currentYearInTaipei(Date.parse('2026-12-31T16:00:00Z'))).toBe(2027);
      expect(currentYearInTaipei(Date.parse('2026-12-31T15:59:00Z'))).toBe(2026);
    });
  });
});
