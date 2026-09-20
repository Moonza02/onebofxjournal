import Link from 'next/link';
import { Card, CardTitle, Chip, Empty } from '@/components/ui/primitives';
import CompareCurves from '@/components/charts/CompareCurves';
import { Delta } from '@/components/analytics/shared';
import { getActiveAccount, getTrades } from '@/lib/account';
import { meaningful, periodStats } from '@/lib/analytics';
import { monthTitle, num, pct, signedMoney, signedNum } from '@/lib/format';
import { groupBy } from '@/lib/stats';
import { monthRangeIn } from '@/lib/tz';

import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.p ?? '0') || 0);

  const { user, account } = await getActiveAccount();
  const { d } = await getI18n(user.locale);
  const billing = await getBilling(user);
  if (!has(billing.plan, 'analytics')) {
    return <Locked feature="analytics" what={d.analytics.lockedWhat} why={d.analytics.lockedWhy} />;
  }

  const timeZone = user.timezone;
  const trades = await getTrades(account.id);

  const now = new Date();
  const currentMonth = now.getMonth() - offset;
  const currentRange = monthRangeIn(now.getFullYear(), currentMonth, timeZone);
  const previousRange = monthRangeIn(now.getFullYear(), currentMonth - 1, timeZone);

  // Oy nomini normallashtirish — o'tgan yilga o'tsa ham to'g'ri chiqsin.
  const currentDate = new Date(now.getFullYear(), currentMonth, 1);
  const previousDate = new Date(now.getFullYear(), currentMonth - 1, 1);

  const current = periodStats(
    trades,
    currentRange.from,
    currentRange.to,
    monthTitle(currentDate.getFullYear(), currentDate.getMonth()),
  );
  const previous = periodStats(
    trades,
    previousRange.from,
    previousRange.to,
    monthTitle(previousDate.getFullYear(), previousDate.getMonth()),
  );

  const rows = [
    { label: d.analytics.rowTrades, a: previous.count, b: current.count, format: (v: number) => String(v), higherIsBetter: true },
    { label: d.analytics.rowNetPnl, a: previous.netPnl, b: current.netPnl, format: signedMoney, higherIsBetter: true },
    { label: d.analytics.rowWinRate, a: previous.winRate, b: current.winRate, format: (v: number) => pct(v, 0), higherIsBetter: true },
    {
      label: d.analytics.rowProfitFactor,
      a: previous.profitFactor ?? 0,
      b: current.profitFactor ?? 0,
      format: (v: number) => (v ? num(v, 2) : '—'),
      higherIsBetter: true,
    },
    { label: d.analytics.rowExpectancy, a: previous.expectancy, b: current.expectancy, format: signedMoney, higherIsBetter: true },
    { label: d.analytics.rowAvgR, a: previous.avgR, b: current.avgR, format: (v: number) => `${signedNum(v, 2)}R`, higherIsBetter: true },
    {
      label: d.analytics.rowMaxDd,
      a: previous.maxDrawdownPct,
      b: current.maxDrawdownPct,
      format: (v: number) => pct(v),
      higherIsBetter: false,
    },
    {
      label: d.analytics.rowCompliance,
      a: previous.ruleCompliance,
      b: current.ruleCompliance,
      format: (v: number) => pct(v, 0),
      higherIsBetter: true,
    },
  ];

  const inRange = (from: Date, to: Date) =>
    trades.filter((t) => t.closedAt && t.closedAt >= from && t.closedAt < to);

  const blocks = [
    { label: previous.label, rows: groupBy(inRange(previousRange.from, previousRange.to), (t) => t.setup?.name ?? d.dashboard.noSetup) },
    { label: current.label, rows: groupBy(inRange(currentRange.from, currentRange.to), (t) => t.setup?.name ?? d.dashboard.noSetup) },
  ];

  return (
    <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/analytics/solishtirish?p=${offset + 1}`}
          className="flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-[12px] font-semibold text-txt2 hover:text-txt"
        >
          ← {d.common.previous}
        </Link>
        <span className="px-1 font-display text-[13px] font-bold text-txt">
          {previous.label} → {current.label}
        </span>
        {offset > 0 ? (
          <Link
            href={`/analytics/solishtirish?p=${offset - 1}`}
            className="flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-[12px] font-semibold text-txt2 hover:text-txt"
          >
            {d.common.next} →
          </Link>
        ) : null}
      </div>

      {current.count === 0 && previous.count === 0 ? (
        <Empty
          icon="cal"
          title={d.analytics.emptyPeriods}
          hint={d.analytics.emptyPeriodsHint}
        />
      ) : (
        <>
          <Card>
            <CardTitle>{d.analytics.metrics}</CardTitle>
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="flex items-center gap-3 border-b border-line pb-2.5 text-[10.5px] font-bold tracking-[0.08em] text-txt3">
                  <span className="grow">{d.analytics.colMetric}</span>
                  <span className="w-[110px] text-right">{previous.label}</span>
                  <span className="w-[110px] text-right">{current.label}</span>
                  <span className="w-[100px] text-right">{d.analytics.colDiff}</span>
                </div>

                {rows.map((row) => {
                  const diff = row.b - row.a;
                  const notable = meaningful(row.a, row.b);
                  const good = row.higherIsBetter ? diff > 0 : diff < 0;
                  const color = !notable ? 'text-txt3' : good ? 'text-win' : 'text-loss';

                  return (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 border-b border-line2 py-2.5 last:border-b-0"
                    >
                      <span className="grow text-[12.5px] text-txt2">{row.label}</span>
                      <span className="w-[110px] text-right font-mono text-[12.5px] text-txt2">
                        {previous.count ? row.format(row.a) : '—'}
                      </span>
                      <span className="w-[110px] text-right font-mono text-[12.5px] font-semibold text-txt">
                        {current.count ? row.format(row.b) : '—'}
                      </span>
                      <span className={`w-[100px] text-right font-mono text-[12px] font-semibold ${color}`}>
                        {previous.count && current.count ? row.format(diff) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-txt3">
              {d.analytics.diffNote}
            </p>
          </Card>

          <Card>
            <CardTitle>{d.analytics.equityCurves}</CardTitle>
            <CompareCurves
              a={previous.curve}
              b={current.curve}
              labelA={previous.label}
              labelB={current.label}
            />
            <p className="mt-2 text-[11.5px] text-txt3">
              {d.analytics.curvesNote}
            </p>
          </Card>

          <div className="flex flex-col gap-3.5 xl:flex-row">
            {blocks.map((block) => (
              <Card key={block.label} className="min-w-0 grow">
                <CardTitle right={<Chip tone="neutral">{block.rows.length} setup</Chip>}>
                  {block.label} — setuplar
                </CardTitle>
                {block.rows.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-txt3">{d.analytics.noTrades}</p>
                ) : (
                  block.rows.map((r) => (
                    <div
                      key={r.key}
                      className="flex items-center gap-3 border-b border-line2 py-2 last:border-b-0"
                    >
                      <span className="grow truncate text-[12.5px] text-txt2">{r.key}</span>
                      <span className="w-12 text-right font-mono text-[11.5px] text-txt3">
                        {r.count}
                      </span>
                      <span className="w-20 text-right">
                        <Delta value={r.netPnl} />
                      </span>
                    </div>
                  ))
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
