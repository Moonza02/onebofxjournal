'use client';

import { useTransition } from 'react';
import { setLocale } from '@/actions/locale';
import { LOCALES, LOCALE_SHORT, type Locale } from '@/lib/i18n';

/** Til almashtirgich — uchta qisqa tugma.
 *  Ro'yxat emas: uch til uchun ro'yxat ortiqcha bosish bo'ladi.
 */
export default function LocaleSwitch({
  current,
  size = 'sm',
}: {
  current: Locale;
  size?: 'sm' | 'md';
}) {
  const [pending, start] = useTransition();

  const height = size === 'md' ? 'h-[34px] px-3 text-[12.5px]' : 'h-[26px] px-2 text-[11px]';

  return (
    <div className={`flex gap-1 ${pending ? 'opacity-60' : ''}`}>
      {LOCALES.map((locale: Locale) => {
        const on = locale === current;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={on}
            onClick={() =>
              start(() => {
                const data = new FormData();
                data.set('locale', locale);
                void setLocale(data);
              })
            }
            className={`cursor-pointer rounded-[7px] border font-bold transition-colors ${height} ${
              on
                ? 'border-blue bg-blue-soft text-txt'
                : 'border-line bg-card2 text-txt3 hover:text-txt2'
            }`}
          >
            {LOCALE_SHORT[locale]}
          </button>
        );
      })}
    </div>
  );
}
