import 'server-only';
import { db } from './db';

/** Iqtisodiy kalendar — ilovaning yagona tashqi manbaga bog'liq joyi.
 *
 *  Ma'lumot kuniga bir marta olinadi va bazaga yoziladi. Voqealar hamma
 *  foydalanuvchi uchun umumiy, shuning uchun API so'rovlari soni
 *  foydalanuvchilar soniga bog'liq emas.
 *
 *  Provayder javobining maydon nomlari har xil bo'lgani uchun normalizatsiya
 *  bir nechta ehtimoliy nomni qabul qiladi. Provayder tanlangach, real javobni
 *  ko'rib shu joyni aniqlashtirish kerak bo'lishi mumkin.
 */

export type CalendarEvent = {
  date: Date;
  time: string;
  currency: string;
  country: string;
  title: string;
  importance: number;
  actual: string;
  forecast: string;
  previous: string;
};

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', USA: 'USD', 'UNITED STATES': 'USD',
  EU: 'EUR', EA: 'EUR', 'EURO AREA': 'EUR', GERMANY: 'EUR', FRANCE: 'EUR', ITALY: 'EUR', SPAIN: 'EUR',
  GB: 'GBP', UK: 'GBP', 'UNITED KINGDOM': 'GBP',
  JP: 'JPY', JAPAN: 'JPY',
  CH: 'CHF', SWITZERLAND: 'CHF',
  CA: 'CAD', CANADA: 'CAD',
  AU: 'AUD', AUSTRALIA: 'AUD',
  NZ: 'NZD', 'NEW ZEALAND': 'NZD',
  CN: 'CNY', CHINA: 'CNY',
};

export function isCalendarEnabled(): boolean {
  return Boolean(process.env.ECONOMIC_API_KEY);
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text && text.toLowerCase() !== 'null') return text;
  }
  return '';
}

function normalizeImportance(row: Record<string, unknown>): number {
  const raw = pickString(row, ['impact', 'importance', 'volatility', 'priority']).toLowerCase();
  if (!raw) return 1;
  if (/^[0-9]+$/.test(raw)) return Math.min(3, Math.max(1, Number(raw)));
  if (raw.includes('high') || raw.includes('yuqori')) return 3;
  if (raw.includes('medium') || raw.includes('moderate')) return 2;
  return 1;
}

function normalizeEvent(row: Record<string, unknown>): CalendarEvent | null {
  const title = pickString(row, ['event', 'title', 'name', 'indicator']);
  const rawDate = pickString(row, ['date', 'dateTime', 'datetime', 'timestamp', 'releaseDate']);
  if (!title || !rawDate) return null;

  const parsed = new Date(rawDate.includes('T') ? rawDate : rawDate.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return null;

  const countryRaw = pickString(row, ['country', 'countryCode', 'region', 'zone']);
  const currency =
    pickString(row, ['currency', 'currencyCode']) ||
    COUNTRY_CURRENCY[countryRaw.toUpperCase()] ||
    countryRaw.toUpperCase();

  // Sana kunning boshiga keltiriladi, soat alohida saqlanadi.
  const date = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
  const time = rawDate.includes('T') || rawDate.includes(' ')
    ? `${String(parsed.getUTCHours()).padStart(2, '0')}:${String(parsed.getUTCMinutes()).padStart(2, '0')}`
    : '';

  return {
    date,
    time,
    currency: currency.slice(0, 8),
    country: countryRaw,
    title,
    importance: normalizeImportance(row),
    actual: pickString(row, ['actual', 'actualValue', 'value']),
    forecast: pickString(row, ['forecast', 'estimate', 'consensus', 'expected']),
    previous: pickString(row, ['previous', 'prev', 'priorValue']),
  };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Provayderdan olish va bazaga yozish. Kuniga bir marta chaqiriladi. */
export async function syncEvents(daysBack = 2, daysForward = 2): Promise<number> {
  const apiKey = process.env.ECONOMIC_API_KEY;
  if (!apiKey) return 0;

  const base =
    process.env.ECONOMIC_API_URL || 'https://financialmodelingprep.com/stable/economic-calendar';

  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const to = new Date();
  to.setDate(to.getDate() + daysForward);

  const url = new URL(base);
  url.searchParams.set('from', isoDay(from));
  url.searchParams.set('to', isoDay(to));
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Kalendar provayderi ${response.status} qaytardi.`);
  }

  const payload: unknown = await response.json();
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? ((payload as { data: unknown[] }).data)
      : [];

  const events = rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map(normalizeEvent)
    .filter((e): e is CalendarEvent => e !== null);

  for (const event of events) {
    await db.economicEvent.upsert({
      where: {
        date_currency_title: {
          date: event.date,
          currency: event.currency,
          title: event.title,
        },
      },
      create: { ...event, source: base, fetchedAt: new Date() },
      update: {
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous,
        importance: event.importance,
        time: event.time,
        fetchedAt: new Date(),
      },
    });
  }

  return events.length;
}

export type StoredEvent = CalendarEvent & { id: string };

export async function getEventsForDay(day: Date, currencies?: string[]): Promise<StoredEvent[]> {
  const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  return db.economicEvent.findMany({
    where: {
      date,
      importance: { gte: 2 },
      ...(currencies && currencies.length ? { currency: { in: currencies } } : {}),
    },
    orderBy: [{ importance: 'desc' }, { time: 'asc' }],
    take: 12,
  });
}

/** Voqea kutilgandan yaxshimi, yomonmi yoki yuqorimi — matn sifatida.
 *  Bu oddiy solishtirish, "yaxshi/yomon" degani iqtisodiy talqin emas.
 */
export function compareToForecast(event: StoredEvent): 'higher' | 'lower' | 'inline' | 'unknown' {
  const actual = Number(event.actual.replace(/[^0-9.-]/g, ''));
  const forecast = Number(event.forecast.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(actual) || !Number.isFinite(forecast)) return 'unknown';
  if (Math.abs(actual - forecast) < Math.abs(forecast) * 0.005) return 'inline';
  return actual > forecast ? 'higher' : 'lower';
}

/** Savdo qilinadigan instrumentlardan valyuta ro'yxatini chiqaradi. */
export function currenciesFromSymbols(symbols: string[]): string[] {
  const set = new Set<string>();
  for (const symbol of symbols) {
    const s = symbol.toUpperCase();
    for (const code of ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']) {
      if (s.includes(code)) set.add(code);
    }
    // Oltin, kumush va indekslar dollarga bog'liq.
    if (s.startsWith('XAU') || s.startsWith('XAG') || s.startsWith('US') || s.startsWith('NAS')) {
      set.add('USD');
    }
  }
  return [...set];
}
