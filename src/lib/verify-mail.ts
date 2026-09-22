import 'server-only';
import { db, type Tx } from './db';
import { getDict } from './i18n/server';
import { isMailConfigured, sendMail, verifyCodeEmail } from './mail';
import { logSecret } from './mail-debug';
import { hashCode, newCode } from './reset';
import { MAX_OPEN_VERIFICATIONS, verifyExpiry } from './verify';
import { rateLimit } from './ratelimit';
import { logError } from './log';

/** Tasdiqlash xatini yaratib jo'natish.
 *
 *  **Ataylab `'use server'` faylida emas.** U yerdagi har bir eksport
 *  tashqaridan chaqirsa bo'ladigan manzilga aylanadi; bu funksiya esa
 *  kim va qaysi manzilga degan savolni so'ramaydi — chaqiruvchi allaqachon
 *  tekshirgan deb hisoblaydi. Shu sababli oddiy modulda turadi va faqat
 *  server kodidan chaqiriladi.
 */
/** Tasdiqlash havolasini yaratib jo'natish.
 *
 *  Ro'yxatdan o'tishda ham, foydalanuvchi «qayta yuborish» bosganda
 *  ham shu chaqiriladi. Xat ketmasa ro'yxatdan o'tish buzilmaydi:
 *  xatoni qaytaradi, chaqiruvchi o'zi hal qiladi.
 */
export async function issueVerification(user: {
  id: string;
  email: string;
  locale: string;
}): Promise<{ ok: boolean; error?: string }> {
  const d = await getDict(user.locale);

  if (!isMailConfigured()) return { ok: false, error: d.verify.errSmtp };

  // `APP_URL` bu yerda kerak emas: xatda havola emas, kod ketadi.
  // Bitta sozlama kamaydi — bitta nosozlik manbayi ham.

  // Manzil bo'yicha chegara: ro'yxatdan o'tish IP bo'yicha cheklangan,
  // lekin bir odamni xat bilan ko'mish uchun IP almashtirish yetarli
  // bo'lib qolmasin. Parolni tiklashda ham shunday qilingan.
  const byEmail = await rateLimit(`verify-mail:${user.email.toLowerCase()}`, 5, 60 * 60 * 1000);
  if (!byEmail.allowed) return { ok: false, error: d.verify.errTooMany };

  const code = newCode();

  await db.$transaction(async (tx: Tx) => {
    // Ochiq kalitlar ko'payib ketmasin — har biri alohida yo'l.
    const open = await tx.emailVerification.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      skip: MAX_OPEN_VERIFICATIONS - 1,
    });

    if (open.length > 0) {
      await tx.emailVerification.updateMany({
        where: { id: { in: open.map((row: { id: string }) => row.id) } },
        data: { usedAt: new Date() },
      });
    }

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash: hashCode(user.id, code),
        expiresAt: verifyExpiry(),
      },
    });
  });

  // Kod saqlandi — xat ketmasa ham u haqiqiy. Shuning uchun log'ga
  // jo'natishdan **oldin** chiqadi: pochta ishlamayotgan kunlarda
  // sinash shu bilan davom etadi.
  logSecret('tasdiqlash kodi', user.email, code);

  const { subject, text, html } = verifyCodeEmail({ code, d });
  const sent = await sendMail({ to: user.email, subject, text, html, tag: 'verify' });

  if (!sent.ok) {
    // Ilgari bu yerda ham `errSmtp` qaytardi — ya'ni "sozlanmagan"
    // degan xabar. Sozlamasi joyida, lekin provayder xatni rad etgan
    // holatda bu xabar noto'g'ri yo'lga boshlaydi: odam SMTP ni
    // qayta-qayta tekshiradi, sabab esa butunlay boshqa yerda
    // (masalan `MAIL_FROM` autentifikatsiya qilingan manzil emas).
    await logError('verify.send', new Error(sent.error ?? 'nomalum'), { userId: user.id });
    return { ok: false, error: d.verify.errSend };
  }

  return { ok: true };
}

