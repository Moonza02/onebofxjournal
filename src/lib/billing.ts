/** Tariflar va cheklovlar.
 *
 *  Bu fayl toza — bazaga ham, tarmoqqa ham tegmaydi. Shuning uchun
 *  narx, muddat va ruxsat mantig'i to'liq testdan o'tadi.
 *
 *  Summalar **tiyin**da saqlanadi. Sabab: Payme protokoli tiyin talab
 *  qiladi, Click esa so'm — ikkalasini bitta joyda kasrsiz butun songa
 *  keltirib qo'yish xatoni kamaytiradi.
 */

export type Plan = 'FREE' | 'PRO' | 'MENTOR';

export type Feature =
  /** Skrinshotdan savdo maydonlarini o'qish. */
  | 'screenshot'
  /** Psixologiya suhbati. */
  | 'coach'
  /** Ertalabki brifingdagi iqtisodiy tahlil. */
  | 'economics'
  /** Simulyator, Monte-Carlo, davrlarni solishtirish. */
  | 'analytics'
  /** Haftalik PDF hisobot va uni pochtaga jo'natish. */
  | 'report'
  /** Backtest jurnali. */
  | 'backtest'
  /** Mentor aloqalari. */
  | 'mentor';

export type Limits = {
  /** Nechta savdo hisobi ochish mumkin. */
  accounts: number;
  /** Oyiga nechta savdo yozish mumkin. Infinity — cheksiz. */
  tradesPerMonth: number;
  /** Mentor sifatida nechta o'quvchi. */
  students: number;
};

export type PlanSpec = {
  key: Plan;
  /** Bir oylik narx, tiyinda. 0 — bepul. */
  monthly: number;
  features: Feature[];
  limits: Limits;
};

const SUM = 100; // 1 so'm = 100 tiyin

export const PLANS: Record<Plan, PlanSpec> = {
  FREE: {
    key: 'FREE',
    monthly: 0,
    features: [],
    limits: { accounts: 1, tradesPerMonth: 50, students: 0 },
  },
  PRO: {
    key: 'PRO',
    monthly: 99_000 * SUM,
    features: ['screenshot', 'coach', 'economics', 'analytics', 'report', 'backtest', 'mentor'],
    limits: { accounts: 5, tradesPerMonth: Infinity, students: 3 },
  },
  MENTOR: {
    key: 'MENTOR',
    monthly: 249_000 * SUM,
    features: ['screenshot', 'coach', 'economics', 'analytics', 'report', 'backtest', 'mentor'],
    limits: { accounts: 10, tradesPerMonth: Infinity, students: 25 },
  },
};

export const PLAN_ORDER: Plan[] = ['FREE', 'PRO', 'MENTOR'];

/** Sinov muddati — ro'yxatdan o'tganda Pro ochiq turadi. */
export const TRIAL_DAYS = 14;

/* ------------------------------------------------------------------ muddat */

export type Period = { months: number; discountPct: number };

/** Uzoq muddatga chegirma. 12 oyda ikki oy tekin.
 *  Chegirma foizi shu yerda — narx undan hisoblanadi, qo'lda yozilmaydi.
 */
export const PERIODS: Period[] = [
  { months: 1, discountPct: 0 },
  { months: 3, discountPct: 5 },
  { months: 6, discountPct: 10 },
  { months: 12, discountPct: 17 },
];

export function periodFor(months: number): Period | null {
  return PERIODS.find((p) => p.months === months) ?? null;
}

/** Tanlangan tarif va muddat uchun to'lanadigan summa, tiyinda.
 *  Natija 100 tiyinga (1 so'mga) yaxlitlanadi — kassalarda tiyin
 *  ko'rsatilmaydi.
 */
export function priceFor(plan: Plan, months: number): number {
  const spec = PLANS[plan];
  const period = periodFor(months);
  if (!spec || !period || spec.monthly === 0) return 0;

  const full = spec.monthly * period.months;
  const discounted = full * (1 - period.discountPct / 100);
  return Math.round(discounted / 100) * 100;
}

