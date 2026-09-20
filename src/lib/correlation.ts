/** Korrelyatsiya — tarixiy narxlardan emas, instrument tarkibidan.
 *
 *  Tarixiy bog'liqlikni hisoblash uchun tashqi narx ma'lumoti kerak bo'lardi.
 *  Buning o'rniga oddiy va ishonchli usul: har bir instrument qaysi
 *  valyutalardan tashkil topganini bilgan holda umumiy valyuta bo'yicha
 *  guruhlaymiz. EURUSD, GBPUSD va XAUUSD bo'yicha long — aslida dollarga
 *  qarshi bitta yirik pozitsiya.
 */
import { fill, type Dict } from './i18n';

type Pair = { base: string; quote: string };

const PAIRS: Record<string, Pair> = {
  EURUSD: { base: 'EUR', quote: 'USD' },
  GBPUSD: { base: 'GBP', quote: 'USD' },
  AUDUSD: { base: 'AUD', quote: 'USD' },
  NZDUSD: { base: 'NZD', quote: 'USD' },
  USDCAD: { base: 'USD', quote: 'CAD' },
  USDCHF: { base: 'USD', quote: 'CHF' },
  USDJPY: { base: 'USD', quote: 'JPY' },
  EURJPY: { base: 'EUR', quote: 'JPY' },
  GBPJPY: { base: 'GBP', quote: 'JPY' },
  XAUUSD: { base: 'XAU', quote: 'USD' },
  XAGUSD: { base: 'XAG', quote: 'USD' },
  BTCUSD: { base: 'BTC', quote: 'USD' },
  ETHUSD: { base: 'ETH', quote: 'USD' },
  US30: { base: 'US30', quote: 'USD' },
  NAS100: { base: 'NAS100', quote: 'USD' },
};

/** Shu yo'nalishdagi savdo qaysi valyutaga qarshi turgani.
 *  Long EURUSD = EUR ga uzun, USD ga qisqa.
 */
export function exposure(symbol: string, direction: 'LONG' | 'SHORT') {
  const pair = PAIRS[symbol.toUpperCase()];
  if (!pair) return null;
  const long = direction === 'LONG';
  return {
    longCurrency: long ? pair.base : pair.quote,
    shortCurrency: long ? pair.quote : pair.base,
  };
}

export type Position = {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  risk: number;
};

export type CorrelationGroup = {
  currency: string;
  side: 'long' | 'short';
  positions: Position[];
  totalRisk: number;
};

/** Ikki va undan ortiq pozitsiya bitta valyutaga bir tomondan tursa —
 *  bu bitta savdo bilan barobar.
 */
export function correlationGroups(positions: Position[]): CorrelationGroup[] {
  const map = new Map<string, CorrelationGroup>();

  for (const p of positions) {
    const e = exposure(p.symbol, p.direction);
    if (!e) continue;

    for (const [currency, side] of [
      [e.longCurrency, 'long'] as const,
      [e.shortCurrency, 'short'] as const,
    ]) {
      // Indeks va kripto o'zi bitta aktiv — ularni guruhlash ma'nosiz.
      if (currency.length !== 3) continue;
      const key = `${currency}:${side}`;
      const group = map.get(key) ?? { currency, side, positions: [], totalRisk: 0 };
      group.positions.push(p);
      group.totalRisk += p.risk;
      map.set(key, group);
    }
  }

  return [...map.values()]
    .filter((g) => g.positions.length >= 2)
    .sort((a, b) => b.totalRisk - a.totalRisk);
}

/** Shu yo'nalishda yuradigan boshqa instrumentlar — tavsiya uchun. */
export function relatedSymbols(currency: string, side: 'long' | 'short'): string[] {
  const out: string[] = [];
  for (const [symbol, pair] of Object.entries(PAIRS)) {
    if (pair.base === currency) out.push(side === 'long' ? symbol : `${symbol} (teskari)`);
    else if (pair.quote === currency) out.push(side === 'long' ? `${symbol} (teskari)` : symbol);
  }
  return out.slice(0, 5);
}

export function describeGroup(group: CorrelationGroup, d: Dict): string {
  return fill(d.correlation.describe, {
    names: group.positions.map((p) => p.symbol).join(', '),
    currency: group.currency,
    direction: group.side === 'long' ? d.correlation.toward : d.correlation.against,
  });
}
