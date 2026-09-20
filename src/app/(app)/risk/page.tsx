import Topbar from '@/components/ui/Topbar';
import RiskCalculator from '@/components/risk/RiskCalculator';
import { getActiveAccount, getTrades } from '@/lib/account';
import { pnlOnDay, summarize } from '@/lib/stats';
import { todayKeyIn } from '@/lib/tz';
import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function RiskPage() {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);
  const trades = await getTrades(account.id);

  const summary = summarize(trades, account.startingBalance);
  const todayPnl = pnlOnDay(trades, todayKeyIn(user.timezone), user.timezone);
  const dayStart = summary.balance - todayPnl;
  const dailyUsedPct = dayStart > 0 ? (Math.max(0, -todayPnl) / dayStart) * 100 : 0;

  return (
    <>
      <Topbar
        title={d.risk.title}
        sub={d.risk.sub}
        cta={{ label: d.dashboard.newTrade, href: '/trades/new' }}
      />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <RiskCalculator
          balance={summary.balance}
          riskPerTradePct={account.riskPerTradePct}
          dailyLossPct={account.dailyLossPct}
          dailyUsedPct={dailyUsedPct}
        />
      </div>
    </>
  );
}
