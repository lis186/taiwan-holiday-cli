import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TyphoonService, evaluateLive } from '../../../src/services/typhoon-service.js';
import { parsePage, type ParsedPage } from '../../../src/lib/typhoon-live-parser.js';
import { parseDate } from '../../../src/lib/date-parser.js';
import { DataError } from '../../../src/lib/errors.js';
import type { TyphoonArea } from '../../../src/types/typhoon.js';

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

import { ofetch } from 'ofetch';

const TODAY = '20261028';
const TOMORROW = '20261029';
const FETCHED = '2026-10-28T07:00:00.000Z';

function area(overrides: Partial<TyphoonArea> = {}): TyphoonArea {
  return {
    city: '高雄市',
    scope: '',
    forDate: TODAY,
    work: 'stop',
    school: 'stop',
    period: 'allDay',
    from: '',
    raw: '今天停止上班、停止上課。',
    ...overrides,
  };
}

function page(overrides: Partial<ParsedPage> = {}): ParsedPage {
  const areas = overrides.areas ?? [];
  return {
    pageDate: TODAY,
    updatedAt: '2026-10-28T06:30:00',
    noticeNone: false,
    areas,
    rows: overrides.rows ?? new Set(areas.map((a) => a.city)).size,
    cities: overrides.cities ?? [...new Set(areas.map((a) => a.city))],
    ...overrides,
  };
}

const d = (s: string) => parseDate(s);

describe('evaluateLive', () => {
  describe('today (page date)', () => {
    it('「無停班停課訊息」→ normal, no_announcement', () => {
      const r = evaluateLive(page({ noticeNone: true, rows: 0 }), d(TODAY), { fetchedAt: FETCHED });
      expect(r.work.status).toBe('normal');
      expect(r.basis).toBe('no_announcement');
    });

    it('city has rows → verdict from rows, own', () => {
      const r = evaluateLive(page({ areas: [area()] }), d(TODAY), { city: '高雄市', fetchedAt: FETCHED });
      expect(r.work).toEqual({ status: 'stopped', period: 'allDay', from: '' });
      expect(r.basis).toBe('own');
    });

    it('city listed but only skipped sentences → unknown', () => {
      const r = evaluateLive(page({ areas: [], rows: 1, cities: ['花蓮縣'] }), d(TODAY), {
        city: '花蓮縣',
        fetchedAt: FETCHED,
      });
      expect(r.work.status).toBe('unknown');
      expect(r.basis).toBe('own');
      expect(r.notes.join()).toContain('尚未宣布消息');
    });

    it('city not listed while others are → normal (no announcement yet), still live', () => {
      const r = evaluateLive(page({ areas: [area()] }), d(TODAY), { city: '臺北市', fetchedAt: FETCHED });
      expect(r.work.status).toBe('normal');
      expect(r.basis).toBe('no_announcement');
      expect(r.reason).toBe('live');
      expect(r.notes.join()).toContain('之後仍可能公告');
    });

    it('nationwide with some cities stopping → conditional', () => {
      const r = evaluateLive(page({ areas: [area()] }), d(TODAY), { fetchedAt: FETCHED });
      expect(r.work.status).toBe('conditional');
    });
  });

  describe('tomorrow (page date + 1)', () => {
    it('rows for tomorrow → verdict from rows, forecast', () => {
      const r = evaluateLive(page({ areas: [area({ forDate: TOMORROW, raw: '明天停止上班、停止上課。' })] }), d(TOMORROW), {
        city: '高雄市',
        fetchedAt: FETCHED,
      });
      expect(r.work.status).toBe('stopped');
      expect(r.basis).toBe('forecast');
      expect(r.notes.join()).toContain('明天當日仍可能改變');
    });

    it('no rows for tomorrow (even with 無停班停課訊息) → unknown', () => {
      const r = evaluateLive(page({ noticeNone: true, rows: 0 }), d(TOMORROW), { fetchedAt: FETCHED });
      expect(r.work.status).toBe('unknown');
      expect(r.basis).toBe('no_announcement');
    });

    it('today rows do not answer tomorrow', () => {
      const r = evaluateLive(page({ areas: [area()] }), d(TOMORROW), { city: '高雄市', fetchedAt: FETCHED });
      expect(r.work.status).toBe('unknown');
    });
  });

  it('a page that has not rolled over yet answers today through its forecast rows', () => {
    // 00:30 頁面仍是昨天：昨天頁的「明天」就是今天
    const r = evaluateLive(
      page({ pageDate: '20261027', areas: [area({ forDate: TODAY })] }),
      d(TODAY),
      { city: '高雄市', fetchedAt: FETCHED }
    );
    expect(r.basis).toBe('forecast');
    expect(r.work.status).toBe('stopped');
  });

  it('marks every live result reason=live with live source fields', () => {
    const r = evaluateLive(page({ noticeNone: true, rows: 0 }), d(TODAY), { fetchedAt: FETCHED });
    expect(r.reason).toBe('live');
    expect(r.source).toEqual({
      kind: 'live',
      url: 'https://www.dgpa.gov.tw/typh/daily/nds.html',
      announcementDate: TODAY,
      updatedAt: '2026-10-28T06:30:00',
      fetchedAt: FETCHED,
    });
  });

  it('throws on an unrecognised page (no rows, no 無停班停課訊息)', () => {
    expect(() => evaluateLive(page({ rows: 0 }), d(TODAY), { fetchedAt: FETCHED })).toThrow(DataError);
  });
});

