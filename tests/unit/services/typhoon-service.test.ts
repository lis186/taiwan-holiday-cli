import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TyphoonService,
  evaluateTyphoon,
  normalizeCity,
} from '../../../src/services/typhoon-service.js';
import { parseDate } from '../../../src/lib/date-parser.js';
import { DataError, ValidationError } from '../../../src/lib/errors.js';
import type { TyphoonArea, TyphoonEvent } from '../../../src/types/typhoon.js';

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

import { ofetch } from 'ofetch';

function area(overrides: Partial<TyphoonArea> = {}): TyphoonArea {
  return {
    city: '高雄市',
    scope: '',
    forDate: '20240809',
    work: 'stop',
    school: 'stop',
    period: 'allDay',
    from: '',
    raw: '高雄市:今天停止上班、停止上課。',
    ...overrides,
  };
}

function event(date: string, areas: TyphoonArea[], overrides: Partial<TyphoonEvent> = {}): TyphoonEvent {
  return {
    date,
    publishedAt: date,
    updatedAt: '',
    sourceUrl: `https://example.test/${date}`,
    parsed: true,
    areas,
    ...overrides,
  };
}

const d = (s: string) => parseDate(s, 2001);
/** 早已過了歸檔延遲窗口的「今天」 */
const LONG_AFTER = d('2026-10-28');

describe('normalizeCity', () => {
  it('should unify 台/臺 and 巿/市', () => {
    expect(normalizeCity('台北市')).toBe('臺北市');
    expect(normalizeCity(' 臺中巿 ')).toBe('臺中市');
  });
});

