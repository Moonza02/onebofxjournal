/** Namuna ma'lumot — ilovani bo'sh emas, to'la holda ko'rish uchun.
 *  Ishga tushirish: npm run db:seed
 *  Kirish: demo@onebo.uz / demo12345
 *
 *  DIQQAT: bu yerdagi savdolar o'ylab topilgan, real hisobdan olinmagan.
 *  Haqiqiy ishlatishda seed qilmang — o'z savdolaringizni kiriting.
 *
 *  Ma'lumotning o'zi `src/lib/demo-data.ts` da yaratiladi — demo rejim
 *  ham o'shani ishlatadi, ya'ni manba bitta.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildDemoData } from '../src/lib/demo-data';
import { uz } from '../src/lib/i18n/uz';

const db = new PrismaClient();

async function main() {
  const email = 'demo@onebo.uz';
  await db.user.deleteMany({ where: { email } });

  const data = buildDemoData({ d: uz });

  const user = await db.user.create({
    data: {
      email,
      name: 'Demo',
      passwordHash: await bcrypt.hash('demo12345', 10),
      // Namuna hisob — hamma bo'lim ochiq turishi uchun Mentor tarifi
      // va qo'lda to'lovlarni tasdiqlash uchun admin huquqi.
      plan: 'MENTOR',
      planUntil: new Date(Date.now() + 365 * 86400000),
      isAdmin: true,
      instruments: { create: data.instruments },
      setups: { create: data.setups },
    },
  });

  const account = await db.account.create({
    data: { userId: user.id, ...data.account, isActive: true },
  });

  const setups: { id: string; name: string }[] = await db.setup.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });
  const setupId = new Map(setups.map((s) => [s.name, s.id]));

  for (const trade of data.trades) {
    const { id: _id, setupName, checks, ...rest } = trade;
    await db.trade.create({
      data: {
        ...rest,
        accountId: account.id,
        setupId: setupId.get(setupName) ?? null,
        checks: checks.length > 0 ? { create: checks } : undefined,
      },
    });
  }

  for (const entry of data.journal) {
    await db.journalEntry.create({ data: { ...entry, userId: user.id } });
  }

  const closed = data.trades.filter((t) => !t.isBacktest && t.closedAt).length;
  const backtest = data.trades.filter((t) => t.isBacktest).length;

  console.log(
    `Tayyor: ${closed} yopilgan savdo + ${backtest} backtest + 1 ochiq pozitsiya, ` +
      `${data.journal.length} kundalik yozuvi.`,
  );
  console.log('Kirish: demo@onebo.uz / demo12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
