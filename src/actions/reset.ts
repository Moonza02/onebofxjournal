'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession } from '@/lib/session';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { getDict } from '@/lib/i18n/server';
import { isMailConfigured, resetEmail, sendMail } from '@/lib/mail';
import {
  expiryFrom,
  hashToken,
  isUsable,
  looksLikeToken,
  MAX_OPEN_RESETS,
  newToken,
  resetUrl,
} from '@/lib/reset';

export type ResetState = { error?: string; sent?: boolean };

/* ------------------------------------------------------------------ so'rov */

/** Tiklash havolasini so'rash.
 *
 *  Javob hisob bor-yo'qligini **oshkor qilmaydi**: manzil topilsa ham,
 *  topilmasa ham bir xil xabar qaytadi. Aks holda bu forma hisoblar
 *  ro'yxatini yig'ish vositasiga aylanardi.
 */
export async function requestReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const d = await getDict();

  const parsed = z
    .string()
    .email()
    .safeParse(String(formData.get('email') ?? '').trim().toLowerCase());

  if (!parsed.success) return { error: d.reset.errEmail };
  const email = parsed.data;

  // Ikki chegara: bitta IP dan va bitta manzil uchun. Birinchisi
  // ro'yxat yig'ishga, ikkinchisi bir odamni xat bilan ko'mishga qarshi.
  const byIp = await rateLimit(await clientKey('reset-ip'), 10, 60 * 60 * 1000);
  const byEmail = await rateLimit(`reset-mail:${email}`, 5, 60 * 60 * 1000);
  if (!byIp.allowed || !byEmail.allowed) return { error: d.reset.errTooMany };

  if (!isMailConfigured()) return { error: d.reset.errSmtp };

  const appUrl = process.env.APP_URL;
  if (!appUrl) return { error: d.reset.errSmtp };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, locale: true } });

  // Hisob bo'lmasa ham "jo'natildi" deymiz — shakl bir xil ko'rinadi.
  if (!user) return { sent: true };

  const token = newToken();

  await db.$transaction(async (tx: typeof db) => {
    // Ochiq turgan eski kalitlar ko'payib ketmasin: har biri alohida
    // yo'l bo'lib qoladi, shuning uchun soni cheklanadi.
    const open = await tx.passwordReset.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      skip: MAX_OPEN_RESETS - 1,
    });

    if (open.length > 0) {
      await tx.passwordReset.updateMany({
        where: { id: { in: open.map((row: { id: string }) => row.id) } },
        data: { usedAt: new Date() },
      });
    }

    await tx.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiryFrom() },
    });
  });

  // Xat foydalanuvchining o'z tilida.
  const userDict = await getDict(user.locale);
  const { subject, text, html } = resetEmail({ url: resetUrl(token, appUrl), d: userDict });

  await sendMail({ to: email, subject, text, html });

  return { sent: true };
}

/* ----------------------------------------------------------------- yangilash */

const passwordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  repeat: z.string(),
});

/** Havola bo'yicha yangi parol qo'yish.
 *
 *  Muvaffaqiyatli bo'lsa: kalit ishlatilgan deb belgilanadi, foydalanuvchining
 *  sessiya avlodi oshadi (boshqa qurilmalardagi kirishlar o'chadi) va shu
 *  brauzerda yangi sessiya ochiladi.
 */
export async function applyReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const d = await getDict();

  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const repeat = String(formData.get('repeat') ?? '');

  if (!looksLikeToken(token)) return { error: d.reset.errToken };
  if (password.length < 8) return { error: d.reset.errShort };
  if (password !== repeat) return { error: d.reset.errMismatch };

  const parsed = passwordSchema.safeParse({ token, password, repeat });
  if (!parsed.success) return { error: d.reset.errShort };

  // Kalitni topishga urinishlar ham cheklanadi.
  const limit = await rateLimit(await clientKey('reset-apply'), 20, 60 * 60 * 1000);
  if (!limit.allowed) return { error: d.reset.errTooMany };

  const row = await db.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!isUsable(row)) return { error: d.reset.errToken };

  const passwordHash = await bcrypt.hash(password, 10);
  let version = 0;

  const ok = await db.$transaction(async (tx: typeof db) => {
    // Kalitni faqat hali ishlatilmagan bo'lsa band qilamiz — ikki
    // so'rov bir vaqtda kelsa, g'olibi bitta bo'ladi.
    const claimed = await tx.passwordReset.updateMany({
      where: { id: row!.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    const updated: { sessionVersion: number } = await tx.user.update({
      where: { id: row!.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    version = updated.sessionVersion;

    // Qolgan ochiq kalitlar ham kuchini yo'qotadi.
    await tx.passwordReset.updateMany({
      where: { userId: row!.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return true;
  });

  if (!ok) return { error: d.reset.errToken };

  await createSession(row!.userId, version);
  return { sent: true };
}