/** Chegirma tufayli tejaladigan summa, tiyinda. */
export function savingFor(plan: Plan, months: number): number {
  const spec = PLANS[plan];
  const period = periodFor(months);
  if (!spec || !period) return 0;
  return spec.monthly * period.months - priceFor(plan, months);
}

/** Tiyinni odam o'qiydigan ko'rinishga: 9900000 → "99 000 so'm". */
export function sum(tiyin: number, currency: string): string {
  const soum = Math.round(tiyin / 100);
  // ru-RU ajratgich sifatida uzilmas bo'sh joy qo'yadi — oddiysiga almashtiramiz.
  return `${soum.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ${currency}`;
}

/* ------------------------------------------------------------------ holat */

export type Subscription = {
  plan: Plan;
  /** Tarif shu paytgacha amal qiladi. */
  planUntil: Date | null;
  /** Sinov muddati tugaydigan payt. */
  trialEndsAt: Date | null;
};

export type ActivePlan = {
  plan: Plan;
  /** Hozir sinov muddati ishlayaptimi. */
  trial: boolean;
  /** Tarif tugashiga necha kun qoldi. Bepulda null. */
  daysLeft: number | null;
  until: Date | null;
};

const DAY = 86_400_000;

/** Hozir qaysi tarif amalda.
 *
 *  Muddat tugagan bo'lsa bepulga tushadi — lekin ma'lumot o'chmaydi,
 *  faqat yangi yozish va qo'shimcha imkoniyatlar yopiladi.
 */
export function activePlan(sub: Subscription, now = new Date()): ActivePlan {
  const paidValid = sub.plan !== 'FREE' && sub.planUntil !== null && sub.planUntil > now;

  if (paidValid) {
    return {
      plan: sub.plan,
      trial: false,
      daysLeft: Math.max(0, Math.ceil((sub.planUntil!.getTime() - now.getTime()) / DAY)),
      until: sub.planUntil,
    };
  }

  const trialValid = sub.trialEndsAt !== null && sub.trialEndsAt > now;
  if (trialValid) {
    return {
      plan: 'PRO',
      trial: true,
      daysLeft: Math.max(0, Math.ceil((sub.trialEndsAt!.getTime() - now.getTime()) / DAY)),
      until: sub.trialEndsAt,
    };
  }

  return { plan: 'FREE', trial: false, daysLeft: null, until: null };
}

/** To'lov tasdiqlangandan keyingi yangi tugash sanasi.
 *
 *  Amaldagi muddat tugamagan bo'lsa — ustiga qo'shiladi, yo'qolmaydi.
 *  Boshqa tarifga o'tilsa esa hozirdan boshlanadi: aralashtirib
 *  yuborgandan ko'ra tushunarli bo'lgani yaxshi.
 */
export function extendUntil(
  current: { plan: Plan; planUntil: Date | null },
  plan: Plan,
  months: number,
  now = new Date(),
): Date {
  const samePlan = current.plan === plan;
  const base =
    samePlan && current.planUntil && current.planUntil > now ? new Date(current.planUntil) : new Date(now);

  const result = new Date(base);
  result.setMonth(result.getMonth() + months);

  // 31-yanvar + 1 oy → 3-mart bo'lib ketmasin: oy oxiriga tortamiz.
  if (result.getDate() !== base.getDate()) result.setDate(0);

  return result;
}

/* ------------------------------------------------------------------ ruxsat */

export function has(plan: Plan, feature: Feature): boolean {
  return PLANS[plan].features.includes(feature);
}

export function limits(plan: Plan): Limits {
  return PLANS[plan].limits;
}

/** Imkoniyat qaysi eng arzon tarifda ochiladi. */
export function firstPlanWith(feature: Feature): Plan {
  return PLAN_ORDER.find((p) => has(p, feature)) ?? 'PRO';
}