describe('parsePage on minimal live HTML', () => {
  const head = '<div>115年10月28日 天然災害停止上班及上課情形</div><p>更新時間：2026/10/28 06:30:00</p>';

  it('parses rows, listed cities and today/tomorrow', () => {
    const html = `${head}<table>
      <tr><th>縣市名稱</th><th>是否停止上班上課情形</th></tr>
      <tr><td>台北市</td><td>今天停止上班、停止上課。明天照常上班、照常上課。</td></tr>
      <tr><td>花蓮縣</td><td>尚未宣布消息。</td></tr>
    </table>`;
    const p = parsePage(html);
    expect(p.pageDate).toBe('20261028');
    expect(p.updatedAt).toBe('2026-10-28T06:30:00');
    expect(p.rows).toBe(2);
    expect(p.cities).toEqual(['臺北市', '花蓮縣']);
    expect(p.areas.map((a) => [a.city, a.forDate, a.work])).toEqual([
      ['臺北市', '20261028', 'stop'],
      ['臺北市', '20261029', 'normal'],
    ]);
  });

  it('recognises 無停班停課訊息', () => {
    const p = parsePage(`${head}<table><tr><td>無停班停課訊息。</td></tr></table>`);
    expect(p.noticeNone).toBe(true);
    expect(p.rows).toBe(0);
  });
});

describe('TyphoonService live routing', () => {
  let service: TyphoonService;
  const LIVE = 'https://www.dgpa.gov.tw/typh/daily/nds.html';
  const NONE_HTML =
    '<div>115年10月28日 天然災害停止上班及上課情形</div><p>更新時間：2026/10/28 06:30:00</p><table><tr><td>無停班停課訊息。</td></tr></table>';

  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T08:00:00+08:00'));
    service = new TyphoonService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the live page for today, with a User-Agent, without touching the archive', async () => {
    vi.mocked(ofetch).mockResolvedValue(NONE_HTML as never);

    const r = await service.getTyphoonStatus('today', '臺北市');

    expect(r.source.kind).toBe('live');
    expect(r.work.status).toBe('normal');
    expect(vi.mocked(ofetch)).toHaveBeenCalledTimes(1);
    const [url, opts] = vi.mocked(ofetch).mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe(LIVE);
    expect(opts.headers['User-Agent']).toMatch(/^taiwan-holiday-cli\//);
  });

  it('uses the live page for tomorrow', async () => {
    vi.mocked(ofetch).mockResolvedValue(NONE_HTML as never);
    const r = await service.getTyphoonStatus('tomorrow');
    expect(r.source.kind).toBe('live');
    expect(r.work.status).toBe('unknown');
  });

  it('does not use the live page for yesterday', async () => {
    vi.mocked(ofetch).mockResolvedValue([] as never);
    const r = await service.getTyphoonStatus('yesterday');
    expect(r.source.kind).toBe('archive');
    expect(vi.mocked(ofetch).mock.calls.every(([u]) => u !== LIVE)).toBe(true);
  });

  it('falls back to the archive with a note when the live page fails', async () => {
    vi.mocked(ofetch).mockImplementation((async (url: string) => {
      if (url === LIVE) throw new Error('ETIMEDOUT');
      return [];
    }) as never);

    const r = await service.getTyphoonStatus('today');

    expect(r.source.kind).toBe('archive');
    expect(r.work.status).toBe('unknown');
    expect(r.notes[0]).toContain('即時頁無法取得或無法解析（ETIMEDOUT）');
  });

  it('falls back when the live page format is unrecognised', async () => {
    vi.mocked(ofetch).mockImplementation((async (url: string) => {
      if (url === LIVE) return '<div>115年10月28日 天然災害停止上班及上課情形</div><p>改版了</p>';
      return [];
    }) as never);

    const r = await service.getTyphoonStatus('today');

    expect(r.source.kind).toBe('archive');
    expect(r.notes[0]).toContain('格式無法辨識');
  });
});
