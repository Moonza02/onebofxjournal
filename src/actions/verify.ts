'use server';

import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { rateLimit } from '@/lib/ratelimit';
import { getDict } from '@/lib/i18n/server';
import { logError } from '@/lib/log';
import { issueVerification } from '@/lib/verify-mail';

export type VerifyState = { error?: string; sent?: boolean; already?: boolean };

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
