/**
 * 差異測試：把上游 data/ 每一句原文丟進 TS 解析器，結果要與上游 Python 解析器逐欄相同。
 * 需要本機的上游 repo：TYPHOON_DATA_DIR=/path/to/TaiwanTyphoonDays/data npx vitest run tests/corpus
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseCell } from '../../src/lib/typhoon-live-parser.js';
import type { TyphoonArea, TyphoonEvent } from '../../src/types/typhoon.js';

const dir = process.env.TYPHOON_DATA_DIR;

describe.skipIf(!dir)('typhoon live parser vs upstream data/ corpus', () => {
  it('reproduces every parsed sentence of every event', () => {
    const events: TyphoonEvent[] = readdirSync(dir!)
      .filter((f) => /^\d{4}\.json$/.test(f))
      .flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));

    let sentences = 0;
    const mismatches: string[] = [];
    for (const e of events) {
      if (!e.parsed) continue; // 沒有附件的自由文字，不經過這個解析器
      // 同一句會拆成多筆（複合句、多時段），依 (city, raw) 連續分組還原成句子
      const groups: TyphoonArea[][] = [];
      for (const a of e.areas) {
        const last = groups[groups.length - 1];
        if (last && last[0].city === a.city && last[0].raw === a.raw) last.push(a);
        else groups.push([a]);
      }
      for (const g of groups) {
        sentences++;
        const got = parseCell(g[0].city, g[0].raw, e.date);
        // 同一格裡重複出現的同一句會被併成一組，所以允許整數倍
        const k = got.length ? g.length / got.length : 0;
        const expected = Number.isInteger(k) && k > 0 ? Array(k).fill(got).flat() : got;
        if (JSON.stringify(expected) !== JSON.stringify(g)) {
          mismatches.push(`${e.date} ${g[0].city} ${g[0].raw}\n  want ${JSON.stringify(g)}\n  got  ${JSON.stringify(got)}`);
        }
      }
    }
    expect(sentences).toBeGreaterThan(1000);
    expect(mismatches.slice(0, 5)).toEqual([]);
    expect(mismatches.length).toBe(0);
  });
});
