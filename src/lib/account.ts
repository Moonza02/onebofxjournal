import 'server-only';
import { db } from './db';
import { requireUser, type SessionUser } from './session';
import type { TradeLike } from './stats';

export type ProgramKey = 'HYPER_GROWTH' | 'HIGH_STAKES' | 'BOOTCAMP' | 'CUSTOM';

export type AccountRow = {
  id: string;
  userId: string;
  name: string;
  broker: string;
  login: string;
  currency: string;
  startingBalance: number;
  program: ProgramKey;
  dailyLossPct: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
  riskPerTradePct: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
};

export type TradeRow = TradeLike & {
  timeframe: string;
  isBacktest: boolean;
  tags: string[];
};

/** Joriy foydalanuvchi va uning faol hisobi.
 *  Hisob bo'lmasa (eski yozuvlar) — birinchi hisob olinadi yoki yangisi ochiladi.
 */
export async function getActiveAccount(): Promise<{ user: SessionUser; account: AccountRow }> {
  const user = await requireUser();

  let account: AccountRow | null = await db.account.findFirst({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  });

  if (!account) {
    account = (await db.account.create({
      data: { userId: user.id, name: DEFAULT_ACCOUNT_NAME, startingBalance: 10000 },
    })) as AccountRow;
  }

  return { user, account };
}

export async function getAccounts(userId: string): Promise<AccountRow[]> {
  return db.account.findMany({
    where: { userId },
    orderBy: [{ isArchived: 'asc' }, { createdAt: 'asc' }],
  });
}

export const TRADE_SELECT = {
  id: true,
  symbol: true,
  direction: true,
  openedAt: true,
  closedAt: true,
  entryPrice: true,
  stopPrice: true,
  takeProfit: true,
  exitPrice: true,
  volume: true,
  pipSize: true,
  pipValuePerLot: true,
  commission: true,
  swap: true,
  pnlOverride: true,
  session: true,
  timeframe: true,
  ruleCompliant: true,
  isBacktest: true,
  tags: true,
  setup: { select: { id: true, name: true } },
} as const;

/** Hisobning yopilgan va ochiq savdolari, yangi birinchi. */
export async function getTrades(
  accountId: string,
  options?: { take?: number; backtest?: boolean },
): Promise<TradeRow[]> {
  return db.trade.findMany({
    where: { accountId, isBacktest: options?.backtest ?? false },
    orderBy: { openedAt: 'desc' },
    take: options?.take,
    select: TRADE_SELECT,
  });
}

export const PAGE_SIZE = 50;

/** Davr filtri — statistikaga nechta savdo kirishini cheklaydi.
 *  Jurnalda yillar davomida minglab yozuv to'planadi; hammasini har
 *  sahifada yuklash kerak emas.
 */
export const PERIODS = {
  '30': { labelKey: 'period30', days: 30 },
  '90': { labelKey: 'period90', days: 90 },
  '365': { labelKey: 'period365', days: 365 },
  all: { labelKey: 'periodAll', days: null },
} as const;

export type PeriodKey = keyof typeof PERIODS;

export function periodFrom(period: PeriodKey): Date | null {
  const days = PERIODS[period]?.days;
  if (!days) return null;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from;
}

export type TradeQuery = {
  accountId: string;
  backtest?: boolean;
  period?: PeriodKey;
  symbol?: string;
  session?: string;
  setupName?: string;
  /** win | loss | open */
  result?: string;
  page?: number;
};

/** Filtrlar bazada qo'llanadi — keraksiz yozuvlar umuman yuklanmaydi. */
function whereFor(query: TradeQuery) {
  const from = periodFrom(query.period ?? '365');

  return {
    accountId: query.accountId,
    isBacktest: query.backtest ?? false,
    ...(from ? { openedAt: { gte: from } } : {}),
    ...(query.symbol ? { symbol: query.symbol } : {}),
    ...(query.session ? { session: query.session } : {}),
    ...(query.setupName ? { setup: { name: query.setupName } } : {}),
    ...(query.result === 'open' ? { exitPrice: null } : {}),
    ...(query.result === 'win' || query.result === 'loss' ? { NOT: { exitPrice: null } } : {}),
  };
}

/** Filtrlangan savdolar: statistika uchun to'liq ro'yxat va jadval uchun sahifa.
 *  G'alaba/mag'lubiyat filtri R ga bog'liq bo'lgani uchun u kodda qo'llanadi —
 *  R bazada saqlanmaydi.
 */
