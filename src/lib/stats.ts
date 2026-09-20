/** Barcha ko'rsatkichlar shu yerda hisoblanadi — bazada saqlanmaydi.
 *  Shuning uchun savdo tahrirlanganda statistika o'zi to'g'rilanadi.
 */
import { dayKeyIn, weekdayIn } from './tz';

export type TradeLike = {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: Date;
  closedAt: Date | null;
  entryPrice: number;
  stopPrice: number;
  takeProfit: number | null;
  exitPrice: number | null;
  volume: number;
  pipSize: number;
  pipValuePerLot: number;
  commission: number;
  swap: number;
  pnlOverride: number | null;
  session: string;
  ruleCompliant: boolean;
  setup?: { id: string; name: string } | null;
};

export function isClosed(t: TradeLike): boolean {
  return t.exitPrice !== null && t.closedAt !== null;
}

/** Kirishdan stopgacha bo'lgan masofa, punktlarda. */
export function stopPips(t: TradeLike): number {
  if (!t.pipSize) return 0;
  return Math.abs(t.entryPrice - t.stopPrice) / t.pipSize;
}

/** 1R — pulda. Savdo ochilishida qabul qilingan risk. */
export function riskAmount(t: TradeLike): number {
  return stopPips(t) * t.pipValuePerLot * t.volume;
}

/** Yopilgan savdoning sof natijasi. Broker qiymati berilgan bo'lsa — o'sha. */
export function netPnl(t: TradeLike): number {
  if (t.pnlOverride !== null && t.pnlOverride !== undefined) return t.pnlOverride;
  if (t.exitPrice === null) return 0;
  const dir = t.direction === 'LONG' ? 1 : -1;
  const pips = (dir * (t.exitPrice - t.entryPrice)) / t.pipSize;
  return pips * t.pipValuePerLot * t.volume - t.commission - t.swap;
}

/** Ochiq pozitsiyaning joriy natijasi berilgan narxda. */
export function floatingPnl(t: TradeLike, currentPrice: number): number {
  const dir = t.direction === 'LONG' ? 1 : -1;
  const pips = (dir * (currentPrice - t.entryPrice)) / t.pipSize;
  return pips * t.pipValuePerLot * t.volume - t.commission - t.swap;
}

export function rMultiple(t: TradeLike): number {
  const risk = riskAmount(t);
  if (risk <= 0) return 0;
  return netPnl(t) / risk;
}

/** Reja bo'yicha R:R nisbati (take profit berilgan bo'lsa). */
export function plannedRR(t: TradeLike): number | null {
  if (t.takeProfit === null) return null;
  const stop = Math.abs(t.entryPrice - t.stopPrice);
  if (stop <= 0) return null;
  return Math.abs(t.takeProfit - t.entryPrice) / stop;
}

export function holdMs(t: TradeLike): number {
  if (!t.closedAt) return 0;
  return t.closedAt.getTime() - t.openedAt.getTime();
}

const BREAKEVEN = 0.05; // ±0.05R oralig'i breakeven deb qaraladi

export type Summary = {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  avgR: number;
  totalR: number;
  best: number;
  worst: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgHoldMs: number;
  ruleCompliance: number;
  balance: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  equity: { at: Date; balance: number }[];
};

export function summarize(trades: TradeLike[], startingBalance: number): Summary {
  const closed = trades
    .filter(isClosed)
    .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());

  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalR = 0;
  let holdTotal = 0;
  let best = 0;
  let worst = 0;
  let compliant = 0;

  let winStreak = 0;
  let lossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const equity: { at: Date; balance: number }[] = [];

  for (const t of closed) {
    const pnl = netPnl(t);
    const r = rMultiple(t);

    totalR += r;
    holdTotal += holdMs(t);
    if (t.ruleCompliant) compliant += 1;
    if (pnl > best) best = pnl;
    if (pnl < worst) worst = pnl;

    if (r > BREAKEVEN) {
      wins += 1;
      grossProfit += pnl;
      winStreak += 1;
      lossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, winStreak);
    } else if (r < -BREAKEVEN) {
      losses += 1;
      grossLoss += Math.abs(pnl);
      lossStreak += 1;
      winStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
    } else {
      breakeven += 1;
      winStreak = 0;
      lossStreak = 0;
    }

    balance += pnl;
    equity.push({ at: t.closedAt!, balance });

    if (balance > peak) peak = balance;
    const dd = peak - balance;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  const n = closed.length;
  const decided = wins + losses;
  const netPnlTotal = balance - startingBalance;

  return {
    count: n,
    wins,
    losses,
    breakeven,
    winRate: decided ? (wins / decided) * 100 : 0,
    netPnl: netPnlTotal,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    expectancy: n ? netPnlTotal / n : 0,
    avgWin: wins ? grossProfit / wins : 0,
    avgLoss: losses ? grossLoss / losses : 0,
    avgR: n ? totalR / n : 0,
    totalR,
    best,
    worst,
    longestWinStreak,
    longestLossStreak,
    avgHoldMs: n ? holdTotal / n : 0,
    ruleCompliance: n ? (compliant / n) * 100 : 0,
    balance,
    maxDrawdown,
    maxDrawdownPct,
    equity,
  };
}

