import 'server-only';
import { db } from './db';
import { money, num, pct, signedMoney, weekdaysLong } from './format';
import { fill, type Dict, type Locale } from './i18n';
import {
  groupBy,
  isClosed,
  netPnl,
  rMultiple,
  summarize,
  type GroupRow,
  type TradeLike,
} from './stats';
import { dayKeyIn, weekdayIn, weekRangeIn } from './tz';

/** Haftalik hisobot.
 *
 *  Hisobot faqat so'ralganda tuziladi — avtomatik jo'natish yo'q.
 *  Ichidagi hamma raqam savdolardan qayta hisoblanadi, bazada
 *  saqlanmagan holda: hisobotdagi son doim jurnaldagi son bilan bir xil.
 */

export type ReportGroup = { key: string; count: number; netPnl: number; winRate: number; avgR: number };

export type ReportTrade = {
  day: string;
  symbol: string;
  direction: string;
  setup: string;
  r: number;
  pnl: number;
  compliant: boolean;
};

export type WeeklyReport = {
  accountName: string;
  userName: string;
  from: Date;
  to: Date;
  label: string;
  /** Hafta ichidagi yopilgan savdolar soni. */
  count: number;
  netPnl: number;
  totalR: number;
  winRate: number;
  profitFactor: number | null;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  best: number;
  worst: number;
  ruleCompliance: number;
  maxDrawdown: number;
  longestLossStreak: number;
  /** Balans haftaga kirishda va chiqishda. */
  openBalance: number;
  closeBalance: number;
  /** O'tgan hafta bilan solishtirish — ma'lumot bo'lsa. */
  previous: { netPnl: number; count: number; winRate: number } | null;
  byDay: { label: string; netPnl: number; count: number }[];
  bySetup: ReportGroup[];
  bySession: ReportGroup[];
  trades: ReportTrade[];
  lessons: string[];
  /** Qoidaga rioya qilinmagan savdolar — alohida ro'yxat. */
  broken: ReportTrade[];
};

function toGroups(rows: GroupRow[]): ReportGroup[] {
  return rows.map((g) => ({
    key: g.key,
    count: g.count,
    netPnl: g.netPnl,
    winRate: g.winRate,
    avgR: g.avgR,
  }));
}

function inRange(t: TradeLike, from: Date, to: Date): boolean {
  return isClosed(t) && t.closedAt! >= from && t.closedAt! < to;
}

function toReportTrade(t: TradeLike, timeZone: string): ReportTrade {
  return {
    day: dayKeyIn(t.closedAt!, timeZone),
    symbol: t.symbol,
    direction: t.direction === 'LONG' ? 'Long' : 'Short',
    setup: t.setup?.name ?? '—',
    r: rMultiple(t),
    pnl: netPnl(t),
    compliant: t.ruleCompliant,
  };
}

export function weekLabel(from: Date, to: Date, timeZone: string): string {
  const start = dayKeyIn(from, timeZone);
  const end = dayKeyIn(new Date(+to - 1), timeZone);
  return `${start} — ${end}`;
}

