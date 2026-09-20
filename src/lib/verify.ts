/** Pochta manzilini tasdiqlash va hisobni o'chirish muddati.
 *
 *  Ikkisi ham vaqtga bog'liq qoidalar, ikkisi ham bazaga tegmaydi —
 *  shuning uchun bir joyda turadi va to'liq sinaladi.
 *
 *  Bu fayl **brauzerga ham tushadi** (lenta `daysUntilDeletion` ni
 *  chaqiradi), shuning uchun bu yerda `node:crypto` ga bog'lanish
 *  bo'lmasligi kerak. Kalit yasash `reset.ts` da qoladi.
 */

/* ------------------------------------------------------- tasdiqlash */

/** Tasdiqlash havolasi shuncha vaqt amal qiladi.
 *
 *  Parol tiklashdan uzunroq: bu havola shoshilinch emas, odam
 *  pochtasini ertasiga ochishi mumkin.
 */
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Bir foydalanuvchi uchun bir vaqtda ochiq turadigan kalitlar soni. */
export const MAX_OPEN_VERIFICATIONS = 3;

export function verifyExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + VERIFY_TTL_MS);
}

export function verifyUrl(token: string, appUrl: string | undefined): string {
  const base = (appUrl || '').replace(/\/+$/, '');
  return `${base}/tasdiqlash/${token}`;
}

export type VerificationRow = { email: string; expiresAt: Date; usedAt: Date | null };

/** Kalit hozir ishlaydimi.
 *
 *  Manzil ham solishtiriladi: kalit berilgandan keyin foydalanuvchi
 *  manzilini o'zgartirgan bo'lsa, eski kalit yangisini tasdiqlamaydi.
 */
export function verificationUsable(
  row: VerificationRow | null,
  currentEmail: string,
  now: Date = new Date(),
): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  if (row.expiresAt.getTime() <= now.getTime()) return false;
  return row.email.toLowerCase() === currentEmail.toLowerCase();
}

/** Tasdiqlanmagan hisob qaysi ishlarni qila olmaydi.
 *
 *  Ro'yxatda bitta amal bor va u tasodifiy emas: haftalik hisobot
 *  **istalgan manzilga** PDF jo'natadi. Tasdiqlanmagan hisob bilan bu
 *  begona odamga xat yuborish vositasiga aylanadi.
 *
 *  Boshqa hech narsa to'sib qo'yilmaydi. Mentor taklifi ham shu
 *  ro'yxatda emas: u kod beradi, xat jo'natmaydi — odam kodni o'zi
 *  uzatadi. Jurnal yuritish tasdiqlashni kutib turmaydi.
 */
export const VERIFIED_ONLY = ['weeklyReport'] as const;
export type VerifiedOnly = (typeof VERIFIED_ONLY)[number];

export function needsVerification(
  action: VerifiedOnly,
  user: { emailVerifiedAt: Date | null; isDemo?: boolean },
): boolean {
  // Namuna hisobning manzili o'ylab topilgan — undan xat kutilmaydi
  // va unga tasdiqlash ham taklif qilinmaydi.
  if (user.isDemo) return false;
  return user.emailVerifiedAt === null && VERIFIED_ONLY.includes(action);
}

/* -------------------------------------------------------- o'chirish */

/** Hisob o'chirish so'ralgandan keyin shuncha kun saqlanadi.
 *
 *  Bu muddat fikridan qaytgan odam uchun: bir bosishda yo'qolgan
 *  ikki yillik jurnalni qaytarib bo'lmaydi.
 */
export const DELETION_GRACE_DAYS = 30;
export const DELETION_GRACE_MS = DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

export function deletionDueAt(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_GRACE_MS);
}

/** O'chirishgacha necha kun qoldi. Muddati kelgan bo'lsa — 0. */
export function daysUntilDeletion(requestedAt: Date, now: Date = new Date()): number {
  const left = deletionDueAt(requestedAt).getTime() - now.getTime();
  if (left <= 0) return 0;
  // Yuqoriga yaxlitlanadi: "0 kun qoldi" deb qo'rqitmaslik uchun,
  // hisob hali bir necha soat turadi.
  return Math.ceil(left / (24 * 60 * 60 * 1000));
}

/** Ma'lumotni endi tozalasa bo'ladimi. */
export function deletionDue(requestedAt: Date | null, now: Date = new Date()): boolean {
  if (!requestedAt) return false;
  return deletionDueAt(requestedAt).getTime() <= now.getTime();
}
