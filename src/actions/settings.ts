'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, destroySession, requireUser } from '@/lib/session';
import { isValidTimezone } from '@/lib/tz';
import { getDict } from '@/lib/i18n/server';
import { rateLimit } from '@/lib/ratelimit';
import { deleteUserObjects } from '@/lib/storage';
import { logError } from '@/lib/log';
import { deletionEmail, isMailConfigured, sendMail } from '@/lib/mail';
import { DELETION_GRACE_DAYS } from '@/lib/verify';
import { siteUrl } from '@/lib/site';

export type SettingsState = { error?: string; ok?: boolean };

/** Vaqt mintaqasi — kun chegarasi, kalendar va kunlik limit shunda hisoblanadi. */
export async function updateTimezone(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const timezone = String(formData.get('timezone') ?? '').trim();

  if (!isValidTimezone(timezone)) {
    return { error: (await getDict(user.locale)).accounts.errTimezone };
  }

  await db.user.update({ where: { id: user.id }, data: { timezone } });

  revalidatePath('/', 'layout');
  return { ok: true };
}


/* ------------------------------------------------------------------ parol */

/** Parolni o'zgartirish.
 *
 *  Hozirgi parol so'raladi — ochiq qolgan brauzerni topgan odam
 *  parolni almashtirib qo'ya olmasligi uchun. Almashgach sessiya
 *  avlodi oshadi: boshqa qurilmalardagi kirishlar o'chadi, shu
 *  qurilmada esa yangi belgi beriladi.
 */
export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('password') ?? '');
  const repeat = String(formData.get('repeat') ?? '');

  if (next.length < 8) return { error: d.reset.errShort };
  if (next !== repeat) return { error: d.reset.errMismatch };

  // Hozirgi parolni topishga urinishlar cheklanadi.
  const limit = await rateLimit(`password:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return { error: d.reset.errTooMany };

  const row: { passwordHash: string } | null = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row) return { error: d.settings.errCurrent };

  if (!(await bcrypt.compare(current, row.passwordHash))) {
    return { error: d.settings.errCurrent };
  }
  if (await bcrypt.compare(next, row.passwordHash)) {
    return { error: d.settings.errSame };
  }

  const updated: { sessionVersion: number } = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });

  // Ochiq turgan tiklash havolalari ham kuchini yo'qotadi.
  await db.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await createSession(user.id, updated.sessionVersion);

  return { ok: true };
}

/* ------------------------------------------------------------------ o'chirish */

/** Hisobni o'chirishni so'rash.
 *
 *  Ma'lumot darhol o'chmaydi: sana yoziladi va 30 kun kutiladi. Bu
 *  muddat fikridan qaytgan odam uchun — bir bosishda yo'qolgan ikki
 *  yillik jurnalni qaytarib bo'lmaydi. Tasdiq uchun pochta manzili
 *  so'raladi, tasodifan bosilib ketmasligi uchun.
 */
export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const typed = String(formData.get('email') ?? '').trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) {
    return { error: d.settings.errDeleteEmail };
  }

  // Namuna hisob muddati bilan o'zi ketadi — kutib o'tirmaymiz.
  // Skrinshot yuklash namuna hisobda yopiq, shuning uchun saqlagichda
  // tozalanadigan fayl bo'lmaydi; xato bo'lsa ham to'xtamaymiz.
  if (user.isDemo) {
    try {
      await deleteUserObjects(user.id);
    } catch (error) {
      await logError('delete.demo', error, { userId: user.id });
    }
    await db.user.delete({ where: { id: user.id } });
    await destroySession();
    redirect('/login');
  }

  // Ikkinchi marta so'ralsa muddat qaytadan boshlanmaydi: "shu ish
  // bo'ldimi?" deb qayta bosgan odam ma'lumotini 60 kun saqlab
  // qo'ymaymiz — va aytilgan sana o'zgarmaydi.
  if (!user.deletionRequestedAt) {
    await db.user.update({
      where: { id: user.id },
      data: { deletionRequestedAt: new Date() },
    });

    // Egasiga xabar beriladi. Muddatning ma'nosi shunda: ochiq qolgan
    // brauzerni topgan odam o'chirishni so'rab qo'ysa, egasi buni
    // faqat shu xatdan biladi — sessiya esa hozir yopiladi.
    await notifyDeletion(user);
  }

  await destroySession();
  redirect('/login?deletion=1');
}

/** O'chirish haqida egasiga xabar.
 *
 *  Xat ketmasa ham o'chirish so'rovi bekor qilinmaydi: SMTP tushib
 *  qolgani foydalanuvchining qaroriga aralashmaydi. Faqat yozib
 *  qo'yiladi.
 */
async function notifyDeletion(user: { id: string; email: string; locale: string }): Promise<void> {
  try {
    if (!isMailConfigured()) return;
    const appUrl = siteUrl();
    if (!appUrl) return;

    const dict = await getDict(user.locale);
    const { subject, text, html } = deletionEmail({
      url: `${appUrl}/login`,
      days: DELETION_GRACE_DAYS,
      d: dict,
    });

    const sent = await sendMail({ to: user.email, subject, text, html, tag: 'deletion' });
    if (!sent.ok) throw new Error(sent.error ?? 'nomalum');
  } catch (error) {
    await logError('delete.notify', error, { userId: user.id });
  }
}

/** O'chirishni bekor qilish — muddat ichida kirgan odam uchun. */
export async function cancelDeletion(): Promise<SettingsState> {
  const user = await requireUser();

  await db.user.update({
    where: { id: user.id },
    data: { deletionRequestedAt: null },
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}
