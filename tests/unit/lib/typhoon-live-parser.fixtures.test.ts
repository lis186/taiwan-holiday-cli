/**
 * 契約測試：上游的格級 fixtures（tests/fixtures/typhoon-live/，見該目錄 README 的 commit SHA）。
 * TS 解析器必須與上游 Python parse_page() 逐欄相同。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage } from '../../../src/lib/typhoon-live-parser.js';
import { evaluateLive } from '../../../src/services/typhoon-service.js';
import { parseDate } from '../../../src/lib/date-parser.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures', 'typhoon-live') + '/';
const pages = readdirSync(dir).filter((f) => f.endsWith('.html'));

describe('typhoon live parser vs upstream page fixtures', () => {
  it('has the fixtures', () => {
    expect(pages.length).toBeGreaterThanOrEqual(10);
  });

  it.each(pages)('%s', (file) => {
    const html = readFileSync(`${dir}${file}`, 'utf8');
    const expected = JSON.parse(readFileSync(`${dir}${file.replace(/\.html$/, '.json')}`, 'utf8'));
    const { pageDate, updatedAt, noticeNone, areas } = parsePage(html);
    expect({ pageDate, updatedAt, noticeNone, areas }).toEqual(expected);
  });
});

describe('evaluateLive on real fixture pages', () => {
  const load = (f: string) => parsePage(readFileSync(`${dir}${f}`, 'utf8'));
  const FETCHED = '2026-10-28T07:00:00.000Z';

  it('a page whose cells are all skipped sentences is unknown, not normal (20210603-10657)', () => {
    const r = evaluateLive(load('20210603-10657.html'), parseDate('2021-06-03'), {
      city: '臺北市',
      fetchedAt: FETCHED,
    });
    expect(r.work.status).toBe('unknown');
    expect(r.basis).toBe('own');
  });

  it('the live 無停班停課訊息 page is normal today, unknown tomorrow (20261028-live)', () => {
    const page = load('20261028-live.html');
    expect(evaluateLive(page, parseDate('2026-10-28'), { fetchedAt: FETCHED }).work.status).toBe('normal');
    expect(evaluateLive(page, parseDate('2026-10-29'), { fetchedAt: FETCHED }).work.status).toBe('unknown');
  });
});
