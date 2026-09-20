import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from './i18n';

/** Formatlash.
 *
 *  Raqamlar ataylab tilga bog'liq emas: mingliklar bo'sh joy bilan,
 *  o'nlik nuqta bilan — maketdagidek va uchala tilda bir xil o'qiladi.
 *  Sana va oy nomlari esa tilga bog'liq va `Intl` orqali olinadi,
 *  shunda rus tilida kelishik ham to'g'ri chiqadi ("15 sentabrya").
 */

export function num(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value
    .toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/,/g, ' ');
}

export function money(value: number, decimals = 2): string {
  return `$${num(Math.abs(value), decimals)}`;
}

/** Ishorali summa: +$504.00 / −$198.00. Rang alohida beriladi. */
export function signedMoney(value: number, decimals = 2): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}$${num(Math.abs(value), decimals)}`;
}

export function signedNum(value: number, decimals = 2): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${num(Math.abs(value), decimals)}`;
}

export function price(value: number | null | undefined, decimals = 5): string {
  if (value === null || value === undefined) return '—';
  return num(value, decimals);
}

export function rText(value: number): string {
  return `${value < 0 ? '−' : '+'}${num(Math.abs(value), 2)}R`;
}

export function pct(value: number, decimals = 1): string {
  return `${num(value, decimals)}%`;
}

export function signedPct(value: number, decimals = 1): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${num(Math.abs(value), decimals)}%`;
}

/* ------------------------------------------------------------------ sana */

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { timeZone: 'UTC', ...options });
    cache.set(key, f);
  }
  return f;
}

/** Mahalliy sanani UTC ga ko'chirib formatlaymiz — shunda `Intl`
 *  server mintaqasiga qarab kunni surib yubormaydi.
 */
function asUtc(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
}

/** "14 Sen" / "14 сент." / "Sep 14" */
export function shortDate(d: Date, locale: Locale = DEFAULT_LOCALE): string {
  return formatter(locale, { day: 'numeric', month: 'short' }).format(asUtc(d));
}

/** "14 Sentabr 2026" / "14 сентября 2026 г." / "September 14, 2026" */
export function longDate(d: Date, locale: Locale = DEFAULT_LOCALE): string {
  return formatter(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(asUtc(d));
}

export function monthTitle(year: number, month: number, locale: Locale = DEFAULT_LOCALE): string {
  return formatter(locale, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month, 15, 12)),
  );
}

/** Dushanbadan boshlanadigan hafta kunlari. */
function weekdayNames(locale: Locale, width: 'short' | 'long'): string[] {
  const f = formatter(locale, { weekday: width });
  // 2026-09-14 — dushanba.
  return Array.from({ length: 7 }, (_, i) =>
    f.format(new Date(Date.UTC(2026, 8, 14 + i, 12))),
  );
}

export function weekdaysShort(locale: Locale = DEFAULT_LOCALE): string[] {
  return weekdayNames(locale, 'short');
}

export function weekdaysLong(locale: Locale = DEFAULT_LOCALE): string[] {
  return weekdayNames(locale, 'long');
}

/** Eski chaqiruvlar uchun — o'zbekcha ro'yxat. */
export const WEEKDAYS_SHORT = weekdaysShort('uz');
export const WEEKDAYS_LONG = weekdaysLong('uz');

export function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 0 = dushanba ... 6 = yakshanba. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Ushlash vaqti: "2s 36m", "48m", "3k 4s".
 *  Birlik harflari tilga bog'liq, shuning uchun tashqaridan beriladi.
 */
export type DurationUnits = { minute: string; hour: string; day: string };

const UZ_UNITS: DurationUnits = { minute: 'm', hour: 's', day: 'k' };

export function duration(ms: number, units: DurationUnits = UZ_UNITS): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}${units.minute}`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem ? `${hours}${units.hour} ${rem}${units.minute}` : `${hours}${units.hour}`;
  const days = Math.floor(hours / 24);
  return `${days}${units.day} ${hours % 24}${units.hour}`;
}

/** datetime-local input uchun. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
