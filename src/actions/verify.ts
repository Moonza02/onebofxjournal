'use server';

import { redirect } from 'next/navigation';
import { db, type Tx } from '@/lib/db';
import { clearPending, getPending } from '@/lib/pending';
import { createSession, requireUser } from '@/lib/session';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { logError } from '@/lib/log';
import { hashCode, sameHash } from '@/lib/reset';
import { issueVerification } from '@/lib/verify-mail';
import { cleanCode, looksLikeCode, MAX_CODE_ATTEMPTS, verificationUsable } from '@/lib/verify';

export type VerifyState = { error?: string; sent?: boolean; already?: boolean };

/** Pochtaga kelgan kodni tekshirish.
 *
 *  Kod olti xonali — ya'ni million variant. Chegarasiz qoldirilsa
 *  uni sabr bilan topish mumkin, shuning uchun uch qavat to'siq bor:
 *
 *  1. Bitta kod bo'yicha `MAX_CODE_ATTEMPTS` urinish. Oshsa kod
 *     kuchini yo'qotadi va yangisini so'rash kerak bo'ladi.
 *  2. IP bo'yicha soatiga 20 urinish — yangi kod so'rab-so'rab
 *     chegarani aylanib o'tishga yo'l qo'ymaydi.
 *  3. Kodning muddati — o'n besh daqiqa.
 *
 *  To'g'ri kod kiritilsa sessiya shu yerda ochiladi: odam boshqa
 *  hech qayerga bormaydi, to'g'ridan-to'g'ri panelga tushadi.
 */
export async function confirmCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const d = await getDict();
  const userId = await getPending();
  if (!userId) return { error: d.verify.errExpired };

  const byIp = await rateLimit(await clientKey('code'), 20, 60 * 60 * 1000);
  if (!byIp.allowed) return { error: d.verify.errTooMany };

  const code = cleanCode(String(formData.get('code') ?? ''));
  if (!looksLikeCode(code)) return { error: d.verify.errCodeShape };

  const user: { id: string; email: string; emailVerifiedAt: Date | null } | null =
    await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true },
    });

  if (!user) return { error: d.verify.errExpired };
  if (user.emailVerifiedAt) return { already: true };

  // Eng oxirgi ochiq kod — qayta yuborilgan bo'lsa eskisi emas,
  // yangisi kutilayotgani tabiiy.
  const row: {
    id: string;
    email: string;
    tokenHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
  } | null = await db.emailVerification.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      tokenHash: true,
      attempts: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!verificationUsable(row, user.email)) return { error: d.verify.errCodeGone };

  if (!sameHash(row!.tokenHash, hashCode(user.id, code))) {
    const after = await db.emailVerification.update({
      where: { id: row!.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    const left = MAX_CODE_ATTEMPTS - after.attempts;
    if (left <= 0) return { error: d.verify.errCodeGone };

    return { error: fill(d.verify.errCodeWrong, { left }) };
  }

  // Kod to'g'ri. Band qilish `updateMany` bilan: ikki so'rov bir
  // vaqtda kelsa g'olibi bitta bo'ladi.
  const claimed = await db.$transaction(async (tx: Tx) => {
    const done = await tx.emailVerification.updateMany({
      where: { id: row!.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (done.count === 0) return false;

    await tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    // Qolgan ochiq kodlar ham kerak emas.
    await tx.emailVerification.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    return true;
  });

  if (!claimed) return { already: true };

  await clearPending();
  await createSession(user.id);
  redirect('/panel');
}

/** Tasdiqlash sahifasidagi «qayta yuborish» — hali kirmagan odam uchun.
 *
 *  Bu yerda `requireUser` yo'q, chunki foydalanuvchi hali ichkarida
 *  emas: uning sessiyasi ham yo'q. O'rniga ro'yxatdan o'tishda
 *  qoldirilgan belgi o'qiladi. Belgi hech narsaga ruxsat bermaydi —
 *  u faqat o'sha hisobning **o'z** manziliga xat jo'natishga yarasa
 *  yarab turadi, u ham soatiga besh martagacha.
 */
export async function resendPending(
  _prev: VerifyState,
  _formData: FormData,
): Promise<VerifyState> {
  const userId = await getPending();
  if (!userId) return { error: (await getDict()).verify.errExpired };

  const limit = await rateLimit(`verify:${userId}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: (await getDict()).verify.errTooMany };

  const row: { id: string; email: string; locale: string; emailVerifiedAt: Date | null } | null =
    await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, locale: true, emailVerifiedAt: true },
    });

  if (!row) return { error: (await getDict()).verify.errExpired };
  if (row.emailVerifiedAt) return { already: true };

  const result = await issueVerification({ id: row.id, email: row.email, locale: row.locale });

  if (!result.ok) {
    await logError('verify.pending', new Error(result.error ?? 'unknown'), { userId });
    return { error: result.error };
  }

  return { sent: true };
}

/** Panelda «qayta yuborish» tugmasi. */
export async function resendVerification(
  _prev: VerifyState,
  _formData: FormData,
): Promise<VerifyState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  // Bir odamni xat bilan ko'mib tashlamaslik uchun.
  const limit = await rateLimit(`verify:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: d.verify.errTooMany };

  const row: { emailVerifiedAt: Date | null } | null = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerifiedAt: true },
  });

  // Allaqachon tasdiqlangan bo'lsa xat jo'natilmaydi — va "yubordik"
  // deb ham aytilmaydi. (Ikki oynada ochib qo'ygan odam shu yo'lga
  // tushadi: birida tasdiqlagan, ikkinchisida tugmani bosgan.)
  if (!row || row.emailVerifiedAt) return { already: true };

  const result = await issueVerification({
    id: user.id,
    email: user.email,
    locale: user.locale,
  });

  if (!result.ok) {
    await logError('verify.resend', new Error(result.error ?? 'unknown'), { userId: user.id });
    return { error: result.error };
  }

  return { sent: true };
}
