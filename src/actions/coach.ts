'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAccount } from '@/lib/account';
import { getTrades } from '@/lib/account';
import { buildContext, coachReply, getChat, MESSAGE_MAX, MOODS } from '@/lib/coach';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getDict } from '@/lib/i18n/server';
import { logError } from '@/lib/log';
import { fill } from '@/lib/i18n';

export type CoachState = { error?: string; ok?: boolean };

const schema = z.object({
  message: z.string().trim().min(1).max(MESSAGE_MAX),
  mood: z.string().optional(),
});

export async function sendCoachMessage(
  _prev: CoachState,
  formData: FormData,
): Promise<CoachState> {
  const parsed = schema.safeParse({
    message: formData.get('message'),
    mood: formData.get('mood'),
  });
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  if (!parsed.success) {
    const tooLong = String(formData.get('message') ?? '').trim().length > MESSAGE_MAX;
    return { error: tooLong ? fill(d.coach.tooLong, { n: MESSAGE_MAX }) : d.coach.emptyMessage };
  }

  // Namuna hisobda AI chaqiruvlari yopiq: har bosishda yangi hisob
  // ochiladi, ya'ni foydalanuvchi bo'yicha chegara ma'nosini yo'qotadi.
  if (user.isDemo) return { error: d.demo.blocked };

  const billing = await getBilling(user);
  if (!has(billing.plan, 'coach')) {
    return { error: d.coach.locked };
  }

  // Soatiga 40 xabar — odatdagi suhbat uchun yetarli, xarajat esa cheklangan.
  // Chegara ikki tomondan: hisob bo'yicha ham, IP bo'yicha ham. Aks holda
  // yangi hisob ochib hisoblagichni nolga tushirish mumkin bo'lardi.
  const limit = await rateLimit(`coach:${user.id}`, 40, 60 * 60 * 1000);
  const byIp = await rateLimit(await clientKey('coach-ip'), 120, 60 * 60 * 1000);
  if (!limit.allowed || !byIp.allowed) {
    const minutes = Math.ceil(Math.max(limit.retryAfterSec, byIp.retryAfterSec) / 60);
    return { error: fill(d.coach.rateLimited, { minutes }) };
  }

  const mood = MOODS.some((m) => m.key === parsed.data.mood) ? parsed.data.mood! : '';

  // Foydalanuvchi xabari darrov saqlanadi — model javob bermasa ham yozuv qoladi.
  await db.chatMessage.create({
    data: { userId: user.id, role: 'USER', content: parsed.data.message, moodTag: mood },
  });

  const [history, trades] = await Promise.all([getChat(user.id), getTrades(account.id)]);

  // Yuqorida saqlangan xabar tarixning oxirida — uni ikki marta yubormaymiz.
  const previous = history.slice(0, -1);
  const context = buildContext(account, trades, user.timezone, d);

  let reply: string | null = null;
  try {
    reply = await coachReply(
      previous,
      mood ? `[Holat: ${mood}]\n${parsed.data.message}` : parsed.data.message,
      context,
      user.name,
      user.locale,
    );
  } catch (error) {
    await logError('coach.reply', error, { userId: user.id });
    reply = null;
  }

  if (!reply) {
    revalidatePath('/journal/suhbat');
    return {
      error: d.coach.noReply,
    };
  }

  await db.chatMessage.create({
    data: { userId: user.id, role: 'ASSISTANT', content: reply },
  });

  revalidatePath('/journal/suhbat');
  return { ok: true };
}

export async function clearCoachChat(): Promise<void> {
  const { user } = await getActiveAccount();
  await db.chatMessage.deleteMany({ where: { userId: user.id } });
  revalidatePath('/journal/suhbat');
}
