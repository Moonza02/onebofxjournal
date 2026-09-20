import 'server-only';
import { db, type Tx } from './db';
import {
  activePlan,
  extendUntil,
  has,
  limits,
  periodFor,
  priceFor,
  TRIAL_DAYS,
  type ActivePlan,
  type Feature,
  type Plan,
} from './billing';
import { monthRangeIn, partsIn } from './tz';

/** To'lovlar va tarif holati — bazaga tegadigan qismi.
 *  Narx va ruxsat mantig'i `billing.ts` da, u yer toza va testlanadi.
 */

export type PaymentProvider = 'PAYME' | 'CLICK' | 'UZUM' | 'MANUAL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type PaymentRow = {
  id: string;
  userId: string;
  plan: Plan;
  months: number;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerTxId: string | null;
  state: number;
  cancelReason: number | null;
  reference: string;
  createdAt: Date;
  txCreatedAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
};

export const PAYMENT_SELECT = {
  id: true,
  userId: true,
  plan: true,
  months: true,
  amount: true,
  provider: true,
  status: true,
  providerTxId: true,
  state: true,
  cancelReason: true,
  reference: true,
  createdAt: true,
  txCreatedAt: true,
  paidAt: true,
  cancelledAt: true,
} as const;

/** Ro'yxatdan o'tganda beriladigan sinov muddati tugash sanasi. */
export function trialEnd(now = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
}

/* ------------------------------------------------------------------ holat */

export type Billing = ActivePlan & {
  /** Bazadagi tarif — muddat tugagan bo'lsa amaldagisidan farq qiladi. */
  storedPlan: Plan;
  /** Oyiga savdo chegarasidan qanchasi ishlatilgan. */
  tradesThisMonth: number;
  accounts: number;
};

/** Foydalanuvchining hozirgi tarif holati va ishlatilgan chegaralar. */
export async function getBilling(user: {
  id: string;
  timezone: string;
}): Promise<Billing> {
  const row: {
    plan: Plan;
    planUntil: Date | null;
    trialEndsAt: Date | null;
  } | null = await db.user.findUnique({
    where: { id: user.id },
    select: { plan: true, planUntil: true, trialEndsAt: true },
  });

  const sub = row ?? { plan: 'FREE' as Plan, planUntil: null, trialEndsAt: null };
  const active = activePlan(sub);

  const now = new Date();
  const parts = partsIn(now, user.timezone);
  const month = monthRangeIn(parts.year, parts.month, user.timezone);

  const [tradesThisMonth, accounts] = await Promise.all([
    db.trade.count({
      where: {
        account: { userId: user.id },
        isBacktest: false,
        createdAt: { gte: month.from, lt: month.to },
      },
    }),
    db.account.count({ where: { userId: user.id, isArchived: false } }),
  ]);

  return { ...active, storedPlan: sub.plan, tradesThisMonth, accounts };
}

/** Imkoniyat ochiqmi. Yopiq bo'lsa sabab bilan qaytadi. */
export function allow(
  billing: Billing,
  feature: Feature,
): { ok: true } | { ok: false; reason: string } {
  if (has(billing.plan, feature)) return { ok: true };
  return { ok: false, reason: 'plan' };
}

export function canAddTrade(billing: Billing): boolean {
  return billing.tradesThisMonth < limits(billing.plan).tradesPerMonth;
}

/** Qaysi to'lov usullari sozlangan. O'tkazma har doim bor —
 *  boshqalari kalitlar berilganda paydo bo'ladi.
 */
export function enabledProviders(): PaymentProvider[] {
  const out: PaymentProvider[] = [];
  if (process.env.PAYME_MERCHANT_ID) out.push('PAYME');
  if (process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID) out.push('CLICK');
  if (process.env.UZUM_SERVICE_ID && process.env.UZUM_CHECKOUT_URL) out.push('UZUM');
  out.push('MANUAL');
  return out;
}

export function canAddAccount(billing: Billing): boolean {
  return billing.accounts < limits(billing.plan).accounts;
}

/* ------------------------------------------------------------------ to'lov */

/** Yangi kutilayotgan to'lov. Summani mijoz emas, server hisoblaydi. */
export async function createPayment(options: {
  userId: string;
  plan: Plan;
  months: number;
  provider: PaymentProvider;
}): Promise<PaymentRow | null> {
  if (options.plan === 'FREE') return null;
  if (!periodFor(options.months)) return null;

  const amount = priceFor(options.plan, options.months);
  if (amount <= 0) return null;

  return db.payment.create({
    data: {
      userId: options.userId,
      plan: options.plan,
      months: options.months,
      amount,
      provider: options.provider,
    },
    select: PAYMENT_SELECT,
  });
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  return db.payment.findUnique({ where: { id }, select: PAYMENT_SELECT });
}

export async function getPaymentByTx(
  provider: PaymentProvider,
  providerTxId: string,
): Promise<PaymentRow | null> {
  return db.payment.findFirst({
    where: { provider, providerTxId },
    select: PAYMENT_SELECT,
  });
}

export async function getPayments(userId: string, take = 20): Promise<PaymentRow[]> {
  return db.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: PAYMENT_SELECT,
  });
}

/** To'lov tasdiqlandi: tarif uzaytiriladi.
 *
 *  Ikki marta chaqirilsa ham bir marta ishlaydi — provayderlar
 *  javob yo'qolganda so'rovni takrorlaydi.
 */
export async function markPaid(paymentId: string, when = new Date()): Promise<void> {
  await db.$transaction(async (tx: Tx) => {
    const payment: PaymentRow | null = await tx.payment.findUnique({
      where: { id: paymentId },
      select: PAYMENT_SELECT,
    });
    if (!payment || payment.status === 'PAID') return;

    const user: { plan: Plan; planUntil: Date | null } | null = await tx.user.findUnique({
      where: { id: payment.userId },
      select: { plan: true, planUntil: true },
    });
    if (!user) return;

    const until = extendUntil(user, payment.plan, payment.months, when);

    await tx.user.update({
      where: { id: payment.userId },
      data: { plan: payment.plan, planUntil: until },
    });

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: when },
    });
  });
}

/** To'lov bekor qilindi. Tasdiqlangan to'lov bekor qilinsa tarif ham
 *  qaytariladi — aks holda pul qaytgani holda imkoniyat qolib ketadi.
 */
export async function markCancelled(
  paymentId: string,
  reason: number | null = null,
  when = new Date(),
): Promise<void> {
  await db.$transaction(async (tx: Tx) => {
    const payment: PaymentRow | null = await tx.payment.findUnique({
      where: { id: paymentId },
      select: PAYMENT_SELECT,
    });
    if (!payment || payment.status === 'CANCELLED') return;

    if (payment.status === 'PAID') {
      const user: { planUntil: Date | null } | null = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { planUntil: true },
      });

      if (user?.planUntil) {
        const rolledBack = new Date(user.planUntil);
        rolledBack.setMonth(rolledBack.getMonth() - payment.months);
        await tx.user.update({
          where: { id: payment.userId },
          data: { planUntil: rolledBack },
        });
      }
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', cancelledAt: when, cancelReason: reason },
    });
  });
}
