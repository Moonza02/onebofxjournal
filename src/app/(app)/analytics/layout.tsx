import Topbar from '@/components/ui/Topbar';
import AnalyticsTabs from '@/components/analytics/AnalyticsTabs';
import { getActiveAccount, getTrades } from '@/lib/account';
import { summarize } from '@/lib/stats';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);
  const trades = await getTrades(account.id);
  const summary = summarize(trades, account.startingBalance);

  return (
    <>
      <Topbar
        title={d.analytics.title}
        sub={fill(d.analytics.sub, { n: summary.count, account: account.name })}
        cta={null}
      />
      <AnalyticsTabs />
      {children}
    </>
  );
}
