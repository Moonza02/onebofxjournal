'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db, type Tx } from '@/lib/db';
import { createSession } from '@/lib/session';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { getDict, getLocale } from '@/lib/i18n/server';
import { buildDemoData, DEMO_TTL_HOURS } from '@/lib/demo-data';
import { deleteUserObjects } from '@/lib/storage';
import { logError } from '@/lib/log';

export type DemoState = { error?: string };

/** Namuna hisob shuncha vaqt yashaydi. */
const DEMO_TTL_MS = DEMO_TTL_HOURS * 60 * 60 * 1000;

/** Muddati o'tgan namuna hisoblar o'chiriladi.
 *
 *  Alohida cron kerak emas: har yangi demo ochilganda bir nechtasi
 *  tozalanadi. Bog'liq yozuvlar sxemadagi `onDelete: Cascade` bilan
 *  o'zi ketadi.
 */
async function sweepExpired(limit = 20): Promise<void> {
  try {
    const stale: { id: string }[] = await db.user.findMany({
      where: { isDemo: true, demoExpiresAt: { lt: new Date() } },
      select: { id: true },
      take: limit,
    });

    if (stale.length > 0) {
      // Skrinshotlar bazada emas — ular alohida o'chiriladi.
      for (const row of stale) await deleteUserObjects(row.id);
      await db.user.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
    }
  } catch (error) {
    // Tozalash ishlamasa ham yangi demo ochilaveradi.
    await logError('demo.sweep', error);
  }
}

/** Namuna hisob ochish va unga kirish.
 *
 *  Har bosishda **yangi** hisob yaratiladi: mehmon ilovani istagancha
 *  o'zgartirishi mumkin va boshqa mehmonlarga xalaqit bermaydi.
 *  Parol tasodifiy — bu hisobga qaytib kirishning yo'li yo'q, u
 *  faqat shu brauzerdagi sessiya bilan yashaydi.
 */
export async function startDemo(): Promise<DemoState> {
  const locale = await getLocale();
  const d = await getDict(locale);

  // Bot bir zumda yuzlab hisob ochmasligi uchun.
  const limit = await rateLimit(await clientKey('demo'), 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: d.demo.errTooMany };

  await sweepExpired();

  const expiresAt = new Date(Date.now() + DEMO_TTL_MS);
  const data = buildDemoData({ d });

  // Xeshlash tranzaksiyadan tashqarida: u ~100 ms oladi va shu vaqt
  // davomida baza ulanishini band qilib turishning hojati yo'q.
  const passwordHash = await bcrypt.hash(randomUUID(), 10);

  let userId: string;

  try {
    userId = await db.$transaction(async (tx: Tx) => {
      const user: { id: string } = await tx.user.create({
        data: {
          // Manzil haqiqiy bo'lishi shart emas va band bo'lib qolmasligi
          // uchun tasodifiy.
          email: `demo-${randomUUID()}@demo.onebofx.local`,
          name: d.demo.accountName,
          passwordHash,
          locale,
          isDemo: true,
          demoExpiresAt: expiresAt,
          // Manzili o'ylab topilgan — tasdiqlash taklif qilinmaydi.
          emailVerifiedAt: new Date(),
          // Hamma bo'lim ochiq ko'rinsin — mehmon to'liq ilovani ko'radi.
          plan: 'MENTOR',
          planUntil: expiresAt,
          instruments: { create: data.instruments },
          setups: { create: data.setups },
        },
        select: { id: true },
      });

      const account: { id: string } = await tx.account.create({
        data: { userId: user.id, ...data.account, isActive: true },
        select: { id: true },
      });

      const setups: { id: string; name: string }[] = await tx.setup.findMany({
        where: { userId: user.id },
        select: { id: true, name: true },
      });
      const setupId = new Map(setups.map((s) => [s.name, s.id]));

      // Checklist qatorlari savdo bilan birga emas, oxirida bitta
      // so'rovda yoziladi: aks holda ikki yuzdan ortiq qo'shimcha
      // murojaat bo'lib, tranzaksiya uzoq cho'zilardi.
      const rows: { tradeId: string; label: string; order: number; passed: boolean }[] = [];

      for (const trade of data.trades) {
        // `id` bazada beriladi, `setupName` esa id ga o'giriladi.
        const { id: _id, setupName, checks, ...rest } = trade;

        const created: { id: string } = await tx.trade.create({
          data: {
            ...rest,
            accountId: account.id,
            setupId: setupId.get(setupName) ?? null,
          },
          select: { id: true },
        });

        for (const check of checks) rows.push({ tradeId: created.id, ...check });
      }

      if (rows.length > 0) await tx.tradeCheck.createMany({ data: rows });

      if (data.journal.length > 0) {
        await tx.journalEntry.createMany({
          data: data.journal.map((entry) => ({ ...entry, userId: user.id })),
        });
      }

      return user.id;
    },
    // Ellikdan ortiq yozuv ketma-ket yaratiladi — standart besh soniya
    // yetmasligi mumkin.
    { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (error) {
    await logError('demo.start', error, { path: locale });
    return { error: d.demo.errFailed };
  }

  await createSession(userId, 0);
  redirect('/panel');
}
