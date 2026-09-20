import Topbar from '@/components/ui/Topbar';
import ImportPanel from '@/components/trades/ImportPanel';
import { importTrades } from '@/actions/import';
import { requireUser } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/components/i18n/Provider';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  return (
    <>
      <Topbar title={d.import.title} sub={d.import.sub} cta={null} />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <I18nProvider locale={locale} dict={d}>
          <ImportPanel action={importTrades} />
        </I18nProvider>
      </div>
    </>
  );
}
