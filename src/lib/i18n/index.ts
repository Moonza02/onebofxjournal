import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';

/** Ko'p tillilik.
 *
 *  Lug'at — oddiy ichma-ich obyekt. `uz` asosiy manba, qolgan tillar
 *  `Dict` turi bilan bog'langan: birorta kalit tushib qolsa TypeScript
 *  build paytida yiqiladi. Shuning uchun "tarjimasi yo'q" holati
 *  ishga chiqib ketolmaydi.
 *
 *  Matn shakllari uchun oddiy o'rin almashtirish ishlatiladi:
 *  `fill(d.trades.count, { n: 12 })`.
 */

export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uz';

export const LOCALE_NAMES: Record<Locale, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
};

/** Til tanlagichdagi qisqa yorliq. */
export const LOCALE_SHORT: Record<Locale, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
};

export type Dict = typeof uz;

const DICTS: Record<Locale, Dict> = { uz, ru: ru as Dict, en: en as Dict };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dictFor(locale: Locale): Dict {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

/** `{n}` ko'rinishidagi o'rinlarni to'ldiradi.
 *  Qiymat berilmasa o'rin o'z holicha qoladi — bo'shliq chiqmaydi.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** Sana va raqam formatlari uchun BCP-47 teglari. */
export const LOCALE_TAGS: Record<Locale, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

export { uz, ru, en };
