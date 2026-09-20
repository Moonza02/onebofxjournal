/** Chuqur tahlil — hammasi savdolardan hisoblanadi, tashqi manbasiz.
 *
 *  Muhim: bu yerdagi hisoblar o'tmishga qarab optimallashtirish. Kichik
 *  namunada chiqqan xulosa tasodif bo'lishi mumkin, shuning uchun har bir
 *  natija yonida namuna hajmi qaytariladi va sahifada ko'rsatiladi.
 */
import { dayKeyIn, hourIn, weekdayIn } from './tz';
import { holdMs, isClosed, netPnl, rMultiple, summarize, type TradeLike } from './stats';

const LOSS = -0.05;

/* ------------------------------------------------------------------ vaqt */

export type HourRow = {
  hour: number;
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  netPnl: number;
  avgR: number;
  stopShare: number;
};

/** Savdo qaysi soatda OCHILGAN — stop olish naqshi kirish vaqtiga bog'liq. */
export function hourBreakdown(trades: TradeLike[], timeZone: string): HourRow[] {
  const rows: HourRow[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    netPnl: 0,
    avgR: 0,
    stopShare: 0,
  }));

  const rTotals = Array(24).fill(0) as number[];

  for (const t of trades.filter(isClosed)) {
    const hour = hourIn(t.openedAt, timeZone);
    const row = rows[hour];
    const r = rMultiple(t);

    row.count += 1;
    row.netPnl += netPnl(t);
    rTotals[hour] += r;

    if (r > -LOSS) row.wins += 1;
    else if (r < LOSS) row.losses += 1;
    else row.breakeven += 1;
  }

  for (const row of rows) {
    row.avgR = row.count ? rTotals[row.hour] / row.count : 0;
    row.stopShare = row.count ? (row.losses / row.count) * 100 : 0;
  }

  return rows;
}

/** Faqat savdo bo'lgan soatlar — grafikda bo'sh ustunlar turmasligi uchun. */
export function activeHours(rows: HourRow[]): HourRow[] {
  const used = rows.filter((r) => r.count > 0);
  if (used.length === 0) return [];
  const first = Math.min(...used.map((r) => r.hour));
  const last = Math.max(...used.map((r) => r.hour));
  return rows.slice(first, last + 1);
}

export type MatrixCell = { weekday: number; hour: number; count: number; avgR: number };

/** Hafta kuni × soat: katak rangi o'rtacha R. */
export function weekdayHourMatrix(
  trades: TradeLike[],
  hours: number[],
  timeZone: string,
): MatrixCell[][] {
  const totals = new Map<string, { count: number; r: number }>();

  for (const t of trades.filter(isClosed)) {
    const key = `${weekdayIn(t.openedAt, timeZone)}:${hourIn(t.openedAt, timeZone)}`;
    const cell = totals.get(key) ?? { count: 0, r: 0 };
    cell.count += 1;
    cell.r += rMultiple(t);
    totals.set(key, cell);
  }

  return Array.from({ length: 5 }, (_, weekday) =>
    hours.map((hour) => {
      const cell = totals.get(`${weekday}:${hour}`);
      return {
        weekday,
        hour,
        count: cell?.count ?? 0,
        avgR: cell && cell.count ? cell.r / cell.count : 0,
      };
    }),
  );
}

/* ------------------------------------------------- ushlash vaqti va natija */

export type HoldPoint = { id: string; minutes: number; r: number; symbol: string };

export function holdPoints(trades: TradeLike[]): HoldPoint[] {
  return trades
    .filter(isClosed)
    .map((t) => ({
      id: t.id,
      minutes: holdMs(t) / 60000,
      r: rMultiple(t),
      symbol: t.symbol,
    }))
    .filter((p) => p.minutes >= 0);
}

/** Oraliq nomlari kalit bilan yuriladi — matn ko'rsatishda tanlanadi. */
export const HOLD_BUCKETS = [
  { key: 'hold0', min: 0, max: 30 },
  { key: 'hold1', min: 30, max: 120 },
  { key: 'hold2', min: 120, max: 360 },
  { key: 'hold3', min: 360, max: Infinity },
] as const;

