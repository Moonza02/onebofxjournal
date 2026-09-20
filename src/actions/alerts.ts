'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { getActiveAccount, getTrades } from '@/lib/account';
import { getDict } from '@/lib/i18n/server';
import { evaluateAlerts, type Alert } from '@/lib/alerts';

/** Ogohlantirishlarni yozib qo'yish.
 *  action = IGNORED — savdo baribir qo'shildi (tradeId bilan bog'lanadi).
 *  action = STOPPED — foydalanuvchi to'xtashni tanladi.
 */
export async function logAlerts(
  userId: string,
  accountId: string,
  alerts: Alert[],
  action: 'IGNORED' | 'STOPPED',
  tradeId?: string,
) {
  if (alerts.length === 0) return;

  await db.riskAlert.createMany({
    data: alerts.map((a) => ({
      userId,
      accountId,
      kind: a.kind,
      message: a.message,
      context: a.context,
      action,
      tradeId: tradeId ?? null,
    })),
  });
}

/** "Bugun to'xtatdim" tugmasi. Savdo bloklanmaydi — bu shunchaki qaror yozuvi. */
export async function stopForToday() {
  const user = await requireUser();
  const { account } = await getActiveAccount();
  const trades = await getTrades(account.id);

  // Faqat hozir ochiq turgan ogohlantirishlar yoziladi. Ogohlantirish
  // bo'lmasa yozadigan narsa ham yo'q.
  const d = await getDict(user.locale);
  const alerts = evaluateAlerts({ account, trades, timeZone: user.timezone, d });
  await logAlerts(user.id, account.id, alerts, 'STOPPED');

  revalidatePath('/');
  revalidatePath('/alerts');
}
