'use client';

import { createContext, useContext } from 'react';
import type { Dict, Locale } from '@/lib/i18n';

/** Mijoz tomonidagi lug'at.
 *
 *  Lug'at serverda tanlanadi va provayder orqali pastga uzatiladi —
 *  shunda mijozga faqat bitta til yuklanadi, uchalasi emas.
 */

/** Standart qiymat ataylab `null`.
 *
 *  Ilgari bu yerda o'zbek lug'ati turardi va provayderi yo'q komponent
 *  jimgina o'zbekchada chiqaverardi — rus yoki ingliz tilidagi
 *  foydalanuvchi buni ko'rardi, biz esa bilmasdik. Endi bunday holat
 *  darrov xato beradi.
 */
const Ctx = createContext<{ locale: Locale; d: Dict } | null>(null);

function useI18nContext() {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error(
      'I18nProvider topilmadi. Lug\'atdan foydalanadigan mijoz komponenti ' +
        'provayder ichida bo\'lishi kerak yoki matnni prop bilan olishi kerak.',
    );
  }
  return value;
}

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ locale, d: dict }}>{children}</Ctx.Provider>;
}

/** Mijoz komponentida lug'at. */
export function useD(): Dict {
  return useI18nContext().d;
}

export function useLocale(): Locale {
  return useI18nContext().locale;
}
