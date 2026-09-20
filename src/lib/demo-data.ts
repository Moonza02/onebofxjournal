import { DEFAULT_INSTRUMENTS } from './instruments';
import { defaultChecks, starterSetups } from './starter-data';
import type { Dict } from './i18n';

/** Namuna ma'lumot generatori.
 *
 *  Bu yerda baza yo'q — faqat oddiy obyektlar qaytadi. Shuning uchun
 *  ikki joyda ishlatiladi: `prisma/seed.ts` (kompyuterda sinash uchun)
 *  va demo rejim (mehmon ilovani to'la holda ko'rishi uchun).
 *
 *  DIQQAT: bu savdolar **o'ylab topilgan**. Ular hech qanday haqiqiy
 *  hisobdan olinmagan va natija sifatida ko'rsatilmasligi kerak.
 *
 *  Generator determinlashgan: bir xil urug'dan bir xil ma'lumot chiqadi,
 *  shuning uchun sinash mumkin.
 */

/** Namuna hisob shuncha soat yashaydi. */
export const DEMO_TTL_HOURS = 24;

export type DemoTrade = {
  /** Faqat generator ichida: shu bilan natija `TradeLike` sifatida
   *  hisoblab ko'riladi. Bazaga yozilmaydi — id ni baza o'zi beradi.
   */
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
  /** Broker bergan tayyor natija — namunada ishlatilmaydi. */
  pnlOverride: number | null;
  session: string;
  timeframe: string;
  tags: string[];
  notes: string;
  isBacktest: boolean;
  ruleCompliant: boolean;
  discipline: number | null;
  patience: number | null;
  confidence: number | null;
  stress: number | null;
  /** Qaysi setup — nom bo'yicha, chunki id baza tomonda beriladi. */
  setupName: string;
  checks: { label: string; order: number; passed: boolean }[];
};

export type DemoJournal = {
  date: Date;
  plan: string;
  notes: string;
  review: string;
  lessons: string[];
  tags: string[];
  discipline: number;
  patience: number;
  focus: number;
  stress: number;
  habitsDone: string[];
};

export type DemoData = {
  account: {
    name: string;
    broker: string;
    startingBalance: number;
    program: 'HYPER_GROWTH';
    dailyLossPct: number;
    maxDrawdownPct: number;
    profitTargetPct: number;
    riskPerTradePct: number;
  };
  instruments: typeof DEFAULT_INSTRUMENTS;
  setups: ReturnType<typeof starterSetups>;
  trades: DemoTrade[];
  journal: DemoJournal[];
};

const BASE_PRICE: Record<string, number> = {
  XAUUSD: 3640,
  EURUSD: 1.174,
  GBPUSD: 1.352,
  USDJPY: 147.2,
  GBPJPY: 198.6,
  BTCUSD: 116000,
};