export async function queryTrades(query: TradeQuery): Promise<{
  all: TradeRow[];
  page: TradeRow[];
  total: number;
  pageIndex: number;
  pageCount: number;
}> {
  const rows: TradeRow[] = await db.trade.findMany({
    where: whereFor(query),
    orderBy: { openedAt: 'desc' },
    select: TRADE_SELECT,
  });

  const all =
    query.result === 'win' || query.result === 'loss'
      ? rows.filter((t) => {
          const risk = (Math.abs(t.entryPrice - t.stopPrice) / t.pipSize) * t.pipValuePerLot * t.volume;
          if (risk <= 0 || t.exitPrice === null) return false;
          const dir = t.direction === 'LONG' ? 1 : -1;
          const pnl =
            t.pnlOverride ??
            ((dir * (t.exitPrice - t.entryPrice)) / t.pipSize) * t.pipValuePerLot * t.volume -
              t.commission -
              t.swap;
          return query.result === 'win' ? pnl / risk > 0.05 : pnl / risk < -0.05;
        })
      : rows;

  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(0, (query.page ?? 1) - 1), pageCount - 1);

  return {
    all,
    page: all.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    total,
    pageIndex,
    pageCount,
  };
}

/** Filtrlar uchun mavjud qiymatlar — bazadan, butun tarix bo'yicha. */
export async function getTradeFilters(accountId: string, backtest = false) {
  const rows: { symbol: string; session: string; setup: { name: string } | null }[] =
    await db.trade.findMany({
      where: { accountId, isBacktest: backtest },
      select: { symbol: true, session: true, setup: { select: { name: true } } },
      distinct: ['symbol', 'session', 'setupId'],
    });

  return {
    symbols: [...new Set(rows.map((r) => r.symbol))].sort(),
    sessions: [...new Set(rows.map((r) => r.session).filter(Boolean))].sort(),
    setups: [...new Set(rows.map((r) => r.setup?.name).filter(Boolean))].sort() as string[],
  };
}

export type SetupRow = {
  id: string;
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  riskRules: string[];
  timeframes: string[];
  sessions: string[];
  status: 'ACTIVE' | 'TESTING' | 'ARCHIVED';
};

export async function getSetups(userId: string): Promise<SetupRow[]> {
  return db.setup.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

/** Formadagi ochiluvchi ro'yxat uchun — arxivlanganlarsiz.
 *  Kirish qoidalari ham keladi: setup tanlanganda checklist shundan to'ladi.
 */
export async function getSetupOptions(
  userId: string,
): Promise<{ id: string; name: string; entryRules: string[] }[]> {
  return db.setup.findMany({
    where: { userId, status: { not: 'ARCHIVED' } },
    select: { id: true, name: true, entryRules: true },
    orderBy: { name: 'asc' },
  });
}

export type TradeDetail = TradeRow & {
  timeframe: string;
  notes: string;
  source: string;
  pnlOverride: number | null;
  discipline: number | null;
  patience: number | null;
  confidence: number | null;
  stress: number | null;
  setupId: string | null;
  screenshotKey: string | null;
  commission: number;
  swap: number;
  checks: { id: string; label: string; passed: boolean; order: number }[];
  account: { name: string; startingBalance: number; riskPerTradePct: number };
};

export async function getTradeDetail(
  tradeId: string,
  userId: string,
): Promise<TradeDetail | null> {
  return db.trade.findFirst({
    where: { id: tradeId, account: { userId } },
    include: {
      setup: { select: { id: true, name: true } },
      checks: { orderBy: { order: 'asc' } },
      account: { select: { name: true, startingBalance: true, riskPerTradePct: true } },
    },
  });
}

/** Yangi hisob nomi bazada shu ko'rinishda saqlanadi. Ro'yxatdan o'tishda
 *  tanlangan til bo'yicha yoziladi; bu esa faqat zaxira yo'l.
 */
export const DEFAULT_ACCOUNT_NAME = 'Asosiy hisob';

export const PROGRAM_PRESETS = {
  HYPER_GROWTH: { label: 'The5ers — Hyper Growth', daily: 3, max: 6, target: 10 },
  HIGH_STAKES: { label: 'The5ers — High Stakes', daily: 5, max: 10, target: 8 },
  BOOTCAMP: { label: 'The5ers — Bootcamp', daily: 0, max: 5, target: 6 },
  CUSTOM: { label: 'CUSTOM', daily: 3, max: 6, target: 10 },
} as const;
