import Link from 'next/link';
import { Card, CardTitle, Kpi, SectionLabel } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import CompareCurves from '@/components/charts/CompareCurves';
import { NotEnough, Toggle, buildQuery, toggleInList } from '@/components/analytics/shared';
import { getActiveAccount, getTrades } from '@/lib/account';
import { simulate, type SimulationFilter } from '@/lib/analytics';
import { pct, signedMoney, signedNum, weekdaysLong } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';

export const dynamic = 'force-dynamic';

type Search = {
  ex?: string;
  exd?: string;
  hf?: string;
  ht?: string;
  max?: string;
  fixed?: string;
};

const WINDOWS = [
  // Birinchi variant — cheklovsiz; yorlig'i lug'atdan olinadi.
  { label: '', hf: '', ht: '' },
  { label: '09:00–12:00', hf: '9', ht: '11' },
  { label: '09:00–16:00', hf: '9', ht: '15' },
  { label: '14:00–20:00', hf: '14', ht: '19' },
];

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const weekdays = weekdaysLong(locale);
  const billing = await getBilling(user);
  if (!has(billing.plan, 'analytics')) {
    return <Locked feature="analytics" what={d.analytics.lockedWhat} why={d.analytics.lockedWhy} />;
  }

  const timeZone = user.timezone;
  const trades = await getTrades(account.id);
  const summary = summarize(trades, account.startingBalance);

  if (summary.count < 5) return <NotEnough count={summary.count} />;

  const url = (patch: Partial<Search>) =>
    buildQuery('/analytics/simulyator', { ...search, ...patch });

  const setupNames = [...new Set(trades.map((t) => t.setup?.name ?? d.dashboard.noSetup))];
  const excludedSetups = (search.ex ?? '').split(',').filter(Boolean);
  const excludedDays = (search.exd ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n));

  const filter: SimulationFilter = {
    excludeSetups: excludedSetups,
    excludeWeekdays: excludedDays,
    hourFrom: search.hf ? Number(search.hf) : undefined,
    hourTo: search.ht ? Number(search.ht) : undefined,
    maxPerDay: search.max ? Number(search.max) : undefined,
    fixedRisk: search.fixed === '1',
  };

  const base = simulate(trades, account.startingBalance, {}, timeZone);
  const changed = simulate(trades, account.startingBalance, filter, timeZone);

  const anyFilter =
    excludedSetups.length > 0 ||
    excludedDays.length > 0 ||
    filter.hourFrom !== undefined ||
    filter.hourTo !== undefined ||
    filter.maxPerDay !== undefined ||
    filter.fixedRisk === true;

  return (
    <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
      <Card padding="p-4">
        <CardTitle
          right={
            anyFilter ? (
              <Link href="/analytics/simulyator" className="text-xs font-bold text-blue">
                {d.analytics.clear}
              </Link>
            ) : null
          }
        >
          {d.analytics.simulatorTitle}
        </CardTitle>

        <div className="flex flex-col gap-3">
          <div>
            <SectionLabel>{d.analytics.excludeSetup}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {setupNames.map((name) => (
                <Toggle
                  key={name}
                  label={name}
                  active={excludedSetups.includes(name)}
                  href={url({ ex: toggleInList(search.ex, name) })}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>{d.analytics.excludeWeekday}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <Toggle
                  key={index}
                  label={weekdays[index]}
                  active={excludedDays.includes(index)}
                  href={url({ exd: toggleInList(search.exd, String(index)) })}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>{d.analytics.timeWindow}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {WINDOWS.map((w) => (
                <Toggle
                  key={w.label || 'all'}
                  label={w.label || d.analytics.unlimited}
                  active={(search.hf ?? '') === w.hf && (search.ht ?? '') === w.ht}
                  href={url({ hf: w.hf, ht: w.ht })}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div>
              <SectionLabel>{d.analytics.maxPerDay}</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {['', '1', '2', '3'].map((m) => (
                  <Toggle
                    key={m || 'none'}
                    label={m ? `${m} ta` : 'Cheklovsiz'}
                    active={(search.max ?? '') === m}
                    href={url({ max: m })}
                  />
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>{d.analytics.riskMode}</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                <Toggle label={d.analytics.riskReal} active={search.fixed !== '1'} href={url({ fixed: '' })} />
                <Toggle
                  label={d.analytics.riskFixed}
                  active={search.fixed === '1'}
                  href={url({ fixed: '1' })}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Kpi
          label={d.analytics.pnlDiff}
          value={signedMoney(changed.netPnl - base.netPnl)}
          sub={`${signedMoney(base.netPnl)} → ${signedMoney(changed.netPnl)}`}
          tone={changed.netPnl >= base.netPnl ? 'win' : 'loss'}
        />
        <Kpi
          label={d.analytics.ddDiff}
          value={`${signedNum(changed.maxDrawdownPct - base.maxDrawdownPct, 1)}%`}
          sub={`${pct(base.maxDrawdownPct)} → ${pct(changed.maxDrawdownPct)}`}
          tone={changed.maxDrawdownPct <= base.maxDrawdownPct ? 'win' : 'loss'}
        />
        <Kpi
          label={d.analytics.expectancyDiff}
          value={signedMoney(changed.expectancy - base.expectancy)}
          sub={`${signedMoney(base.expectancy)} → ${signedMoney(changed.expectancy)}`}
          tone={changed.expectancy >= base.expectancy ? 'win' : 'loss'}
        />
        <Kpi
          label={d.analytics.remaining}
          value={String(changed.kept)}
          sub={fill(d.analytics.removedCount, { n: changed.removed })}
        />
      </div>

      <Card>
        <CardTitle>{d.analytics.equityCurve}</CardTitle>
        <CompareCurves
          a={base.curve}
          b={changed.curve}
          labelA="Haqiqiy"
          labelB={anyFilter ? d.analytics.changed : d.analytics.unchanged}
        />

        <p className="mt-4 flex items-start gap-2.5 rounded-[11px] bg-amber-soft p-3 text-[11.5px] leading-relaxed text-txt2">
          <span className="shrink-0 text-amber">
            <Icon name="brain" size={15} />
          </span>
          {d.analytics.overfitNote}
          <b className="text-txt">{fill(d.dashboard.countTrades, { n: changed.kept })}</b>
          {changed.kept < 50
            ? d.analytics.smallSample
            : d.analytics.bigSample}
        </p>
      </Card>
    </div>
  );
}
