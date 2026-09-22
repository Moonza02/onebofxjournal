'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, destroySession } from '@/lib/session';
import { DEFAULT_INSTRUMENTS } from '@/lib/instruments';
import { starterSetups } from '@/lib/starter-data';
import { clientKey, rateLimit, resetLimit } from '@/lib/ratelimit';
import { getDict, getLocale } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { trialEnd } from '@/lib/payments';
import { issueVerification } from '@/lib/verify-mail';
import { isMailConfigured } from '@/lib/mail';
import { setPending } from '@/lib/pending';
import { logError } from '@/lib/log';

export type FormState = { error?: string };

/** Xabarlar foydalanuvchi tilida — xato matni ham tarjima qilinadi. */
function credentials(d: Awaited<ReturnType<typeof getDict>>) {
  return z.object({
    email: z.string().email(d.auth.errorEmail),
    password: z.string().min(8, d.auth.errorPassword),
  });
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const d = await getDict();
  const parsed = credentials(d).safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Brute-force'ga qarshi: bitta IP dan 15 daqiqada 10 urinish.
  const key = await clientKey('login');
  const limit = await rateLimit(key, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSec / 60);
    return { error: fill(d.auth.errorTooMany, { minutes }) };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Bir xil xabar — qaysi email ro'yxatda borligini oshkor qilmaslik uchun.
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: d.auth.errorCredentials };
  }

  await resetLimit(key);

  // Parol to'g'ri bo'lgani yetarli emas: manzil haqiqiyligi hali
  // isbotlanmagan. Bunday hisob ichkariga kiritilmaydi — odam
  // tasdiqlash sahifasiga tushadi va u yerdan xatni qayta so'raydi.
  //
  // Namuna hisoblar bundan mustasno: ularning manzili o'ylab
  // topilgan va ular hech qachon xat kutmaydi.
  if (!user.emailVerifiedAt && !user.isDemo) {
    await setPending(user.id);
    redirect('/tasdiqlash');
  }

  await createSession(user.id);
  redirect('/panel');
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const d = await getDict();
  const name = String(formData.get('name') ?? '').trim();
  const parsed = credentials(d).safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  });

  if (!name) return { error: d.auth.errorName };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Ro'yxatdan o'tishga ham chegara — bitta IP dan soatiga 5 ta hisob.
  const limit = await rateLimit(await clientKey('register'), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: d.auth.errorTooManySoon };
  }

  // Xat jo'nata olmasak, hisob ham ochilmaydi. Aks holda odam hech
  // qachon kira olmaydigan hisob qolib ketadi va uning manzili band
  // bo'lib turadi. Shuni oldindan tekshiramiz — yaratib, keyin
  // o'chirgandan ko'ra toza.
  if (!isMailConfigured()) return { error: d.verify.errSmtp };

  const email = parsed.data.email;
  const locale = await getLocale();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const exists: { id: string; emailVerifiedAt: Date | null } | null = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });

  // Tasdiqlangan hisob bor — bu manzil band.
  if (exists?.emailVerifiedAt) return { error: d.auth.errorExists };

  // Manzil band, lekin tasdiqlanmagan: hisobning egasi hali
  // isbotlanmagan. Bunday yozuv ustiga yozaverish mumkin — chunki
  // hisobga kirishning yagona yo'li o'sha manzilga boradigan havola.
  // Ya'ni ro'yxatdan o'tishni faqat manzilning haqiqiy egasi
  // yakunlay oladi, kim boshlagan bo'lishidan qat'i nazar.
  const userId = exists
    ? (
        await db.user.update({
          where: { id: exists.id },
          data: { name, passwordHash, locale },
          select: { id: true },
        })
      ).id
    : (
        await db.user.create({
          data: {
            name,
            email,
            passwordHash,
            // Yangi foydalanuvchiga sinov muddati — kartasiz.
            trialEndsAt: trialEnd(),
            // Kirishdan oldin tanlangan til saqlanib qoladi.
            locale,
            instruments: { create: DEFAULT_INSTRUMENTS },
            setups: { create: starterSetups(d) },
            accounts: {
              create: {
                name: d.accounts.defaultName,
                broker: '',
                startingBalance: 10000,
                program: 'CUSTOM',
                dailyLossPct: 3,
                maxDrawdownPct: 6,
                profitTargetPct: 10,
                riskPerTradePct: 1,
              },
            },
          },
          select: { id: true },
        })
      ).id;

  const verification = await issueVerification({ id: userId, email, locale });

  if (!verification.ok) {
    await logError('register.verify', new Error(verification.error ?? 'unknown'), { userId });

    // Endigina ochilgan hisob qolib ketmasin: uni tasdiqlab
    // bo'lmaydi, lekin manzilni band qilib turadi. Ilgari mavjud
    // bo'lgan yozuvga tegilmaydi — u bizniki emas.
    if (!exists) {
      try {
        await db.user.delete({ where: { id: userId } });
      } catch (error) {
        await logError('register.rollback', error, { userId });
      }
    }

    return { error: verification.error ?? d.verify.errSmtp };
  }

  // Sessiya **ochilmaydi**: manzil tasdiqlanmaguncha hisob ishlamaydi.
  // Belgi faqat "xat qaysi manzilga ketdi" deb ko'rsatish va uni
  // qayta jo'natish uchun.
  await setPending(userId);
  redirect('/tasdiqlash');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
