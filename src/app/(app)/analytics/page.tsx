import { Card, CardTitle, Chip, Kpi } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import HourChart from '@/components/charts/HourChart';
import HourHeatmap from '@/components/charts/HourHeatmap';
import HoldScatter from '@/components/charts/HoldScatter';
import { NotEnough } from '@/components/analytics/shared';
import { getActiveAccount, getTrades } from '@/lib/account';
import {
  activeHours,
  holdBuckets,
  holdPoints,
  hourBreakdown,
  weekdayHourMatrix,
} from '@/lib/analytics';
import { duration, pct, signedNum } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function TimeAnalysisPage() {
  const { user, account } = await getActiveAccount();
  const { d } = await getI18n(user.locale);
  const timeZone = user.timezone;
  const trades = await getTrades(account.id);
  const summary = summarize(trades, account.startingBalance);

  if (summary.count < 5) return <NotEnough count={summary.count} />;

  const hours = activeHours(hourBreakdown(trades, timeZone));
  const hourList = hours.map((h) => h.hour);
  const matrix = weekdayHourMatrix(trades, hourList, timeZone);
  const points = holdPoints(trades);
  const buckets = holdBuckets(trades);

  const withEnough = hours.filter((h) => h.count >= 3);
  const worstHour = withEnough.length
    ? withEnough.reduce((a, b) => (b.stopShare > a.stopShare ? b : a))
    : null;
  const bestHour = withEnough.length
    ? withEnough.reduce((a, b) => (b.avgR > a.avgR ? b : a))
    : null;
  const bestBucket = buckets.filter((b) => b.count >= 3).sort((a, b) => b.avgR - a.avgR)[0];

  return (
    <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
      <div className="flex flex-wrap gap-3">
        <Kpi
          label={d.analytics.worstHour}
          value={worstHour ? `${String(worstHour.hour).padStart(2, '0')}:00` : '—'}
          sub={
            worstHour
              ? fill(d.analytics.worstHourSub, { count: worstHour.count, losses: worstHour.losses })
              : d.analytics.noData
          }
          tone={worstHour && worstHour.stopShare >= 60 ? 'loss' : 'plain'}
        />
        <Kpi
          label={d.analytics.bestHour}
          value={bestHour ? `${String(bestHour.hour).padStart(2, '0')}:00` : '—'}
          sub={bestHour ? fill(d.analytics.bestHourSub, { r: `${signedNum(bestHour.avgR, 2)}R` }) : d.analytics.noData}
          tone="win"
        />
        <Kpi
          label={d.analytics.avgHold}
          value={duration(summary.avgHoldMs, d.units)}
          sub={bestBucket ? fill(d.analytics.bestWindow, { label: d.analytics[bestBucket.key] }) : ''}
        />
        <Kpi
          label={d.analytics.stopShare}
          value={pct((summary.losses / Math.max(summary.count, 1)) * 100, 0)}
          sub={fill(d.analytics.stopShareSub, { losses: summary.losses, count: summary.count })}
        />
      </div>

      <Card>
        <CardTitle
          right={<span className="text-[11.5px] text-txt3">{d.analytics.byEntryTime}</span>}
        >
          {d.analytics.hourChart}
        </CardTitle>
        <HourChart rows={hours} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="loss">{d.analytics.closedStop}</Chip>
          <Chip tone="neutral">{d.analytics.breakeven}</Chip>
          <Chip tone="win">{d.analytics.closedProfit}</Chip>
          <span className="grow" />
          <span className="text-[11px] text-txt3">
            {d.analytics.hourChartNote}
          </span>
        </div>
        {worstHour && worstHour.stopShare >= 60 && worstHour.count >= 4 ? (
          <p className="mt-3 flex items-start gap-2.5 rounded-[11px] bg-amber-soft p-3 text-[11.5px] leading-relaxed text-txt2">
            <span className="shrink-0 text-amber">
              <Icon name="shield" size={15} />
            </span>
            {fill(d.analytics.worstHourNote, {
              hour: String(worstHour.hour).padStart(2, '0'),
              count: worstHour.count,
              losses: worstHour.losses,
            })}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardTitle right={<span className="text-[11.5px] text-txt3">{d.analytics.avgR}</span>}>
          {d.analytics.weekdayHour}
        </CardTitle>
        <HourHeatmap matrix={matrix} hours={hourList} />
      </Card>

      <div className="flex flex-col gap-3.5 xl:flex-row">
        <Card className="min-w-0 grow">
          <CardTitle
            right={
              <span className="text-[11.5px] text-txt3">
                {fill(d.dashboard.countTrades, { n: points.length })}
              </span>
            }
          >
            {d.analytics.holdVsResult}
          </CardTitle>
          <HoldScatter points={points} />
          <p className="mt-2 text-[11.5px] leading-relaxed text-txt3">
            {d.analytics.holdNote}
          </p>
        </Card>

        <Card className="w-full shrink-0 xl:w-[380px]">
          <CardTitle>{d.analytics.windows}</CardTitle>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-line pb-2 text-[10.5px] font-bold tracking-[0.08em] text-txt3">
              <span className="grow">{d.analytics.colWindow}</span>
              <span className="w-10 text-right">{d.analytics.colTrades}</span>
              <span className="w-12 text-right">{d.analytics.colWin}</span>
              <span className="w-14 text-right">{d.analytics.colAvgR}</span>
            </div>
            {buckets.map((b) => (
              <div
                key={b.key}
                className="flex items-center gap-2 border-b border-line2 py-2.5 last:border-b-0"
              >
                <span className="grow text-[12px] text-txt2">{d.analytics[b.key]}</span>
                <span className="w-10 text-right font-mono text-[12px] text-txt2">{b.count}</span>
                <span className="w-12 text-right font-mono text-[12px] text-txt2">
                  {b.count ? pct(b.winRate, 0) : '—'}
                </span>
                <span
                  className={`w-14 text-right font-mono text-[12px] font-semibold ${
                    b.count === 0 ? 'text-txt3' : b.avgR >= 0 ? 'text-win' : 'text-loss'
                  }`}
                >
                  {b.count ? `${signedNum(b.avgR, 2)}R` : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