export type HoldBucketRow = {
  key: 'hold0' | 'hold1' | 'hold2' | 'hold3';
  count: number;
  winRate: number;
  avgR: number;
  netPnl: number;
};

export function holdBuckets(trades: TradeLike[]): HoldBucketRow[] {
  return HOLD_BUCKETS.map((bucket) => {
    const inBucket = trades.filter((t) => {
      if (!isClosed(t)) return false;
      const minutes = holdMs(t) / 60000;
      return minutes >= bucket.min && minutes < bucket.max;
    });

    const summary = summarize(inBucket, 0);
    return {
      key: bucket.key,
      count: summary.count,
      winRate: summary.winRate,
      avgR: summary.avgR,
      netPnl: summary.netPnl,
    };
  });
}

/* ------------------------------------------ "agar shunday qilganimda" */

export type SimulationFilter = {
  excludeSetups?: string[];
  excludeWeekdays?: number[];
  hourFrom?: number;
  hourTo?: number;
  maxPerDay?: number;
  fixedRisk?: boolean;
};

export type SimulationResult = {
  kept: number;
  removed: number;
  netPnl: number;
  maxDrawdownPct: number;
  expectancy: number;
  curve: number[];
};

/** Filtrni butun tarixga qo'llab, kapital egri chizig'ini qayta hisoblaydi. */
export function simulate(
  trades: TradeLike[],
  startingBalance: number,
  filter: SimulationFilter,
  timeZone: string,
): SimulationResult {
  const closed = trades
    .filter(isClosed)
    .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());

  const perDay = new Map<string, number>();
  const kept: TradeLike[] = [];

  for (const t of closed) {
    if (filter.excludeSetups?.includes(t.setup?.name ?? 'Setupsiz')) continue;
    if (filter.excludeWeekdays?.includes(weekdayIn(t.openedAt, timeZone))) continue;

    const hour = hourIn(t.openedAt, timeZone);
    if (filter.hourFrom !== undefined && hour < filter.hourFrom) continue;
    if (filter.hourTo !== undefined && hour > filter.hourTo) continue;

    if (filter.maxPerDay !== undefined) {
      const key = dayKeyIn(t.openedAt, timeZone);
      const used = perDay.get(key) ?? 0;
      if (used >= filter.maxPerDay) continue;
      perDay.set(key, used + 1);
    }

    kept.push(t);
  }

  // Bir xil risk rejimi: har savdo natijasi 1R ning o'rtacha pul qiymatiga keltiriladi.
  const avgRisk =
    closed.length > 0
      ? closed.reduce(
          (s, t) => s + (Math.abs(t.entryPrice - t.stopPrice) / t.pipSize) * t.pipValuePerLot * t.volume,
          0,
        ) / closed.length
      : 0;

  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdownPct = 0;
  const curve = [startingBalance];

  for (const t of kept) {
    const pnl = filter.fixedRisk ? rMultiple(t) * avgRisk : netPnl(t);
    balance += pnl;
    curve.push(balance);
    if (balance > peak) peak = balance;
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
  }

  return {
    kept: kept.length,
    removed: closed.length - kept.length,
    netPnl: balance - startingBalance,
    maxDrawdownPct,
    expectancy: kept.length ? (balance - startingBalance) / kept.length : 0,
    curve,
  };
}

/* ------------------------------------------------------------ Monte-Carlo */

/** Takrorlanadigan natija uchun determinlashgan generator. */
function makeRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export type MonteCarloResult = {
  runs: number;
  sampleSize: number;
  /** p5, p50, p95 — har bir savdo nuqtasida. */
  bands: { p5: number[]; p50: number[]; p95: number[] };
  drawdownHistogram: { label: string; count: number }[];
  streakHistogram: { label: string; count: number }[];
  medianDrawdownPct: number;
  worstDrawdownPct: number;
  /** Berilgan limitdan oshib ketish ehtimoli, foizda. */
  ruinChance: number;
  typicalStreak: number;
  worstStreak: number;
};