export async function buildWeeklyReport(options: {
  userId: string;
  userName: string;
  account: { id: string; name: string; startingBalance: number };
  trades: TradeLike[];
  timeZone: string;
  /** 0 — joriy hafta, 1 — o'tgan hafta. */
  offset: number;
  locale?: Locale;
}): Promise<WeeklyReport> {
  const { account, trades, timeZone, offset } = options;
  const weekdays = weekdaysLong(options.locale ?? 'uz');

  const { from, to } = weekRangeIn(offset, timeZone);
  const prev = weekRangeIn(offset + 1, timeZone);

  const week = trades.filter((t) => inRange(t, from, to));
  const previousWeek = trades.filter((t) => inRange(t, prev.from, prev.to));

  const summary = summarize(week, 0);

  // Balans — hafta boshigacha yopilgan hamma savdodan.
  const before = trades.filter((t) => isClosed(t) && t.closedAt! < from);
  const openBalance = account.startingBalance + before.reduce((s, t) => s + netPnl(t), 0);

  const byDayMap = new Map<number, { netPnl: number; count: number }>();
  for (const t of week) {
    const index = weekdayIn(t.closedAt!, timeZone);
    const row = byDayMap.get(index) ?? { netPnl: 0, count: 0 };
    row.netPnl += netPnl(t);
    row.count += 1;
    byDayMap.set(index, row);
  }

  const byDay = weekdays.map((label, index) => ({
    label,
    netPnl: byDayMap.get(index)?.netPnl ?? 0,
    count: byDayMap.get(index)?.count ?? 0,
  }));

  const entries: { lessons: string[] }[] = await db.journalEntry.findMany({
    where: { userId: options.userId, date: { gte: from, lt: to } },
    orderBy: { date: 'asc' },
    select: { lessons: true },
  });

  const previousSummary = previousWeek.length ? summarize(previousWeek, 0) : null;

  return {
    accountName: account.name,
    userName: options.userName,
    from,
    to,
    label: weekLabel(from, to, timeZone),
    count: summary.count,
    netPnl: summary.netPnl,
    totalR: summary.totalR,
    winRate: summary.winRate,
    profitFactor: summary.profitFactor,
    expectancy: summary.expectancy,
    avgWin: summary.avgWin,
    avgLoss: summary.avgLoss,
    best: summary.best,
    worst: summary.worst,
    ruleCompliance: summary.ruleCompliance,
    maxDrawdown: summary.maxDrawdown,
    longestLossStreak: summary.longestLossStreak,
    openBalance,
    closeBalance: openBalance + summary.netPnl,
    previous: previousSummary
      ? {
          netPnl: previousSummary.netPnl,
          count: previousSummary.count,
          winRate: previousSummary.winRate,
        }
      : null,
    byDay,
    bySetup: toGroups(groupBy(week, (t) => t.setup?.name ?? 'Setupsiz')),
    bySession: toGroups(groupBy(week, (t) => t.session || '—')),
    trades: week
      .slice()
      .sort((a, b) => +a.closedAt! - +b.closedAt!)
      .map((t) => toReportTrade(t, timeZone)),
    lessons: entries.flatMap((e) => e.lessons).filter(Boolean),
    broken: week.filter((t) => !t.ruleCompliant).map((t) => toReportTrade(t, timeZone)),
  };
}

/* ------------------------------------------------------------------ xulosa */

/** Hisobot tepasidagi bir nechta jumla — qoidalar asosida, AI'siz.
 *  Har bir jumla faqat yetarli ma'lumot bo'lganda chiqadi.
 */
export function reportHighlights(report: WeeklyReport, d: Dict): string[] {
  const out: string[] = [];

  if (report.count === 0) {
    return [d.report.hlNone];
  }

  out.push(
    fill(d.report.hlTotal, {
      n: report.count,
      pnl: signedMoney(report.netPnl),
      r: `${report.totalR >= 0 ? '+' : '−'}${num(Math.abs(report.totalR), 2)}`,
      wr: num(report.winRate, 0),
    }),
  );

  if (report.previous && report.previous.count >= 3) {
    const diff = report.netPnl - report.previous.netPnl;
    out.push(
      fill(d.report.hlCompare, {
        verdict: diff >= 0 ? d.report.hlBetter : d.report.hlWorse,
        prev: signedMoney(report.previous.netPnl),
        now: signedMoney(report.netPnl),
      }),
    );
  }

  if (report.ruleCompliance < 100) {
    out.push(
      fill(d.report.hlRule, {
        pct: pct(report.ruleCompliance, 0),
        n: report.broken.length,
      }),
    );
  } else {
    out.push(d.report.hlRuleAll);
  }

  const setups = report.bySetup.filter((g) => g.count >= 2);
  if (setups.length >= 2) {
    const best = setups[0];
    const worst = setups[setups.length - 1];
    if (best.netPnl > 0) {
      out.push(
        fill(d.report.hlBestSetup, {
          key: best.key,
          n: best.count,
          pnl: signedMoney(best.netPnl),
        }),
      );
    }
    if (worst.netPnl < 0) {
      out.push(fill(d.report.hlWorstSetup, { key: worst.key, pnl: signedMoney(worst.netPnl) }));
    }
  }

  const worstDay = report.byDay.reduce((a, b) => (b.netPnl < a.netPnl ? b : a));
  if (worstDay.netPnl < 0 && worstDay.count >= 2) {
    out.push(fill(d.report.hlWorstDay, { day: worstDay.label, pnl: signedMoney(worstDay.netPnl) }));
  }

  if (report.longestLossStreak >= 3) {
    out.push(fill(d.report.hlLossStreak, { n: report.longestLossStreak }));
  }

  if (report.maxDrawdown > 0) {
    out.push(fill(d.report.hlDrawdown, { value: money(report.maxDrawdown) }));
  }

  return out;
}
