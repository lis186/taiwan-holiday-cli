import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTyphoonCommand, formatTyphoonResult } from '../../../src/commands/typhoon.js';
import { evaluateTyphoon } from '../../../src/services/typhoon-service.js';
import { parseDate } from '../../../src/lib/date-parser.js';
import type { TyphoonArea, TyphoonEvent, TyphoonQueryResult } from '../../../src/types/typhoon.js';

const mockService = { getTyphoonStatus: vi.fn() };

vi.mock('../../../src/services/typhoon-service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/services/typhoon-service.js')>()),
  getTyphoonService: () => mockService,
}));

function area(overrides: Partial<TyphoonArea> = {}): TyphoonArea {
  return {
    city: '高雄市',
    scope: '',
    forDate: '20240809',
    work: 'stop',
    school: 'stop',
    period: 'from',
    from: '12:00',
    raw: '高雄市:今天中午12:00起停止上班、停止上課。',
    ...overrides,
  };
}

function event(date: string, areas: TyphoonArea[]): TyphoonEvent {
  return { date, publishedAt: date, updatedAt: '', sourceUrl: `https://example.test/${date}`, parsed: true, areas };
}

const LONG_AFTER = parseDate('2026-10-28');

/** 用真正的 evaluateTyphoon 產生結果，避免手寫的假結構與實作脫節 */
function evaluate(events: TyphoonEvent[], date: string, city?: string, today = LONG_AFTER): TyphoonQueryResult {
  return evaluateTyphoon(events, parseDate(date, 2001), { today, city });
}

describe('typhoon command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatTyphoonResult simple', () => {
    it('puts the answer on the first line, with period and finality', () => {
      const out = formatTyphoonResult(evaluate([event('20240809', [area()])], '2024-08-09', '高雄市'), 'simple');
      const [first] = out.split('\n');
      expect(first).toBe('2024-08-09 高雄市：停止上班（12:00 起）、停止上課（12:00 起）〔已定案〕');
      expect(out).toContain('來源：https://example.test/20240809');
    });

    it('labels a forecast and keeps the warning note', () => {
      const out = formatTyphoonResult(evaluate([event('20240808', [area()])], '2024-08-09'), 'simple');
      expect(out.split('\n')[0]).toContain('〔依前一日預告〕');
      expect(out).toContain('※ 依據是前一天公告');
    });

    it('lists rows for a conditional (sub-area) verdict without repeating the city', () => {
      const out = formatTyphoonResult(
        evaluate([event('20240809', [area({ scope: '高雄市桃源區' })])], '2024-08-09', '高雄市'),
        'simple'
      );
      expect(out.split('\n')[0]).toContain('部分停止上班');
      expect(out).toContain('  高雄市桃源區：');
      expect(out).not.toContain('高雄市 高雄市桃源區');
    });

    it('shows raw text for unparsed rows', () => {
      const out = formatTyphoonResult(
        evaluate([event('20240809', [area({ work: null, school: null, period: null, raw: '某句原文' })])], '2024-08-09'),
        'simple'
      );
      expect(out.split('\n')[0]).toContain('無法判斷');
      expect(out).toContain('（未解析，原文）某句原文');
    });

    it('says pending, not normal, for a recent day without records', () => {
      const out = formatTyphoonResult(evaluate([], '2026-10-27', undefined, parseDate('2026-10-28')), 'simple');
      const [first] = out.split('\n');
      expect(first).toBe('2026-10-27：上班狀況無法判斷、上課狀況無法判斷〔尚未定案〕');
      expect(out).toContain('不代表照常');
    });

    it('says settled no-announcement for an old day without records', () => {
      const out = formatTyphoonResult(evaluate([], '2024-05-05'), 'simple');
      expect(out.split('\n')[0]).toBe('2024-05-05：照常上班、照常上課〔已定案：當日無停班停課公告〕');
    });
  });

  describe('formatTyphoonResult json', () => {
    it('exposes verdicts, basis, reason, source and grouped cities', () => {
      const parsed = JSON.parse(
        formatTyphoonResult(evaluate([event('20240809', [area(), area({ city: '臺北市' })])], '2024-08-09'), 'json')
      );
      expect(parsed.date).toBe('2024-08-09');
      expect(parsed.normalizedDate).toBe('20240809');
      // 未指定縣市：全國層級只能是「依所在縣市而定」
      expect(parsed.work.status).toBe('conditional');
      expect(parsed.cities[0].work).toEqual({ status: 'stopped', period: 'from', from: '12:00' });
      expect(parsed.basis).toBe('own');
      expect(parsed.reason).toBeNull();
      expect(parsed.source.kind).toBe('archive');
      expect(parsed.cities.map((c: { city: string }) => c.city)).toEqual(['高雄市', '臺北市']);
      expect(parsed.cities[0].rows[0].raw).toContain('12:00');
    });
  });

  describe('formatTyphoonResult table', () => {
    it('renders a row per area', () => {
      const out = formatTyphoonResult(evaluate([event('20240809', [area({ scope: '旗山區' })])], '2024-08-09'), 'table');
      expect(out).toContain('旗山區');
      expect(out).toContain('停止上班');
    });

    it('renders the verdict when there are no rows', () => {
      const out = formatTyphoonResult(evaluate([], '2024-05-05'), 'table');
      expect(out).toContain('照常上班');
    });
  });

  describe('command', () => {
    it('passes date and --city to the service', async () => {
      mockService.getTyphoonStatus.mockResolvedValue(evaluate([], '2024-08-09'));
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await createTyphoonCommand().parseAsync(['node', 'typhoon', '2024-08-09', '-c', '高雄市']);

      expect(mockService.getTyphoonStatus).toHaveBeenCalledWith('2024-08-09', '高雄市');
      spy.mockRestore();
    });

    it('defaults the date to today', async () => {
      mockService.getTyphoonStatus.mockResolvedValue(evaluate([], '2024-08-09'));
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await createTyphoonCommand().parseAsync(['node', 'typhoon']);

      expect(mockService.getTyphoonStatus).toHaveBeenCalledWith('today', undefined);
      spy.mockRestore();
    });
  });
});
