import 'server-only';
import { db, type Tx } from './db';
import { getDict } from './i18n/server';
import { isMailConfigured, sendMail, verifyEmail } from './mail';
import { hashToken, newToken } from './reset';
import { MAX_OPEN_VERIFICATIONS, verifyExpiry, verifyUrl } from './verify';
import { rateLimit } from './ratelimit';

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

  const appUrl = process.env.APP_URL;
  // Sabab boshqa — xabar ham boshqa bo'lsin, aks holda sozlagan odam
  // SMTP ni qayta-qayta tekshirib vaqt yo'qotadi.
  if (!appUrl) return { ok: false, error: d.verify.errAppUrl };

  // Manzil bo'yicha chegara: ro'yxatdan o'tish IP bo'yicha cheklangan,
  // lekin bir odamni xat bilan ko'mish uchun IP almashtirish yetarli
  // bo'lib qolmasin. Parolni tiklashda ham shunday qilingan.
  const byEmail = await rateLimit(`verify-mail:${user.email.toLowerCase()}`, 5, 60 * 60 * 1000);
  if (!byEmail.allowed) return { ok: false, error: d.verify.errTooMany };

  const token = newToken();

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
        tokenHash: hashToken(token),
        expiresAt: verifyExpiry(),
      },
    });
  });

  const { subject, text, html } = verifyEmail({ url: verifyUrl(token, appUrl), d });
  const sent = await sendMail({ to: user.email, subject, text, html });

  if (!sent.ok) return { ok: false, error: d.verify.errSmtp };
  return { ok: true };
}

