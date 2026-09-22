import 'server-only';
import { db } from './db';
import { deleteUserObjects } from './storage';
import { logError, pruneErrors } from './log';
import { DELETION_GRACE_MS, unverifiedCutoff } from './verify';

/** Muddati kelgan ishlarni tozalash.
 *
 *  Ilovada cron yo'q, shuning uchun bu ish ikki yo'l bilan bajariladi:
 *  `/api/cron` manzili (haqiqiy cron shuni chaqiradi) va xodim paneli
 *  ochilganda. Ikkalasi ham bir xil funksiyani chaqiradi — mantiq
 *  ikkiga bo'linib qolmasligi uchun.
 */

export type SweepResult = {
  deletedUsers: number;
  deletedDemos: number;
  deletedUnverified: number;
};

/** Bir chaqiruvda nechtagacha hisob o'chiriladi.
 *
 *  Chegara bor: o'chirish skrinshotlarni ham olib tashlaydi, bu esa
 *  sekin. Qolgani keyingi chaqiruvda ketadi.
 */
export const SWEEP_BATCH = 50;

/** Tozalash uchun kerak bo'lgan amallar.
 *
 *  Alohida tur qilib ajratilgan sababi — sinash: haqiqiy bazasiz ham
 *  tanlash shartlari va xatoga chidamliligini tekshirib ko'rish mumkin.
 */
export type SweepDeps = {
  findUsers: (where: Record<string, unknown>, take: number) => Promise<{ id: string }[]>;
  /** Shartni qayta tekshirib o'chiradi. Shart endi to'g'ri kelmasa
   *  `false` qaytadi va hech narsa o'chmaydi. */
  deleteUser: (id: string, where: Record<string, unknown>) => Promise<boolean>;
  deleteObjects: (id: string) => Promise<void>;
  onError: (scope: string, error: unknown, id: string) => Promise<void>;
};

const liveDeps: SweepDeps = {
  findUsers: (where, take) => db.user.findMany({ where, select: { id: true }, take }),
  deleteUser: async (id, where) => {
    // Shart qayta qo'yiladi. Ro'yxat tuzilgandan keyin foydalanuvchi
    // o'chirishni bekor qilgan bo'lishi mumkin — o'sha holda bu yerda
    // hech narsa o'chmaydi. Bog'liq yozuvlar `onDelete: Cascade` bilan ketadi.
    const done = await db.user.deleteMany({ where: { ...where, id } });
    return done.count > 0;
  },
  deleteObjects: deleteUserObjects,
  onError: (scope, error, userId) => logError(scope, error, { userId }),
};

/** Topilgan hisoblarni birma-bir o'chiradi.
 *
 *  Bittasi bo'lmasa qolganlari to'xtamaydi: bitta buzilgan yozuv butun
 *  tozalashni bloklab qo'ymasligi kerak.
 */
async function removeAll(
  rows: { id: string }[],
  where: Record<string, unknown>,
  scope: string,
  deps: SweepDeps,
): Promise<number> {
  let count = 0;

  for (const row of rows) {
    try {
      // Skrinshotlar saqlagichda turadi — ular kaskad bilan ketmaydi,
      // shuning uchun bazadan oldin alohida o'chiriladi. Bu yerda xato
      // bo'lsa yozuv o'chmaydi: fayllar qolib, ular kimniki ekani
      // bilinmay qoladigan holatga yo'l qo'ymaymiz.
      await deps.deleteObjects(row.id);
      if (await deps.deleteUser(row.id, where)) count += 1;
    } catch (error) {
      await deps.onError(scope, error, row.id);
    }
  }

  return count;
}

/** Muddati o'tgan o'chirish so'rovlarini bajarish. */
export async function sweepDeletedUsers(
  now: Date = new Date(),
  deps: SweepDeps = liveDeps,
): Promise<number> {
  const due = new Date(now.getTime() - DELETION_GRACE_MS);
  const where = { deletionRequestedAt: { not: null, lte: due } };
  const rows = await deps.findUsers(where, SWEEP_BATCH);

  return removeAll(rows ?? [], where, 'sweep.user', deps);
}

/** Muddati tugagan namuna hisoblar. */
export async function sweepExpiredDemos(
  now: Date = new Date(),
  deps: SweepDeps = liveDeps,
): Promise<number> {
  const where = { isDemo: true, demoExpiresAt: { lt: now } };
  const rows = await deps.findUsers(where, SWEEP_BATCH);

  return removeAll(rows ?? [], where, 'sweep.demo', deps);
}

/** Tasdiqlanmagan hisoblar.
 *
 *  Ro'yxatdan o'tgan, lekin manzilini tasdiqlamagan yozuvlar. Ular
 *  ishlamaydi — kirib ham bo'lmaydi — lekin manzilni band qilib
 *  turadi. Muddat o'tgach o'chadi va manzil bo'shaydi.
 *
 *  Namuna hisoblar bu yerga tushmaydi: ularning manzili o'ylab
 *  topilgan va ular hech qachon tasdiqlanmaydi. Ular o'z muddati
 *  bo'yicha `sweepExpiredDemos` da ketadi.
 */
export async function sweepUnverified(
  now: Date = new Date(),
  deps: SweepDeps = liveDeps,
): Promise<number> {
  const where = {
    emailVerifiedAt: null,
    isDemo: false,
    createdAt: { lt: unverifiedCutoff(now) },
  };
  const rows = await deps.findUsers(where, SWEEP_BATCH);

  return removeAll(rows ?? [], where, 'sweep.unverified', deps);
}

/** Muddati o'tgan tasdiqlash va tiklash kalitlarini tozalash.
 *
 *  Kalitlar o'zi yaroqsiz bo'lib qoladi, lekin jadval cheksiz
 *  o'smasligi uchun eskilari olib tashlanadi.
 */
export async function pruneTokens(now: Date = new Date()): Promise<void> {
  // Bir hafta oldin muddati tugaganlar — endi kerak emas.
  const old = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  await db.passwordReset.deleteMany({ where: { expiresAt: { lt: old } } });
  await db.emailVerification.deleteMany({ where: { expiresAt: { lt: old } } });
}

export async function runSweep(now: Date = new Date()): Promise<SweepResult> {
  const deletedUsers = await sweepDeletedUsers(now);
  const deletedDemos = await sweepExpiredDemos(now);
  const deletedUnverified = await sweepUnverified(now);

  await pruneTokens(now);
  await pruneErrors();

  return { deletedUsers, deletedDemos, deletedUnverified };
}
