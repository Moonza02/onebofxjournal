/** Standart instrument spetsifikatsiyalari.
 *  pipValuePerLot — 1 lot uchun bitta punktning taxminiy USD qiymati.
 *  USDJPY kabi juftliklarda bu qiymat kursga qarab suzadi; jurnal uchun
 *  doimiy qiymat yetarli, lekin foydalanuvchi uni har savdoda o'zgartira oladi.
 */
export type InstrumentSpec = {
  symbol: string;
  pipSize: number;
  pipValuePerLot: number;
  priceDecimals: number;
};

export const DEFAULT_INSTRUMENTS: InstrumentSpec[] = [
  { symbol: 'XAUUSD', pipSize: 0.1, pipValuePerLot: 10, priceDecimals: 2 },
  { symbol: 'XAGUSD', pipSize: 0.01, pipValuePerLot: 50, priceDecimals: 3 },
  { symbol: 'EURUSD', pipSize: 0.0001, pipValuePerLot: 10, priceDecimals: 5 },
  { symbol: 'GBPUSD', pipSize: 0.0001, pipValuePerLot: 10, priceDecimals: 5 },
  { symbol: 'AUDUSD', pipSize: 0.0001, pipValuePerLot: 10, priceDecimals: 5 },
  { symbol: 'NZDUSD', pipSize: 0.0001, pipValuePerLot: 10, priceDecimals: 5 },
  { symbol: 'USDCAD', pipSize: 0.0001, pipValuePerLot: 7.3, priceDecimals: 5 },
  { symbol: 'USDCHF', pipSize: 0.0001, pipValuePerLot: 11.2, priceDecimals: 5 },
  { symbol: 'USDJPY', pipSize: 0.01, pipValuePerLot: 6.8, priceDecimals: 3 },
  { symbol: 'EURJPY', pipSize: 0.01, pipValuePerLot: 6.8, priceDecimals: 3 },
  { symbol: 'GBPJPY', pipSize: 0.01, pipValuePerLot: 6.8, priceDecimals: 3 },
  { symbol: 'US30', pipSize: 1, pipValuePerLot: 1, priceDecimals: 1 },
  { symbol: 'NAS100', pipSize: 1, pipValuePerLot: 1, priceDecimals: 1 },
  { symbol: 'BTCUSD', pipSize: 1, pipValuePerLot: 1, priceDecimals: 1 },
  { symbol: 'ETHUSD', pipSize: 0.1, pipValuePerLot: 1, priceDecimals: 2 },
];

const BY_SYMBOL = new Map(DEFAULT_INSTRUMENTS.map((i) => [i.symbol, i]));

export function specFor(symbol: string): InstrumentSpec {
  return (
    BY_SYMBOL.get(symbol.toUpperCase()) ?? {
      symbol: symbol.toUpperCase(),
      pipSize: 0.0001,
      pipValuePerLot: 10,
      priceDecimals: 5,
    }
  );
}

/** Narxning ishonarli oralig'i — AI dan mustaqil mantiqiy tekshiruv uchun.
 *  Oraliq ataylab keng: maqsad noto'g'ri o'qilgan raqamni tutish
 *  (masalan 364.21 yoki 36421), bozor harakatini cheklash emas.
 */
const PRICE_RANGE: Record<string, [number, number]> = {
  XAUUSD: [1200, 8000],
  XAGUSD: [10, 120],
  EURUSD: [0.8, 1.6],
  GBPUSD: [0.9, 1.9],
  AUDUSD: [0.5, 1.1],
  NZDUSD: [0.4, 1.0],
  USDCAD: [1.0, 1.8],
  USDCHF: [0.6, 1.3],
  USDJPY: [80, 250],
  EURJPY: [90, 280],
  GBPJPY: [110, 320],
  US30: [20000, 80000],
  NAS100: [8000, 40000],
  BTCUSD: [5000, 500000],
  ETHUSD: [200, 20000],
};

/** Narx shu instrument uchun ishonarlimi. Noma'lum instrument — har doim true. */
export function plausiblePrice(symbol: string, price: number): boolean {
  const range = PRICE_RANGE[symbol.toUpperCase()];
  if (!range) return true;
  return price >= range[0] && price <= range[1];
}

export const SESSIONS = ['Osiyo', 'London', 'Nyu-York', 'Overlap'] as const;
export const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as const;