export function monteCarlo(
  trades: TradeLike[],
  startingBalance: number,
  drawdownLimitPct: number,
  runs = 1000,
): MonteCarloResult | null {
  const closed = trades.filter(isClosed);
  if (closed.length < 30) return null;

  const risks = closed.map(
    (t) => (Math.abs(t.entryPrice - t.stopPrice) / t.pipSize) * t.pipValuePerLot * t.volume,
  );
  const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
  const rs = closed.map(rMultiple);
  const n = rs.length;

  const random = makeRandom(n * 7919 + Math.round(avgRisk));

  const finalCurves: number[][] = [];
  const drawdowns: number[] = [];
  const streaks: number[] = [];
  let ruin = 0;

  for (let run = 0; run < runs; run += 1) {
    const shuffled = [...rs];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let balance = startingBalance;
    let peak = startingBalance;
    let maxDd = 0;
    let streak = 0;
    let longestStreak = 0;
    const curve = [startingBalance];

    for (const r of shuffled) {
      balance += r * avgRisk;
      curve.push(balance);
      if (balance > peak) peak = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;

      if (r < LOSS) {
        streak += 1;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }

    finalCurves.push(curve);
    drawdowns.push(maxDd);
    streaks.push(longestStreak);
    if (maxDd >= drawdownLimitPct) ruin += 1;
  }

  // Har bir nuqtada protsentillar.
  const quantile = (values: number[], q: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
    return sorted[index];
  };

  const p5: number[] = [];
  const p50: number[] = [];
  const p95: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const slice = finalCurves.map((c) => c[i]);
    p5.push(quantile(slice, 0.05));
    p50.push(quantile(slice, 0.5));
    p95.push(quantile(slice, 0.95));
  }

  const histogram = (values: number[], edges: number[], format: (a: number, b: number) => string) => {
    const counts = Array(edges.length).fill(0) as number[];
    for (const v of values) {
      let index = edges.findIndex((edge) => v < edge);
      if (index === -1) index = edges.length - 1;
      counts[index] += 1;
    }
    return counts.map((count, i) => ({
      label: format(i === 0 ? 0 : edges[i - 1], edges[i]),
      count,
    }));
  };

  const ddEdges = [4, 8, 12, 16, 20, Infinity];
  const streakEdges = [3, 5, 7, 9, 11, Infinity];

  return {
    runs,
    sampleSize: n,
    bands: { p5, p50, p95 },
    drawdownHistogram: histogram(drawdowns, ddEdges, (a, b) =>
      b === Infinity ? `${a}%+` : `${a}–${b}%`,
    ),
    streakHistogram: histogram(streaks, streakEdges, (a, b) =>
      b === Infinity ? `${a}+` : `${a}–${b - 1}`,
    ),
    medianDrawdownPct: quantile(drawdowns, 0.5),
    worstDrawdownPct: quantile(drawdowns, 0.95),
    ruinChance: (ruin / runs) * 100,
    typicalStreak: quantile(streaks, 0.5),
    worstStreak: quantile(streaks, 0.95),
  };
}

/* ------------------------------------------------- davrlarni solishtirish */

export type PeriodStats = {
  label: string;
  count: number;
  netPnl: number;
  winRate: number;
  profitFactor: number | null;
  expectancy: number;
  avgR: number;
  maxDrawdownPct: number;
  ruleCompliance: number;
  curve: number[];
};

export function periodStats(trades: TradeLike[], from: Date, to: Date, label: string): PeriodStats {
  const inPeriod = trades.filter(
    (t) => isClosed(t) && t.closedAt! >= from && t.closedAt! < to,
  );
  const summary = summarize(inPeriod, 0);

  return {
    label,
    count: summary.count,
    netPnl: summary.netPnl,
    winRate: summary.winRate,
    profitFactor: summary.profitFactor,
    expectancy: summary.expectancy,
    avgR: summary.avgR,
    maxDrawdownPct: summary.maxDrawdownPct,
    ruleCompliance: summary.ruleCompliance,
    curve: [0, ...summary.equity.map((p) => p.balance)],
  };
}

/** Farq sezilarlimi — kichik tebranishlarni rang bilan bo'rttirmaslik uchun. */
export function meaningful(a: number, b: number, threshold = 0.1): boolean {
  const base = Math.max(Math.abs(a), Math.abs(b));
  if (base === 0) return false;
  return Math.abs(a - b) / base >= threshold;
}