export type GroupRow = { key: string; count: number; netPnl: number; winRate: number; avgR: number };

export function groupBy(
  trades: TradeLike[],
  keyOf: (t: TradeLike) => string,
): GroupRow[] {
  const map = new Map<string, { count: number; netPnl: number; wins: number; decided: number; r: number }>();

  for (const t of trades.filter(isClosed)) {
    const key = keyOf(t) || '—';
    const row = map.get(key) ?? { count: 0, netPnl: 0, wins: 0, decided: 0, r: 0 };
    const r = rMultiple(t);
    row.count += 1;
    row.netPnl += netPnl(t);
    row.r += r;
    if (r > BREAKEVEN) {
      row.wins += 1;
      row.decided += 1;
    } else if (r < -BREAKEVEN) {
      row.decided += 1;
    }
    map.set(key, row);
  }

  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      count: v.count,
      netPnl: v.netPnl,
      winRate: v.decided ? (v.wins / v.decided) * 100 : 0,
      avgR: v.count ? v.r / v.count : 0,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);
}

/** R-multiple taqsimoti: −3R dan +4R gacha savatlar. */
export function rDistribution(trades: TradeLike[]): { label: string; count: number; sign: number }[] {
  const buckets = [-3, -2, -1, 0, 1, 2, 3, 4];
  const counts = new Map<number, number>(buckets.map((b) => [b, 0]));

  for (const t of trades.filter(isClosed)) {
    const r = rMultiple(t);
    let b = Math.round(r);
    if (b < -3) b = -3;
    if (b > 4) b = 4;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  return buckets.map((b) => ({
    label: b === 0 ? '0R' : `${b > 0 ? '+' : '−'}${Math.abs(b)}R`,
    count: counts.get(b) ?? 0,
    sign: Math.sign(b),
  }));
}

export type DayCell = { day: number; netPnl: number; count: number } | null;

/** Oy kalendarini dushanbadan boshlanadigan haftalarga bo'ladi.
 *  Kun chegarasi foydalanuvchi mintaqasida aniqlanadi.
 */
export function monthCalendar(
  trades: TradeLike[],
  year: number,
  month: number,
  timeZone: string,
) {
  const byDay = new Map<number, { netPnl: number; count: number }>();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

  for (const t of trades.filter(isClosed)) {
    const key = dayKeyIn(t.closedAt!, timeZone);
    if (!key.startsWith(prefix)) continue;
    const day = Number(key.slice(-2));
    const row = byDay.get(day) ?? { netPnl: 0, count: 0 };
    row.netPnl += netPnl(t);
    row.count += 1;
    byDay.set(day, row);
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Oyning birinchi kuni haftaning qaysi kuni — mintaqadan qat'i nazar bir xil.
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells: DayCell[] = Array(lead).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const row = byDay.get(day);
    cells.push({ day, netPnl: row?.netPnl ?? 0, count: row?.count ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Hafta kunlari kesimi — dushanbadan jumagacha. */
export function weekdayBreakdown(trades: TradeLike[], timeZone: string) {
  const totals = Array(7).fill(0) as number[];
  const counts = Array(7).fill(0) as number[];

  for (const t of trades.filter(isClosed)) {
    const i = weekdayIn(t.closedAt!, timeZone);
    totals[i] += netPnl(t);
    counts[i] += 1;
  }
  return totals.map((netPnl, i) => ({ index: i, netPnl, count: counts[i] }));
}

/** Zarardan keyin darhol ochilgan savdolarning win rate'i.
 *  Ketma-ket stop ogohlantirishida aniq raqam berish uchun.
 */
export function winRateAfterLoss(trades: TradeLike[]): { winRate: number; count: number } {
  const closed = trades
    .filter(isClosed)
    .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());

  let wins = 0;
  let decided = 0;

  for (let i = 1; i < closed.length; i += 1) {
    if (rMultiple(closed[i - 1]) >= -BREAKEVEN) continue;
    const r = rMultiple(closed[i]);
    if (r > BREAKEVEN) {
      wins += 1;
      decided += 1;
    } else if (r < -BREAKEVEN) {
      decided += 1;
    }
  }

  return { winRate: decided ? (wins / decided) * 100 : 0, count: decided };
}

/** Oxirgi yopilgan savdolar, yangi birinchi. */
export function recentClosed(trades: TradeLike[], take = 5): TradeLike[] {
  return trades
    .filter(isClosed)
    .sort((a, b) => b.closedAt!.getTime() - a.closedAt!.getTime())
    .slice(0, take);
}

/** Berilgan kunning natijasi — risk limitini tekshirish uchun.
 *  Kun foydalanuvchi mintaqasida aniqlanadi.
 */
export function pnlOnDay(trades: TradeLike[], dayKey: string, timeZone: string): number {
  return trades
    .filter(isClosed)
    .filter((t) => dayKeyIn(t.closedAt!, timeZone) === dayKey)
    .reduce((sum, t) => sum + netPnl(t), 0);
}

/** Shu kunda yopilgan savdolar. */
export function tradesOnDay(
  trades: TradeLike[],
  dayKey: string,
  timeZone: string,
): TradeLike[] {
  return trades.filter((t) => isClosed(t) && dayKeyIn(t.closedAt!, timeZone) === dayKey);
}
