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

/** Kod shuncha vaqt amal qiladi.
 *
 *  Havoladan ancha qisqa va bu ataylab: kod olti xonali, ya'ni
 *  taxmin qilinishi mumkin. Muddat qanchalik qisqa bo'lsa, taxmin
 *  qilishga shuncha kam vaqt qoladi. O'n besh daqiqa — pochtani
 *  ochib, kodni ko'chirishga yetarli.
 */
export const VERIFY_TTL_MS = 15 * 60 * 1000;

/** Xat matnida daqiqada aytiladi — matn bilan qiymat bir joyda
 *  turishi uchun shu yerdan olinadi. */
export const VERIFY_TTL_MINUTES = VERIFY_TTL_MS / 60_000;

/** Kod uzunligi — faqat raqam. */
export const CODE_LENGTH = 6;

/** Bitta kod bo'yicha nechta noto'g'ri urinishga yo'l qo'yiladi.
 *
 *  Million variantdan beshtasini sinash — yo'q narsa. Chegaraga
 *  yetgan kod kuchini yo'qotadi va yangisini so'rash kerak bo'ladi.
 */
export const MAX_CODE_ATTEMPTS = 5;

/** Bir foydalanuvchi uchun bir vaqtda ochiq turadigan kodlar soni. */
export const MAX_OPEN_VERIFICATIONS = 3;

export function verifyExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + VERIFY_TTL_MS);
}

/** Shakli to'g'rimi — bazaga bormasdan oldin. */
export function looksLikeCode(value: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value);
}

/** Odam kiritgan kodni tozalash.
 *
 *  Pochtadan ko'chirganda bo'shliq, chiziqcha va ko'rinmas belgilar
 *  qo'shilib keladi. Buning uchun odamni qiynash shart emas.
 */
export function cleanCode(value: string): string {
  return (value ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export type VerificationRow = {
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
};

/** Kod hozir ishlaydimi.
 *
 *  Manzil ham solishtiriladi: kod berilgandan keyin foydalanuvchi
 *  manzilini o'zgartirgan bo'lsa, eski kod yangisini tasdiqlamaydi.
 */
export function verificationUsable(
  row: VerificationRow | null,
  currentEmail: string,
  now: Date = new Date(),
): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  if (row.attempts >= MAX_CODE_ATTEMPTS) return false;
  if (row.expiresAt.getTime() <= now.getTime()) return false;
  return row.email.toLowerCase() === currentEmail.toLowerCase();
}

/** Tasdiqlanmagan hisob qaysi ishlarni qila olmaydi.
 *
 *  Endi bu ro'yxat ikkinchi qator himoya: tasdiqlanmagan hisob bilan
 *  ichkariga umuman kirib bo'lmaydi (qarang `actions/auth.ts`). Lekin
 *  ro'yxat qoldirildi — chegara bitta joyda turgani xavfli, va bu
 *  o'zgarishdan oldin ochilgan hisoblar hali tasdiqlanmagan bo'lishi
 *  mumkin.
 *
 *  Ro'yxatdagi amal tasodifiy emas: haftalik hisobot **istalgan
 *  manzilga** PDF jo'natadi.
 */
export const VERIFIED_ONLY = ['weeklyReport'] as const;

/* --------------------------------------- tasdiqlanmagan hisoblar */

/** Tasdiqlanmagan hisob shuncha kun kutadi, keyin o'chiriladi.
 *
 *  Ikki sabab bor. Birinchisi — soxta manzillar bazada to'planib
 *  qolmasligi. Ikkinchisi muhimroq: kimdir boshqaning manzili bilan
 *  ro'yxatdan o'tsa, haqiqiy egasi kelganda manzil band chiqadi.
 *  Muddat o'tgach yozuv ketadi va manzil yana bo'shaydi.
 */
export const UNVERIFIED_TTL_DAYS = 7;
export const UNVERIFIED_TTL_MS = UNVERIFIED_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Shu vaqtdan oldin ochilgan va hali tasdiqlanmagan hisoblar o'chadi. */
export function unverifiedCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - UNVERIFIED_TTL_MS);
}
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
