import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, Empty, KeyValue, Kpi } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import SendReport from '@/components/report/SendReport';
import { getActiveAccount, getTrades } from '@/lib/account';
import { buildWeeklyReport, reportHighlights } from '@/lib/report';
import { isMailConfigured } from '@/lib/mail';
import { money, num, pct, signedMoney } from '@/lib/format';
import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const WEEKS = [
  { key: 0, label: 'weekCurrent' },
  { key: 1, label: 'weekLast' },
  { key: 2, label: 'week2' },
  { key: 3, label: 'week3' },
] as const;

function Bar({ value, max }: { value: number; max: number }) {
  const height = max > 0 ? (Math.abs(value) / max) * 100 : 0;
  const up = value >= 0;
  return (
    <div className="flex h-[92px] w-full flex-col justify-center">
      <div className="flex h-[44px] items-end">
        {up ? (
          <div className="w-full rounded-t-[4px] bg-win" style={{ height: `${height}%` }} />
        ) : null}
      </div>
      <div className="h-px w-full bg-line2" />
      <div className="flex h-[44px] items-start">
        {!up ? (
          <div className="w-full rounded-b-[4px] bg-loss" style={{ height: `${height}%` }} />
        ) : null}
      </div>
    </div>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const sp = await searchParams;
  const week = WEEKS.some((w) => String(w.key) === sp.w) ? Number(sp.w) : 1;

  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const billing = await getBilling(user);

  if (!has(billing.plan, 'report')) {
    return (
      <>
        <Topbar title={d.report.title} sub={d.report.lockedSub} />
        <Locked feature="report" what={d.report.lockedWhat} why={d.report.lockedWhy} />
      </>
    );
  }

  const trades = await getTrades(account.id);

  const report = await buildWeeklyReport({
    userId: user.id,
    userName: user.name,
    account,
    trades,
    timeZone: user.timezone,
    offset: week,
    locale,
  });

  const highlights = reportHighlights(report, d);
  const maxDay = Math.max(1, ...report.byDay.map((d) => Math.abs(d.netPnl)));

  return (
    <>
      <Topbar
        title={d.report.title}
        sub={fill(d.report.sub, { label: report.label, n: report.count })}
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <div className="flex flex-wrap items-center gap-2">
          {WEEKS.map((w) => (
            <Link
              key={w.key}
              href={`/hisobot?w=${w.key}`}
              className={`flex h-[34px] shrink-0 items-center rounded-[9px] border px-3 text-[12.5px] font-semibold transition-colors ${
                week === w.key
                  ? 'border-blue bg-blue-soft text-txt'
                  : 'border-line bg-card text-txt2 hover:text-txt'
              }`}
            >
              {d.report[w.label]}
            </Link>
          ))}
          <span className="grow" />
          <a
            href={`/api/report/weekly?w=${week}`}
            className="inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[9px] border border-line bg-card2 px-3.5 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            <Icon name="dl" size={15} />
            {d.report.download}
          </a>
        </div>

        <div className="flex flex-wrap gap-3">
          <Kpi
            label={d.kpi.netPnl}
            value={signedMoney(report.netPnl)}
            sub={
              report.previous
                ? fill(d.report.lastWeekPnl, { amount: signedMoney(report.previous.netPnl, 0) })
                : d.report.noCompare
            }
            tone={report.netPnl > 0 ? 'win' : report.netPnl < 0 ? 'loss' : 'plain'}
          />
          <Kpi
            label={d.kpi.totalR}
            value={`${report.totalR >= 0 ? '+' : '−'}${num(Math.abs(report.totalR), 2)}R`}
            sub={fill(d.report.tradeCount, { n: report.count })}
            tone={report.totalR >= 0 ? 'win' : 'loss'}
          />
          <Kpi
            label={d.kpi.winRate}
            value={`${num(report.winRate, 0)}%`}
            sub={
              report.profitFactor === null
                ? 'profit factor ∞'
                : `profit factor ${num(report.profitFactor, 2)}`
            }
          />
          <Kpi
            label={d.kpi.compliance}
            value={pct(report.ruleCompliance, 0)}
            sub={
              report.broken.length
                ? fill(d.report.breaches, { n: report.broken.length })
                : d.report.noBreaches
            }
            tone={report.ruleCompliance >= 90 ? 'win' : 'amber'}
          />
        </div>

        <div className="flex flex-col gap-3.5 xl:flex-row">
          <div className="flex min-w-0 grow flex-col gap-3.5">
            <Card>
              <CardTitle right={<Chip tone="blue">{report.label}</Chip>}>
                {d.report.summary}
              </CardTitle>
              <ul className="flex flex-col gap-2.5">
                {highlights.map((line, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue" />
                    <span className="text-[12.5px] leading-relaxed text-txt2">{line}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {report.count > 0 ? (
              <Card>
                <CardTitle>{d.report.byDay}</CardTitle>
                <div className="flex gap-2">
                  {report.byDay.map((day) => (
                    <div key={day.label} className="flex min-w-0 grow basis-0 flex-col items-center gap-1.5">
                      <span
                        className={`tnum font-mono text-[10.5px] font-bold ${
                          day.count === 0 ? 'text-txt4' : day.netPnl >= 0 ? 'text-win' : 'text-loss'
                        }`}
                      >
                        {day.count ? signedMoney(day.netPnl, 0) : '—'}
                      </span>
                      <Bar value={day.netPnl} max={maxDay} />
                      <span className="text-[10.5px] text-txt3">{day.label.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Empty
                icon="cal"
                title={d.report.emptyTitle}
                hint={d.report.emptyHint}
              />
            )}

            {report.bySetup.length > 0 ? (
              <Card>
                <CardTitle>{d.report.setups}</CardTitle>
                {report.bySetup.map((g) => (
                  <KeyValue
                    key={g.key}
                    label={fill(d.report.setupRow, {
                      name: g.key,
                      n: g.count,
                      win: num(g.winRate, 0),
                    })}
                    value={signedMoney(g.netPnl)}
                    tone={g.netPnl >= 0 ? 'win' : 'loss'}
                  />
                ))}
              </Card>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[310px]">
            <Card>
              <CardTitle>{d.report.sendTitle}</CardTitle>
              <p className="mb-3.5 text-[12px] leading-relaxed text-txt3">{d.report.sendNote}</p>
              <SendReport week={week} defaultEmail={user.email} configured={isMailConfigured()} />
            </Card>

            <Card>
              <CardTitle>{d.report.weekState}</CardTitle>
              <KeyValue label={d.report.openBalance} value={money(report.openBalance, 0)} />
              <KeyValue
                label={d.report.closeBalance}
                value={money(report.closeBalance, 0)}
                tone={report.netPnl >= 0 ? 'win' : 'loss'}
              />
              <KeyValue label={d.report.maxDrawdown} value={money(report.maxDrawdown)} tone="muted" />
              <KeyValue
                label={d.report.lossStreak}
                value={
                  report.longestLossStreak
                    ? fill(d.dashboard.countPieces, { n: report.longestLossStreak })
                    : d.common.none
                }
                tone={report.longestLossStreak >= 3 ? 'loss' : 'muted'}
              />
              <KeyValue
                label={d.report.bestTrade}
                value={report.count ? signedMoney(report.best) : '—'}
                tone="win"
              />
              <KeyValue
                label={d.report.worstTrade}
                value={report.count ? signedMoney(report.worst) : '—'}
                tone="loss"
              />
            </Card>

            {report.lessons.length > 0 ? (
              <Card>
                <CardTitle>{d.report.lessons}</CardTitle>
                <ul className="flex flex-col gap-2">
                  {report.lessons.slice(0, 8).map((lesson, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                      <span className="text-[12px] leading-relaxed text-txt2">{lesson}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
