import 'server-only';
import { cookies } from 'next/headers';
import { dictFor, DEFAULT_LOCALE, isLocale, type Dict, type Locale } from './index';

/** Tilni aniqlash.
 *
 *  Tartib: cookie → foydalanuvchi sozlamasi → standart. Cookie birinchi
 *  bo'lgani muhim: kirmagan odam ham tilni almashtira olishi kerak, va
 *  til o'zgartirilganda cookie ham, baza ham yangilanadi.
 */

export const LOCALE_COOKIE = 'onebo_locale';

export async function getLocale(userLocale?: string | null): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  if (isLocale(userLocale)) return userLocale;
  return DEFAULT_LOCALE;
}

export async function getDict(userLocale?: string | null): Promise<Dict> {
  return dictFor(await getLocale(userLocale));
}

/** Sahifalarga ikkalasi ham kerak bo'ladi. */
export async function getI18n(
  userLocale?: string | null,
): Promise<{ locale: Locale; d: Dict }> {
  const locale = await getLocale(userLocale);
  return { locale, d: dictFor(locale) };
}
