import { Card, CardTitle, Empty, Kpi } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import FanChart from '@/components/charts/FanChart';
import Histogram from '@/components/charts/Histogram';
import { getActiveAccount, getTrades } from '@/lib/account';
import { monteCarlo } from '@/lib/analytics';
import { pct } from '@/lib/format';
import { summarize } from '@/lib/stats';

import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function MonteCarloPage() {
  const { user, account } = await getActiveAccount();
  const { d } = await getI18n(user.locale);
  const billing = await getBilling(user);
  if (!has(billing.plan, 'analytics')) {
    return <Locked feature="analytics" what={d.analytics.lockedWhat} why={d.analytics.lockedWhy} />;
  }

  const trades = await getTrades(account.id);
  const summary = summarize(trades, account.startingBalance);

  const result = monteCarlo(trades, account.startingBalance, account.maxDrawdownPct);

  if (!result) {
    return (
      <div className="p-5 sm:p-[22px] sm:px-[26px]">
        <Empty
          icon="chart"
          title={d.analytics.monteNeedTitle}
          hint={fill(d.analytics.monteNeedHint, { count: summary.count })}
        />
      </div>
    );
  }

  return (
    <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
      <div className="flex flex-wrap gap-3">
        <Kpi
          label={d.analytics.typicalDd}
          value={pct(result.medianDrawdownPct)}
          sub={d.analytics.halfBelow}
        />
        <Kpi
          label={d.analytics.worstCase}
          value={pct(result.worstDrawdownPct)}
          sub={d.analytics.percentile95}
          tone="loss"
        />
        <Kpi
          label={d.analytics.limitProbability}
          value={pct(result.ruinChance, 1)}
          sub={fill(d.analytics.limitWith, { pct: pct(account.maxDrawdownPct, 0) })}
          tone={result.ruinChance >= 10 ? 'loss' : result.ruinChance >= 3 ? 'amber' : 'win'}
        />
        <Kpi
          label={d.analytics.typicalStreak}
          value={fill(d.dashboard.countPieces, { n: result.typicalStreak })}
          sub={fill(d.analytics.worstStreak, { n: result.worstStreak })}
        />
      </div>

      <Card>
        <CardTitle
          right={
            <span className="text-[11.5px] text-txt3">
              {fill(d.analytics.scenarios, { runs: result.runs, n: result.sampleSize })}
            </span>
          }
        >
          {d.analytics.possiblePaths}
        </CardTitle>
        <FanChart bands={result.bands} startingBalance={account.startingBalance} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-txt3">
          {fill(d.analytics.fanNote, { runs: result.runs })}
        </p>
      </Card>

      <div className="flex flex-col gap-3.5 xl:flex-row">
        <Card className="min-w-0 grow">
          <CardTitle>{d.analytics.ddDistribution}</CardTitle>
          <Histogram
            bars={result.drawdownHistogram}
            total={result.runs}
            tone="loss"
            unit={d.analytics.caseUnit}
          />
        </Card>

        <Card className="min-w-0 grow">
          <CardTitle>{d.analytics.longestStreak}</CardTitle>
          <Histogram bars={result.streakHistogram} total={result.runs} unit={d.analytics.caseUnit} />
          <p className="mt-3 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
            <span className="shrink-0 text-blue">
              <Icon name="brain" size={15} />
            </span>
            {fill(d.analytics.streakNote, {
              typical: result.typicalStreak,
              worst: result.worstStreak,
            })}
          </p>
        </Card>
      </div>
    </div>
  );
}
