import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/components/i18n/Provider';
import LocaleSwitch from '@/components/i18n/LocaleSwitch';

export const dynamic = 'force-dynamic';

/** Kirish sahifalarida ham til almashtiriladi — odam ilovaga
 *  kirmasdan turib o'z tilini tanlay olishi kerak.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, d } = await getI18n();

  return (
    <I18nProvider locale={locale} dict={d}>
      <div className="relative">
        <div className="absolute right-5 top-5 z-10">
          <LocaleSwitch current={locale} />
        </div>
        {children}
      </div>
    </I18nProvider>
  );
}