/** Takrorlanadigan natija uchun oddiy determinlashgan generator. */
function makeRandom(seed: number) {
  let state = seed % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Sessiya nomi bazada o'zbekcha saqlanadi — u ma'lumot, yorliq emas. */
function sessionFor(hour: number): string {
  if (hour < 11) return 'Osiyo';
  if (hour < 16) return 'London';
  if (hour < 18) return 'Overlap';
  return 'Nyu-York';
}

export type DemoOptions = {
  d: Dict;
  /** "Bugun" — sinovda qotirib qo'yish uchun. */
  now?: Date;
  seed?: number;
  /** Necha kunlik tarix. */
  days?: number;
};

export function buildDemoData(options: DemoOptions): DemoData {
  const { d } = options;
  const now = options.now ?? new Date();
  const days = options.days ?? 90;
  const rnd = makeRandom(options.seed ?? 20260919);
  const pick = <T,>(items: T[]): T => items[Math.floor(rnd() * items.length)];

  const setups = starterSetups(d);
  const checks = defaultChecks(d);
  const symbols = Object.keys(BASE_PRICE);
  const trades: DemoTrade[] = [];

  /** Bitta yopilgan savdo. */
  function closedTrade(day: Date): DemoTrade {
    const symbol = pick(symbols);
    const spec = DEFAULT_INSTRUMENTS.find((s) => s.symbol === symbol)!;
    const setup = pick(setups);
    const direction = rnd() > 0.45 ? 'LONG' : 'SHORT';
    const sign = direction === 'LONG' ? 1 : -1;

    const base = BASE_PRICE[symbol];
    const entryPrice = Number((base * (1 + (rnd() - 0.5) * 0.01)).toFixed(spec.priceDecimals));

    // 1R ≈ hisobning bir foizi bo'ladigan qilib stop va hajm tanlanadi.
    const stopPips = 80 + Math.floor(rnd() * 160);
    const stopPrice = Number(
      (entryPrice - sign * stopPips * spec.pipSize).toFixed(spec.priceDecimals),
    );
    const volume = Number(Math.max(0.01, 150 / (stopPips * spec.pipValuePerLot)).toFixed(2));
    const takeProfit = Number(
      (entryPrice + sign * stopPips * spec.pipSize * 2.2).toFixed(spec.priceDecimals),
    );

    // Uchinchi setup ataylab zaifroq — playbook reytingida farq ko'rinsin.
    const weak = setup.name === 'FVG Retest';
    const win = rnd() < (weak ? 0.34 : 0.56);
    const rTarget = win ? 1.2 + rnd() * 1.9 : -(0.75 + rnd() * 0.3);
    const exitPrice = Number(
      (entryPrice + sign * stopPips * spec.pipSize * rTarget).toFixed(spec.priceDecimals),
    );

    const openedAt = new Date(day);
    openedAt.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);
    const closedAt = new Date(openedAt.getTime() + (25 + rnd() * 320) * 60000);
    const compliant = rnd() > 0.22;

    return {
      id: `demo-${trades.length + 1}`,
      symbol,
      direction,
      openedAt,
      closedAt,
      entryPrice,
      stopPrice,
      takeProfit,
      exitPrice,
      volume,
      pipSize: spec.pipSize,
      pipValuePerLot: spec.pipValuePerLot,
      commission: Number((volume * 7).toFixed(2)),
      swap: 0,
      pnlOverride: null,
      session: sessionFor(openedAt.getHours()),
      timeframe: pick(['M5', 'M15', 'H1']),
      tags: win ? [d.demo.tagPlan] : [d.demo.tagReview],
      notes: win ? d.demo.noteWin : d.demo.noteLoss,
      isBacktest: false,
      ruleCompliant: compliant,
      discipline: 3 + Math.floor(rnd() * 3),
      patience: 2 + Math.floor(rnd() * 4),
      confidence: 2 + Math.floor(rnd() * 4),
      stress: 1 + Math.floor(rnd() * 4),
      setupName: setup.name,
      checks: checks.map((label, order) => ({
        label,
        order,
        passed: compliant ? true : order !== checks.length - 1,
      })),
    };
  }

  /* ------------------------------------------------------------ savdolar */

  for (let daysAgo = days; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);

    // Dam olish kunlarida savdo yo'q.
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    if (rnd() > 0.55) continue;

    const count = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < count; i += 1) trades.push(closedTrade(day));
  }

  /* ----------------------------------------------------------- backtest */

  // Alohida rejim bo'sh turmasin. Bu savdolar statistikaga qo'shilmaydi,
  // va natijasi ataylab yaxshiroq — real bilan farqi ko'rinsin.
  for (let i = 0; i < 14; i += 1) {
    const spec = DEFAULT_INSTRUMENTS[0];
    const direction = rnd() > 0.5 ? 'LONG' : 'SHORT';
    const sign = direction === 'LONG' ? 1 : -1;

    const entryPrice = Number((3600 * (1 + (rnd() - 0.5) * 0.02)).toFixed(spec.priceDecimals));
    const stopPips = 100 + Math.floor(rnd() * 120);
    const stopPrice = Number(
      (entryPrice - sign * stopPips * spec.pipSize).toFixed(spec.priceDecimals),
    );
    const rTarget = rnd() < 0.68 ? 1.5 + rnd() * 1.8 : -1;
    const exitPrice = Number(
      (entryPrice + sign * stopPips * spec.pipSize * rTarget).toFixed(spec.priceDecimals),
    );

    const openedAt = new Date(now);
    openedAt.setDate(openedAt.getDate() - (days + 30 + i * 2));
    openedAt.setHours(10, 0, 0, 0);

    trades.push({
      id: `demo-bt-${i + 1}`,
      symbol: spec.symbol,
      direction,
      openedAt,
      closedAt: new Date(openedAt.getTime() + 120 * 60000),
      entryPrice,
      stopPrice,
      takeProfit: null,
      exitPrice,
      volume: 0.2,
      pipSize: spec.pipSize,
      pipValuePerLot: spec.pipValuePerLot,
      commission: 0,
      swap: 0,
      pnlOverride: null,
      session: 'London',
      timeframe: 'M15',
      tags: [],
      notes: d.demo.noteBacktest,
      isBacktest: true,
      ruleCompliant: true,
      discipline: null,
      patience: null,
      confidence: null,
      stress: null,
      setupName: setups[0].name,
      checks: [],
    });
  }

  /* --------------------------------------------------- ochiq pozitsiya */

  // Panelda "Ochiq pozitsiya" bloki bo'sh turmasin.
  //
  // Vaqt epochdan hisoblanadi: `setHours(getHours() - 2)` tunda kunni
  // orqaga surib yuborardi. Dam olish kuniga tushsa oxirgi ish kuniga
  // tortiladi — qolgan savdolar ham faqat ish kunlarida.
  const openedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  openedAt.setMinutes(14, 0, 0);
  while (openedAt.getDay() === 0 || openedAt.getDay() === 6) {
    openedAt.setDate(openedAt.getDate() - 1);
  }

  trades.push({
    id: 'demo-open',
    symbol: 'XAUUSD',
    direction: 'LONG',
    openedAt,
    closedAt: null,
    entryPrice: 3712.4,
    stopPrice: 3694,
    takeProfit: 3782,
    exitPrice: null,
    volume: 0.3,
    pipSize: 0.1,
    pipValuePerLot: 10,
    commission: 2.1,
    swap: 0,
    pnlOverride: null,
    session: 'London',
    timeframe: 'M15',
    tags: [d.demo.tagOpen],
    notes: d.demo.noteOpen,
    isBacktest: false,
    ruleCompliant: true,
    discipline: null,
    patience: null,
    confidence: null,
    stress: null,
    setupName: setups[0].name,
    checks: checks.map((label, order) => ({ label, order, passed: true })),
  });

  /* ----------------------------------------------------------- kundalik */

  const journal: DemoJournal[] = [];
  const habits = ['habit1', 'habit2', 'habit3', 'habit4', 'habit5'];

  for (let daysAgo = 12; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    if (rnd() > 0.7) continue;

    // Kundalik sanalari vaqt mintaqasidan qat'i nazar bir xil turishi
    // uchun UTC yarim tunida saqlanadi.
    const date = new Date(
      Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0),
    );

    journal.push({
      date,
      plan: pick([d.demo.plan1, d.demo.plan2, d.demo.plan3]),
      notes: pick([d.demo.notes1, d.demo.notes2]),
      review: pick([d.demo.review1, d.demo.review2]),
      lessons: [pick([d.demo.lesson1, d.demo.lesson2, d.demo.lesson3])],
      tags: [pick([d.demo.jTag1, d.demo.jTag2, d.demo.jTag3])],
      discipline: 3 + Math.floor(rnd() * 3),
      patience: 2 + Math.floor(rnd() * 4),
      focus: 3 + Math.floor(rnd() * 3),
      stress: 1 + Math.floor(rnd() * 4),
      habitsDone: habits.filter(() => rnd() > 0.35),
    });
  }

  return {
    account: {
      name: d.demo.accountName,
      broker: d.demo.broker,
      startingBalance: 14212.3,
      program: 'HYPER_GROWTH',
      dailyLossPct: 3,
      maxDrawdownPct: 6,
      profitTargetPct: 10,
      riskPerTradePct: 1,
    },
    instruments: DEFAULT_INSTRUMENTS,
    setups,
    trades,
    journal,
  };
}
