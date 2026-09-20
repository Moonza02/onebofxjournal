import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, Chip } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import TradesTable from '@/components/trades/TradesTable';
import {
  getActiveAccount,
  getTradeFilters,
  PAGE_SIZE,
  PERIODS,
  queryTrades,
  type PeriodKey,
} from '@/lib/account';
import { duration, num, pct, signedMoney } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { sessionLabel } from '@/lib/i18n/labels';

export const dynamic = 'force-dynamic';

type Search = {
  setup?: string;
  result?: string;
  session?: string;
  symbol?: string;
  bt?: string;
  period?: string;
  page?: string;
};

const RESULT_KEYS = [
  { key: '', label: 'resultAll' },
  { key: 'win', label: 'resultWin' },
  { key: 'loss', label: 'resultLoss' },
  { key: 'open', label: 'resultOpen' },
] as const;

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-[34px] shrink-0 items-center rounded-[9px] border px-3 text-[12.5px] font-semibold transition-colors ${
        active ? 'border-blue bg-blue-soft text-txt' : 'border-line bg-card text-txt2 hover:text-txt'
      }`}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: string }) {
  const color = tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-txt';
  return (
    <div className="flex shrink-0 flex-col gap-[3px] border-l border-line2 px-4 first:border-l-0 first:pl-0">
      <span className="text-[10.5px] font-bold tracking-[0.08em] text-txt3">{label}</span>
      <span className={`tnum font-mono text-[15px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export default async function TradesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const { user, account } = await getActiveAccount();
  const { d } = await getI18n(user.locale);

  const backtest = search.bt === '1';
  const period = (search.period && search.period in PERIODS ? search.period : '365') as PeriodKey;

  // Filtrni o'zgartirganda sahifa birinchisiga qaytadi.
  const href = (patch: Partial<Search>) => {
    const next = { ...search, ...patch, page: patch.page ?? undefined };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/trades?${qs}` : '/trades';
  };

  const [result, filters] = await Promise.all([
    queryTrades({
      accountId: account.id,
      backtest,
      period,
      symbol: search.symbol,
      session: search.session,
      setupName: search.setup,
      result: search.result,
      page: Number(search.page ?? '1') || 1,
    }),
    getTradeFilters(account.id, backtest),
  ]);

  const summary = summarize(result.all, account.startingBalance);
  const from = result.pageIndex * PAGE_SIZE + 1;
  const to = Math.min(result.total, (result.pageIndex + 1) * PAGE_SIZE);

  return (
    <>
      <Topbar
        title={backtest ? d.trades.backtestTitle : d.trades.title}
        sub={fill(d.trades.sub, {
          n: result.total,
          period: d.trades[PERIODS[period].labelKey].toLowerCase(),
        })}
        actions={
          <Link
            href="/trades/import"
            className="hidden h-9 shrink-0 items-center gap-[7px] rounded-[9px] border border-line bg-card px-[13px] text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt sm:flex"
          >
            <Icon name="dl" size={15} />
            {d.import.navCta}
          </Link>
        }
        cta={{ label: d.dashboard.newTrade, href: '/trades/new' }}
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <div className="flex flex-wrap items-center gap-2">
          <FilterLink href={href({ bt: '' })} label={d.trades.realTrades} active={!backtest} />
          <FilterLink href={href({ bt: '1' })} label={d.trades.backtest} active={backtest} />

          <span className="mx-1 h-5 w-px bg-line2" />
          {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
            <FilterLink
              key={key}
              href={href({ period: key })}
              label={d.trades[PERIODS[key].labelKey]}
              active={period === key}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RESULT_KEYS.map((r) => (
            <FilterLink
              key={r.key}
              href={href({ result: r.key })}
              label={d.trades[r.label]}
              active={(search.result ?? '') === r.key}
            />
          ))}

          {filters.setups.length > 0 ? <span className="mx-1 h-5 w-px bg-line2" /> : null}
          {filters.setups.map((s) => (
            <FilterLink
              key={s}
              href={href({ setup: search.setup === s ? '' : s })}
              label={s}
              active={search.setup === s}
            />
          ))}

          {filters.symbols.length > 1 ? <span className="mx-1 h-5 w-px bg-line2" /> : null}
          {filters.symbols.length > 1
            ? filters.symbols.map((s) => (
                <FilterLink
                  key={s}
                  href={href({ symbol: search.symbol === s ? '' : s })}
                  label={s}
                  active={search.symbol === s}
                />
              ))
            : null}

          {filters.sessions.length > 1 ? <span className="mx-1 h-5 w-px bg-line2" /> : null}
          {filters.sessions.length > 1
            ? filters.sessions.map((s) => (
                <FilterLink
                  key={s}
                  href={href({ session: search.session === s ? '' : s })}
                  label={sessionLabel(s, d)}
                  active={search.session === s}
                />
              ))
            : null}
        </div>

        <Card padding="p-3.5">
          <div className="flex flex-wrap items-center gap-y-3 overflow-x-auto">
            <Stat
              label={d.kpi.selected}
              value={fill(d.trades.selectedCount, { n: result.total })}
            />
            <Stat
              label={d.kpi.netPnl}
              value={signedMoney(summary.netPnl)}
              tone={summary.netPnl >= 0 ? 'win' : 'loss'}
            />
            <Stat label={d.kpi.winRate} value={`${num(summary.winRate, 0)}%`} />
            <Stat
              label={d.kpi.profitFactor}
              value={summary.profitFactor === null ? '∞' : num(summary.profitFactor, 2)}
            />
            <Stat
              label={d.kpi.totalR}
              value={`${summary.totalR >= 0 ? '+' : '−'}${num(Math.abs(summary.totalR), 2)}R`}
              tone={summary.totalR >= 0 ? 'win' : 'loss'}
            />
            <Stat
              label={d.kpi.avgHold}
              value={summary.count ? duration(summary.avgHoldMs, d.units) : '—'}
            />
            <span className="grow" />
            <Chip tone={summary.ruleCompliance >= 90 ? 'win' : 'amber'} icon="shield">
              {fill(d.trades.compliance, { pct: pct(summary.ruleCompliance, 0) })}
            </Chip>
          </div>
        </Card>

        {backtest ? (
          <Card padding="p-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-blue">
                <Icon name="book" size={18} />
              </span>
              <div className="min-w-0 grow">
                <div className="text-[13px] font-bold text-txt">{d.trades.backtestNoteTitle}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-txt2">
                  {d.trades.backtestNoteBody}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="flex grow flex-col">
          <TradesTable
            trades={result.page}
            columns={['time', 'symbol', 'dir', 'setup', 'volume', 'entry', 'exit', 'session', 'r', 'pnl']}
          />

          {result.total > 0 ? (
            <div className="flex flex-wrap items-center gap-3 pt-3.5">
              <span className="text-xs text-txt3">
                {fill(d.trades.pageRange, { from, to, total: result.total })}
              </span>
              <span className="grow" />
              {result.pageIndex > 0 ? (
                <Link
                  href={href({ page: String(result.pageIndex) })}
                  className="flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-[12px] font-semibold text-txt2 hover:text-txt"
                >
                  ← {d.common.previous}
                </Link>
              ) : null}
              <span className="font-mono text-[12px] text-txt3">
                {result.pageIndex + 1} / {result.pageCount}
              </span>
              {result.pageIndex + 1 < result.pageCount ? (
                <Link
                  href={href({ page: String(result.pageIndex + 2) })}
                  className="flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-[12px] font-semibold text-txt2 hover:text-txt"
                >
                  {d.common.next} →
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
