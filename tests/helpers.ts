import type { TradeLike } from '@/lib/stats';

/** Test savdosi. Standart holat: XAUUSD long, 100 punkt stop, 0.1 lot →
 *  1R = 100 × 10 × 0.1 = $100. Shunda R va P&L ni ko'z bilan tekshirish oson.
 */
export function trade(overrides: Partial<TradeLike> & { id?: string } = {}): TradeLike {
  const opened = overrides.openedAt ?? new Date('2026-09-15T09:00:00Z');
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    symbol: 'XAUUSD',
    direction: 'LONG',
    openedAt: opened,
    closedAt: overrides.closedAt ?? new Date(opened.getTime() + 60 * 60 * 1000),
    entryPrice: 3600,
    stopPrice: 3590, // 100 punkt (pipSize 0.1)
    takeProfit: null,
    exitPrice: 3620, // +200 punkt = +2R
    volume: 0.1,
    pipSize: 0.1,
    pipValuePerLot: 10,
    commission: 0,
    swap: 0,
    pnlOverride: null,
    session: 'London',
    ruleCompliant: true,
    setup: null,
    ...overrides,
  };
}

/** Berilgan R natijali savdo — statistika testlari uchun qulay. */
export function tradeWithR(r: number, overrides: Partial<TradeLike> = {}): TradeLike {
  const base = trade(overrides);
  const distance = Math.abs(base.entryPrice - base.stopPrice);
  const sign = base.direction === 'LONG' ? 1 : -1;
  return { ...base, exitPrice: base.entryPrice + sign * distance * r };
}

export function daysAgo(n: number, hour = 9): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}