describe('evaluateTyphoon', () => {
  describe('choosing the announcement', () => {
    it('uses the previous day\'s forecast when the day has no announcement of its own', () => {
      const r = evaluateTyphoon([event('20240808', [area()])], d('2024-08-09'), {
        today: LONG_AFTER,
        city: '高雄市',
      });
      expect(r.basis).toBe('forecast');
      expect(r.work).toEqual({ status: 'stopped', period: 'allDay', from: '' });
      expect(r.source.announcementDate).toBe('20240808');
      expect(r.notes.join()).toContain('預告');
    });

    it('prefers the day\'s own announcement over the forecast', () => {
      const r = evaluateTyphoon(
        [
          event('20240808', [area({ work: 'stop', raw: '預告' })]),
          event('20240809', [area({ work: 'normal', school: 'normal', raw: '當天' })]),
        ],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      expect(r.basis).toBe('own');
      expect(r.cities[0].rows.map((x) => x.raw)).toEqual(['當天']);
      expect(r.work.status).toBe('normal');
    });

    it('does not revive an overridden forecast when the own announcement has no rows for the day', () => {
      // 當日公告存在、但沒有當日的列（只有明天，或整份都是「尚未列入警戒區」）
      const r = evaluateTyphoon(
        [
          event('20240808', [area({ raw: '預告停班' })]),
          event('20240809', [area({ forDate: '20240810' })]),
        ],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      // 不採用預告；而且依上游契約，當日公告沒有記錄不等於照常
      expect(r.basis).toBe('own');
      expect(r.cities).toEqual([]);
      expect(r.work.status).toBe('unknown');
      expect(r.source.url).toBe('https://example.test/20240809');
      expect(r.notes.join()).toContain('尚未宣布消息');
    });

    it('reads a forecast across New Year', () => {
      const r = evaluateTyphoon(
        [event('20231231', [area({ forDate: '20240101' })])],
        d('2024-01-01'),
        { today: LONG_AFTER, city: '高雄市' }
      );
      expect(r.work.status).toBe('stopped');
    });
  });

  describe('verdicts', () => {
    it('keeps the period for a city-wide stop', () => {
      const r = evaluateTyphoon(
        [event('20240809', [area({ period: 'from', from: '12:00' })])],
        d('2024-08-09'),
        { today: LONG_AFTER, city: '高雄市' }
      );
      expect(r.work).toEqual({ status: 'stopped', period: 'from', from: '12:00' });
    });

    it('is conditional when only sub-areas stop', () => {
      const r = evaluateTyphoon(
        [event('20240809', [area({ scope: '旗山區' })])],
        d('2024-08-09'),
        { today: LONG_AFTER, city: '高雄市' }
      );
      expect(r.work.status).toBe('conditional');
      expect(r.cities[0].coverage).toBe('subAreas');
      expect(r.cities[0].subAreas).toEqual({ stopped: 1, total: 1 });
    });

    it('is conditional for morning-normal / afternoon-stop on the same city', () => {
      const r = evaluateTyphoon(
        [
          event('20240809', [
            area({ work: 'normal', school: 'normal', period: 'morning' }),
            area({ period: 'afternoon' }),
          ]),
        ],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      expect(r.work.status).toBe('conditional');
    });

    it('separates work and school (照常上班、停止上課)', () => {
      const r = evaluateTyphoon(
        [event('20221017', [area({ forDate: '20221017', work: 'normal', school: 'stop' })])],
        d('2022-10-17'),
        { today: LONG_AFTER, city: '高雄市' }
      );
      expect(r.work.status).toBe('normal');
      expect(r.school.status).toBe('stopped');
    });

    it('treats school "partial" as conditional, not stopped', () => {
      const r = evaluateTyphoon(
        [event('20240809', [area({ work: 'normal', school: 'partial' })])],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      expect(r.school.status).toBe('conditional');
    });

    it('is unknown when any row is unparsed, and points to raw', () => {
      const r = evaluateTyphoon(
        [
          event('20130813', [area({ forDate: '20130813', work: null, school: null, period: null })], {
            parsed: false,
          }),
        ],
        d('2013-08-13'),
        { today: LONG_AFTER }
      );
      expect(r.work.status).toBe('unknown');
      expect(r.notes.join()).toContain('raw');
    });

    it('treats unknown enum values as unparsed (upstream contract)', () => {
      const r = evaluateTyphoon(
        [event('20240809', [area({ work: 'halfStop' as never })])],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      expect(r.work.status).toBe('unknown');
      expect(r.cities[0].rows[0].work).toBeNull();
    });

    it('never claims a nationwide stop: one city stopping is conditional', () => {
      const r = evaluateTyphoon([event('20240809', [area({ city: '臺東縣' })])], d('2024-08-09'), {
        today: LONG_AFTER,
      });
      expect(r.work.status).toBe('conditional');
    });

    it('aggregates nationwide: differing cities are conditional', () => {
      const r = evaluateTyphoon(
        [event('20240809', [area({ city: '臺北市' }), area({ city: '高雄市', period: 'afternoon' })])],
        d('2024-08-09'),
        { today: LONG_AFTER }
      );
      expect(r.cities).toHaveLength(2);
      expect(r.work.status).toBe('conditional');
    });
  });

  describe('absence of records', () => {
    it('says normal (no announcement) only after the archive settle window', () => {
      const r = evaluateTyphoon([], d('2024-05-05'), { today: LONG_AFTER });
      expect(r.basis).toBe('no_announcement');
      expect(r.reason).toBeNull();
      expect(r.work.status).toBe('normal');
    });

    it('is unknown/pending within the settle window', () => {
      const r = evaluateTyphoon([], d('2026-10-20'), { today: d('2026-10-28') });
      expect(r.reason).toBe('pending');
      expect(r.work.status).toBe('unknown');
    });

    it('is settled exactly after 21 days, pending at 21', () => {
      expect(evaluateTyphoon([], d('2026-10-07'), { today: d('2026-10-28') }).reason).toBe('pending');
      expect(evaluateTyphoon([], d('2026-10-06'), { today: d('2026-10-28') }).reason).toBeNull();
    });

    it('marks a recent forecast as pending (may still be overridden)', () => {
      const r = evaluateTyphoon(
        [event('20261022', [area({ forDate: '20261023' })])],
        d('2026-10-23'),
        { today: d('2026-10-28'), city: '高雄市' }
      );
      expect(r.basis).toBe('forecast');
      expect(r.reason).toBe('pending');
      expect(r.work.status).toBe('stopped');
    });

    it('does not mark a recent own announcement as pending', () => {
      const r = evaluateTyphoon(
        [event('20261023', [area({ forDate: '20261023' })])],
        d('2026-10-23'),
        { today: d('2026-10-28') }
      );
      expect(r.reason).toBeNull();
    });

    it('is unknown/source_not_ready when the year file does not exist yet', () => {
      const r = evaluateTyphoon([], d('2027-01-01'), { today: d('2027-01-01'), sourceNotReady: true });
      expect(r.reason).toBe('source_not_ready');
      expect(r.work.status).toBe('unknown');
    });

    it('adds the live-page note for today and later', () => {
      const r = evaluateTyphoon([], d('2026-10-28'), { today: d('2026-10-28') });
      expect(r.notes.join()).toContain('nds.html');
    });

    it('explains when the day had announcements but not for the city', () => {
      const r = evaluateTyphoon([event('20240809', [area({ city: '高雄市' })])], d('2024-08-09'), {
        today: LONG_AFTER,
        city: '臺北市',
      });
      expect(r.cities).toEqual([]);
      expect(r.work.status).toBe('normal');
      expect(r.notes.join()).toContain('沒有「臺北市」');
    });
  });
});

describe('TyphoonService.getTyphoonStatus', () => {
  let service: TyphoonService;

  function notFound(): Error {
    return Object.assign(new Error('404'), { response: { status: 404 } });
  }

  function mockYears(byYear: Record<number, TyphoonEvent[]>): void {
    vi.mocked(ofetch).mockImplementation((async (url: string) => {
      const year = Number(url.match(/(\d{4})\.json$/)?.[1]);
      if (byYear[year]) return byYear[year];
      throw notFound();
    }) as never);
  }

  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
    service = new TyphoonService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads from raw.githubusercontent first', async () => {
    mockYears({ 2024: [event('20240808', [area()])] });

    const r = await service.getTyphoonStatus('2024-08-09', '高雄市');

    expect(r.work.status).toBe('stopped');
    expect(vi.mocked(ofetch).mock.calls[0][0]).toBe(
      'https://raw.githubusercontent.com/lis186/TaiwanTyphoonDays/master/data/2024.json'
    );
  });

  it('falls back to jsDelivr on network failure', async () => {
    vi.mocked(ofetch)
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce([event('20240809', [area()])]);

    const r = await service.getTyphoonStatus('2024-08-09', '高雄市');

    expect(r.work.status).toBe('stopped');
    expect(vi.mocked(ofetch).mock.calls[1][0]).toBe(
      'https://cdn.jsdelivr.net/gh/lis186/TaiwanTyphoonDays/data/2024.json'
    );
  });

  it('forces JSON parsing (raw.githubusercontent serves text/plain)', async () => {
    mockYears({ 2024: [event('20240809', [area()])] });

    await service.getTyphoonStatus('2024-08-09');

    expect(vi.mocked(ofetch).mock.calls[0][1]).toMatchObject({ responseType: 'json' });
  });

  it('rejects a non-array payload instead of treating it as "no events"', async () => {
    vi.mocked(ofetch).mockResolvedValue('[{"date":"20240809"}]' as never);

    await expect(service.getTyphoonStatus('2024-08-09')).rejects.toThrow(DataError);
  });

  it('treats a 404 on a historical year as a data error, not "no record"', async () => {
    mockYears({});
    await expect(service.getTyphoonStatus('2019-05-05')).rejects.toThrow(DataError);
  });

  it('reports source_not_ready when the current year file does not exist yet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T03:00:00+08:00'));
    mockYears({ 2026: [] });

    const r = await service.getTyphoonStatus('today');

    expect(r.date).toBe('20270101');
    expect(r.reason).toBe('source_not_ready');
    expect(r.work.status).toBe('unknown');
  });

  it('defaults to today in Taiwan time', async () => {
    vi.useFakeTimers();
    // UTC 10/27 17:00 = 臺北 10/28 01:00
    vi.setSystemTime(new Date('2026-10-27T17:00:00Z'));
    mockYears({ 2026: [] });

    const r = await service.getTyphoonStatus();

    expect(r.date).toBe('20261028');
  });

  it('rejects dates before the data starts (2001-07-30)', async () => {
    await expect(service.getTyphoonStatus('2001-07-29')).rejects.toThrow(ValidationError);
    await expect(service.getTyphoonStatus('2000-01-01')).rejects.toThrow(ValidationError);
    expect(ofetch).not.toHaveBeenCalled();
  });

  it('wraps failures of both sources in DataError', async () => {
    vi.mocked(ofetch).mockRejectedValue(new Error('network down'));
    await expect(service.getTyphoonStatus('2024-08-09')).rejects.toThrow(DataError);
  });
});
