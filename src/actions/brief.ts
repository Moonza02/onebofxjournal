'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { getActiveAccount, getTrades } from '@/lib/account';
import {
  currenciesFromSymbols,
  getEventsForDay,
  isCalendarEnabled,
  syncEvents,
  type StoredEvent,
} from '@/lib/economics';
import { economicAnalysis } from '@/lib/brief';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';

export type EconomicBrief = {
  enabled: boolean;
  text: string;
  yesterday: StoredEvent[];
  today: StoredEvent[];
  error?: string;
};

function utcDay(offsetDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Brifingning iqtisodiy qismi. Kuniga bir marta yaratiladi va keshlanadi —
 *  shuning uchun sahifa har ochilganda AI chaqirilmaydi.
 */
export async function getEconomicBrief(): Promise<EconomicBrief> {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  if (!isCalendarEnabled()) {
    return { enabled: false, text: '', yesterday: [], today: [] };
  }

  // Kalendar hammaga umumiy, tahlil esa tarifga kiradi.
  // Namuna hisobda AI tahlili yopiq — har demo yangi hisob ochadi.
  const billing = await getBilling(user);
  if (user.isDemo || !has(billing.plan, 'economics')) {
    return { enabled: false, text: '', yesterday: [], today: [] };
  }

  const { account } = await getActiveAccount();
  const trades = await getTrades(account.id);
  const symbols = [...new Set(trades.map((t) => t.symbol))].slice(0, 8);
  const currencies = currenciesFromSymbols(symbols);

  const today = utcDay(0);

  // Kunning birinchi so'rovida kalendar yangilanadi.
  const freshest = await db.economicEvent.findFirst({ orderBy: { fetchedAt: 'desc' } });
  const stale =
    !freshest || Date.now() - new Date(freshest.fetchedAt).getTime() > 12 * 60 * 60 * 1000;

  let syncError: string | undefined;
  if (stale) {
    try {
      await syncEvents();
    } catch (error) {
      syncError = error instanceof Error ? error.message : d.brief.syncFailed;
    }
  }

  const [yesterdayEvents, todayEvents] = await Promise.all([
    getEventsForDay(utcDay(-1), currencies),
    getEventsForDay(today, currencies),
  ]);

  const cached = await db.dailyBrief.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  if (cached && cached.economicText) {
    return {
      enabled: true,
      text: cached.economicText,
      yesterday: yesterdayEvents,
      today: todayEvents,
      error: syncError,
    };
  }

  // Faqat chiqqan ma'lumot tahlil qilinadi — kelajak bashorat qilinmaydi.
  const released = yesterdayEvents.filter((e) => e.actual);
  let text = '';
  let error = syncError;

  if (released.length > 0) {
    try {
      text = await economicAnalysis(released, symbols, d, locale);
    } catch (e) {
      error = e instanceof Error ? e.message : d.brief.analysisFailed;
    }
  }

  if (text) {
    await db.dailyBrief.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: {
        userId: user.id,
        date: today,
        economicText: text,
        eventCount: released.length,
      },
      update: { economicText: text, eventCount: released.length },
    });
  }

  return { enabled: true, text, yesterday: yesterdayEvents, today: todayEvents, error };
}

/** Brifingni bugun uchun yopish. */
export async function dismissBrief() {
  const user = await requireUser();
  const today = utcDay(0);

  await db.dailyBrief.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: { userId: user.id, date: today, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });

  revalidatePath('/');
}
