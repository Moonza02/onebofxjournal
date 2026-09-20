'use client';

import { useEffect, useState } from 'react';
import { dictFor, DEFAULT_LOCALE, isLocale, type Dict } from '@/lib/i18n';

/** Provayderdan tashqarida turgan komponentlar uchun — masalan
 *  ildizdagi xato sahifasi. Cookie httpOnly emas, shuning uchun
 *  brauzerdan o'qiladi.
 */
export function useCookieLocale(): Dict {
  const [dict, setDict] = useState<Dict>(dictFor(DEFAULT_LOCALE));

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)onebo_locale=([^;]+)/);
    const value = match?.[1];
    if (isLocale(value)) setDict(dictFor(value));
  }, []);

  return dict;
}
