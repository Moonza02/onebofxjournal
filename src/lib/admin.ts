import 'server-only';
import { notFound } from 'next/navigation';
import { db } from './db';
import { requireUser, type SessionUser } from './session';
import type { Plan } from './billing';

/** Xodim paneli uchun ma'lumot.
 *
 *  Sahifa faqat xodimga ochiq. Boshqalar uchun u **umuman yo'q** (404)
 *  — borligi ham bilinmaydi.
 */

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  const me: { isAdmin: boolean } | null = await db.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();
  return user;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function monthStart(offset = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - offset, 1);
}

export type AdminStats = {
  users: {
    total: number;
    new7: number;
    new30: number;
    trial: number;
    paid: number;
    demo: number;
    byPlan: { plan: Plan; count: number }[];
  };
  revenue: {
    total: number;
    month: number;
    pending: number;
    byMonth: { label: string; amount: number }[];
  };
  activity: {
    trades: number;
    trades7: number;
    journal: number;
    mentorships: number;
  };
  errors: { last24: number; last7: number };
};

export async function adminStats(): Promise<AdminStats> {
  const now = new Date();
  const paidWhere = { status: 'PAID' as const };

  const [
    total,
    new7,
    new30,
    trial,
    paid,
    demo,
    byPlanRaw,
    paidSum,
    monthSum,
    pendingSum,
    trades,
    trades7,
    journal,
    mentorships,
    errors24,
    errors7,
  ] = await Promise.all([
    db.user.count({ where: { isDemo: false } }),
    db.user.count({ where: { isDemo: false, createdAt: { gte: daysAgo(7) } } }),
    db.user.count({ where: { isDemo: false, createdAt: { gte: daysAgo(30) } } }),
    // Sinovda: muddati hali tugamagan va to'langan tarifi yo'q.
    db.user.count({
      where: {
        isDemo: false,
        trialEndsAt: { gt: now },
        OR: [{ planUntil: null }, { planUntil: { lte: now } }],
      },
    }),
    db.user.count({ where: { isDemo: false, planUntil: { gt: now } } }),
    db.user.count({ where: { isDemo: true } }),
    db.user.groupBy({ by: ['plan'], where: { isDemo: false }, _count: { _all: true } }),
    db.payment.aggregate({ where: paidWhere, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { ...paidWhere, paidAt: { gte: monthStart() } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: 'PENDING', provider: 'MANUAL' },
      _sum: { amount: true },
    }),
    db.trade.count({ where: { isBacktest: false } }),
    db.trade.count({ where: { isBacktest: false, openedAt: { gte: daysAgo(7) } } }),
    db.journalEntry.count(),
    db.mentorship.count({ where: { status: 'ACTIVE' } }),
    db.appError.count({ where: { createdAt: { gte: daysAgo(1) } } }),
    db.appError.count({ where: { createdAt: { gte: daysAgo(7) } } }),
  ]);

  // Oxirgi olti oy — har biri alohida so'rov emas, bitta ro'yxatdan
  // yig'iladi: to'lovlar soni katta bo'lmaydi.
  const since = monthStart(5);
  const recent: { amount: number; paidAt: Date | null }[] = await db.payment.findMany({
    where: { ...paidWhere, paidAt: { gte: since } },
    select: { amount: true, paidAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 5; i >= 0; i -= 1) {
    const start = monthStart(i);
    buckets.set(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const row of recent) {
    if (!row.paidAt) continue;
    const key = `${row.paidAt.getFullYear()}-${String(row.paidAt.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.amount);
  }

  return {
    users: {
      total,
      new7,
      new30,
      trial,
      paid,
      demo,
      byPlan: byPlanRaw.map((row: { plan: Plan; _count: { _all: number } }) => ({
        plan: row.plan,
        count: row._count._all,
      })),
    },
    revenue: {
      total: paidSum._sum.amount ?? 0,
      month: monthSum._sum.amount ?? 0,
      pending: pendingSum._sum.amount ?? 0,
      byMonth: [...buckets].map(([label, amount]) => ({ label, amount })),
    },
    activity: { trades, trades7, journal, mentorships },
    errors: { last24: errors24, last7: errors7 },
  };
}

export type ErrorRow = {
  id: string;
  createdAt: Date;
  scope: string;
  message: string;
  digest: string | null;
  stack: string | null;
  userId: string | null;
  path: string | null;
};

export async function recentErrors(take = 100): Promise<ErrorRow[]> {
  return db.appError.findMany({ orderBy: { createdAt: 'desc' }, take });
}
