import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/session';
import { getDict } from '@/lib/i18n/server';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Foydalanuvchi ma'lumotini bitta JSON faylda beradi.
 *
 *  Nima kiradi: hisoblar, savdolar (checklist bilan), setuplar,
 *  instrumentlar, kundalik, ogohlantirishlar va to'lovlar tarixi.
 *
 *  Nima kirmaydi: psixologiya suhbati — u eng shaxsiy yozuv va uni
 *  fayl sifatida tarqatish foydalanuvchiga zarar qilishi mumkin;
 *  parol xeshi va sessiya ma'lumoti — ularni berishdan foyda yo'q.
 */
export async function GET() {
  const user = await getUser();
  const d = await getDict(user?.locale);

  if (!user) {
    return new NextResponse(d.errors.unauthorized, { status: 401 });
  }

  // Yuklab olish og'ir so'rov — soatiga o'n marta yetarli.
  const limit = await rateLimit(`export:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return new NextResponse(d.reset.errTooMany, { status: 429 });
  }

  const [profile, accounts, setups, instruments, journal, alerts, payments] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        timezone: true,
        locale: true,
        createdAt: true,
        plan: true,
        planUntil: true,
      },
    }),
    db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        trades: {
          orderBy: { openedAt: 'asc' },
          include: { checks: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    db.setup.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
    db.instrument.findMany({ where: { userId: user.id }, orderBy: { symbol: 'asc' } }),
    db.journalEntry.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } }),
    db.riskAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
    db.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        plan: true,
        months: true,
        amount: true,
        currency: true,
        provider: true,
        status: true,
        paidAt: true,
      },
    }),
  ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: 'ONEBO FX',
      note: 'Psixologiya suhbati bu faylga kiritilmaydi.',
      profile,
      accounts,
      setups,
      instruments,
      journal,
      alerts,
      payments,
    },
    null,
    2,
  );

  const day = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="onebo-fx-${day}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
