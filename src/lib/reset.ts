import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Parolni tiklash kalitlari.
 *
 *  Kalitning o'zi faqat pochtadagi havolada bo'ladi; bazada esa uning
 *  SHA-256 xeshi turadi. Shuning uchun bazaga kirgan odam ham havolani
 *  tiklay olmaydi — xeshdan kalitni qaytarib bo'lmaydi.
 *
 *  Bu fayl bazaga tegmaydi, shuning uchun to'liq sinaladi.
 */

/** Havola shuncha vaqt amal qiladi. */
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 soat

/** Bir foydalanuvchi uchun bir vaqtda ochiq turadigan kalitlar soni.
 *  Bundan oshsa eng eskilari yaroqsiz qilinadi.
 */
export const MAX_OPEN_RESETS = 3;

/** Yangi kalit — 32 bayt tasodif, havolaga qulay ko'rinishda.
 *  Bu uzunlik taxmin qilishni amalda imkonsiz qiladi.
 */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Xeshlarni vaqt bo'yicha teng solishtirish. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function expiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TTL_MS);
}

export type ResetRow = { expiresAt: Date; usedAt: Date | null };

/** Kalit hozir ishlaydimi. Muddati o'tgan yoki allaqachon
 *  ishlatilgan bo'lsa — yo'q.
 */
export function isUsable(row: ResetRow | null, now: Date = new Date()): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}

/** Havola manzili. `APP_URL` bo'lmasa nisbiy yo'l qaytadi — pochtada
 *  bu foyda bermaydi, shuning uchun chaqiruvchi buni tekshiradi.
 */
export function resetUrl(token: string, appUrl: string | undefined): string {
  const base = (appUrl || '').replace(/\/+$/, '');
  return `${base}/parolni-tiklash/${token}`;
}

/** Kalit havoladan kelganda shakli to'g'rimi — bazaga bormasdan oldin.
 *  base64url: harf, raqam, `-` va `_`.
 */
export function looksLikeToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(value);
}
