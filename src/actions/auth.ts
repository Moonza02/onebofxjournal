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

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: d.auth.errorExists };

  const user = await db.user.create({
    data: {
      name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      // Yangi foydalanuvchiga sinov muddati — kartasiz.
      trialEndsAt: trialEnd(),
      // Kirishdan oldin tanlangan til saqlanib qoladi.
      locale: await getLocale(),
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
  });

  // Tasdiqlash havolasi. Xat ketmasa ham ro'yxatdan o'tish buzilmaydi:
  // foydalanuvchi ichkariga kiradi va paneldan qayta so'ray oladi.
  // Aks holda SMTP tushib qolgan kuni hech kim ro'yxatdan o'tolmasdi.
  const verification = await issueVerification({
    id: user.id,
    email: user.email,
    locale: user.locale,
  });
  if (!verification.ok) {
    await logError('register.verify', new Error(verification.error ?? 'unknown'), {
      userId: user.id,
    });
  }

  await createSession(user.id);
  redirect('/panel');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
