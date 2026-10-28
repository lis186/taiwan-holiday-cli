import { Command } from 'commander';
import Table from 'cli-table3';
import { type OutputFormat } from '../lib/constants.js';
import { getTyphoonService } from '../services/typhoon-service.js';
import { formatDateString } from '../lib/formatter.js';
import type {
  TyphoonArea,
  TyphoonQueryResult,
  TyphoonVerdict,
} from '../types/typhoon.js';

const WORK_LABEL = { stop: '停止上班', normal: '照常上班' } as const;
const SCHOOL_LABEL = { stop: '停止上課', normal: '照常上課', partial: '部分學制停課' } as const;

function periodLabel(period: TyphoonArea['period'], from: string): string {
  switch (period) {
    case 'allDay':
      return '全天';
    case 'morning':
      return '上午';
    case 'afternoon':
      return '下午';
    case 'evening':
      return '晚間';
    case 'from':
      return `${from} 起`;
    default:
      return '';
  }
}

function areaName(area: TyphoonArea): string {
  const city = area.city || '（未標示縣市）';
  if (!area.scope) return city;
  // 上游的 scope 常已含縣市名（如「高雄市桃源區」），不重複前綴
  return area.scope.startsWith(city) ? area.scope : `${city} ${area.scope}`;
}

/** 單列的狀況描述；未解析的記錄顯示原文 */
function areaStatus(area: TyphoonArea): string {
  if (area.work === null && area.school === null) {
    return `（未解析，原文）${area.raw}`;
  }
  const parts = [
    area.work ? WORK_LABEL[area.work] : '上班狀況未解析',
    area.school ? SCHOOL_LABEL[area.school] : '上課狀況未解析',
  ];
  const period = periodLabel(area.period, area.from);
  return period ? `${parts.join('、')}（${period}）` : parts.join('、');
}

function verdictLabel(v: TyphoonVerdict, kind: '上班' | '上課'): string {
  switch (v.status) {
    case 'stopped': {
      const p = periodLabel(v.period, v.from);
      return `停止${kind}${p ? `（${p}）` : ''}`;
    }
    case 'conditional':
      return `部分停止${kind}（依地區或時段，見下方明細）`;
    case 'normal':
      return `照常${kind}`;
    default:
      return `${kind}狀況無法判斷`;
  }
}

function finalityLabel(result: TyphoonQueryResult): string {
  if (result.reason === 'live') {
    return result.basis === 'forecast' ? '即時：今天公告的明天預告，可能更新' : '即時，可能更新';
  }
  if (result.reason === 'pending') return '尚未定案';
  if (result.reason === 'source_not_ready') return '資料源未就緒';
  if (result.basis === 'no_announcement') return '已定案：當日無停班停課公告';
  return result.basis === 'forecast' ? '依前一日預告' : '已定案';
}

/**
 * 格式化 typhoon 命令結果
 */
export function formatTyphoonResult(result: TyphoonQueryResult, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(
      { ...result, date: formatDateString(result.date), normalizedDate: result.date },
      null,
      2
    );
  }

  const rows = result.cities.flatMap((c) => c.rows);

  if (format === 'table') {
    const table = new Table({ head: ['日期', '縣市／地區', '狀況'] });
    if (rows.length === 0) {
      table.push([
        formatDateString(result.date),
        result.city ?? '-',
        `${verdictLabel(result.work, '上班')}、${verdictLabel(result.school, '上課')}〔${finalityLabel(result)}〕`,
      ]);
    } else {
      for (const area of rows) {
        table.push([formatDateString(result.date), areaName(area), areaStatus(area)]);
      }
    }
    return table.toString();
  }

  // simple：第一行就是答案
  const where = result.city ? ` ${result.city}` : '';
  const lines = [
    `${formatDateString(result.date)}${where}：${verdictLabel(result.work, '上班')}、${verdictLabel(result.school, '上課')}〔${finalityLabel(result)}〕`,
  ];
  if (!result.city && rows.length > 0) lines[0] += `（${result.cities.length} 個縣市有公告）`;
  for (const area of rows) lines.push(`  ${areaName(area)}：${areaStatus(area)}`);
  if (result.source.kind === 'live') {
    lines.push(`來源：${result.source.url}（即時頁，更新時間 ${result.source.updatedAt || '未標示'}）`);
  } else if (result.source.url) {
    lines.push(`來源：${result.source.url}`);
  }
  for (const note of result.notes) lines.push(`※ ${note}`);
  return lines.join('\n');
}

/**
 * 建立 typhoon 命令
 */
export function createTyphoonCommand(): Command {
  const cmd = new Command('typhoon')
    .description('查詢颱風假（天然災害停止上班上課）：今天、明天看 DGPA 即時頁，其他日期看歸檔（2001-07-30 起）；省略日期為今天')
    .argument('[date]', '日期 (支援 YYYY-MM-DD, YYYYMMDD, today, yesterday 等)', 'today')
    .option('-c, --city <city>', '只看指定縣市（字面比對，如 臺北市；台／臺視為相同）')
    .option('-f, --format <format>', '輸出格式 (simple | json | table)', 'simple')
    .action(async (date: string, options: { format: OutputFormat; city?: string }) => {
      const service = getTyphoonService();
      const result = await service.getTyphoonStatus(date, options.city);
      console.log(formatTyphoonResult(result, options.format));
    });

  return cmd;
}
