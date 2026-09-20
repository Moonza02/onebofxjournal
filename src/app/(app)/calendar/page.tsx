import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, KeyValue, SectionLabel } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import Donut from '@/components/charts/Donut';
import VBars from '@/components/charts/VBars';
import { getActiveAccount, getTrades } from '@/lib/account';
import { monthTitle, num, pct, signedMoney, weekdaysShort } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { monthCalendar, netPnl, isClosed, summarize, weekdayBreakdown } from '@/lib/stats';
import { dayKeyIn } from '@/lib/tz';

export const dynamic = 'force-dynamic';

/** Katak rangi — noldan ikki tomonga: yashil foyda, qizil zarar, neytral o'rta. */
function cellStyle(pnl: number, count: number, max: number) {
  if (count === 0) return { background: '#0D1015', borderColor: '#161B23' };
  if (pnl === 0) return { background: '#12161D', borderColor: '#161B23' };
  const strength = Math.min(0.42, 0.12 + (Math.abs(pnl) / Math.max(max, 1)) * 0.3);
  const rgb = pnl > 0 ? '31,208,138' : '255,95,114';
  return {
    background: `rgba(${rgb},${strength.toFixed(3)})`,
    borderColor: `rgba(${rgb},0.30)`,
  };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = Number.isFinite(Number(sp.m)) && sp.m !== undefined ? Number(sp.m) : now.getMonth();

  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const weekdays = weekdaysShort(locale);
  const timeZone = user.timezone;
  const trades = await getTrades(account.id);
  const weeks = monthCalendar(trades, year, month, timeZone);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const monthTrades = trades.filter(
    (t) => isClosed(t) && dayKeyIn(t.closedAt!, timeZone).startsWith(monthPrefix),
  );

  const dayTotals = weeks
    .flat()
    .filter((c): c is NonNullable<typeof c> => c !== null && c.count > 0);
  const maxAbs = Math.max(...dayTotals.map((c) => Math.abs(c.netPnl)), 1);

  const monthSummary = summarize(monthTrades, 0);
  const monthPnl = monthTrades.reduce((s, t) => s + netPnl(t), 0);
  const greenDays = dayTotals.filter((d) => d.netPnl > 0).length;
  const bestDay = dayTotals.reduce<(typeof dayTotals)[number] | null>(
    (best, d) => (best === null || d.netPnl > best.netPnl ? d : best),
    null,
  );
  const worstDay = dayTotals.reduce<(typeof dayTotals)[number] | null>(
    (worst, d) => (worst === null || d.netPnl < worst.netPnl ? d : worst),
    null,
  );

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  return (
    <>
      <Topbar
        title={d.calendar.title}
        sub={fill(d.calendar.sub, { n: dayTotals.length })}
        cta={{ label: d.dashboard.newTrade, href: '/trades/new' }}
        actions={
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/calendar?y=${prev.y}&m=${prev.m}`}
              aria-label={d.calendar.prevMonth}
              className="flex h-[34px] w-[34px] rotate-180 items-center justify-center rounded-[9px] border border-line bg-card text-txt2 transition-colors hover:text-txt"
            >
              <Icon name="chev" size={15} />
            </Link>
            <span className="px-1 font-display text-[13px] font-bold text-txt">
              {monthTitle(year, month, locale)}
            </span>
            <Link
              href={`/calendar?y=${next.y}&m=${next.m}`}
              aria-label={d.calendar.nextMonth}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-line bg-card text-txt2 transition-colors hover:text-txt"
            >
              <Icon name="chev" size={15} />
            </Link>
          </div>
        }
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <Card>
          <CardTitle
            right={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-txt3">{d.calendar.loss}</span>
                <span className="h-2.5 w-4 rounded-[3px] bg-[rgba(255,95,114,0.40)]" />
                <span className="h-2.5 w-4 rounded-[3px] bg-[rgba(255,95,114,0.18)]" />
                <span className="h-2.5 w-4 rounded-[3px] bg-[#12161D]" />
                <span className="h-2.5 w-4 rounded-[3px] bg-[rgba(31,208,138,0.18)]" />
                <span className="h-2.5 w-4 rounded-[3px] bg-[rgba(31,208,138,0.40)]" />
                <span className="text-[11px] text-txt3">{d.calendar.profit}</span>
              </div>
            }
          >
            {monthTitle(year, month, locale)}
          </CardTitle>

          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="mb-2 grid grid-cols-8 gap-2">
                {weekdays.map((name) => (
                  <div
                    key={name}
                    className="text-center text-[10.5px] font-bold tracking-[0.08em] text-txt3"
                  >
                    {name.toUpperCase()}
                  </div>
                ))}
                <div className="text-center text-[10.5px] font-bold tracking-[0.08em] text-txt3">
                  {d.calendar.week}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {weeks.map((week, wi) => {
                  const weekPnl = week.reduce((s, c) => s + (c?.netPnl ?? 0), 0);
                  const weekCount = week.reduce((s, c) => s + (c?.count ?? 0), 0);
                  return (
                    <div key={wi} className="grid grid-cols-8 gap-2">
                      {week.map((cell, ci) =>
                        cell === null ? (
                          <div key={ci} className="h-[112px] rounded-[11px] bg-[#090C11]" />
                        ) : (
                          <div
                            key={ci}
                            className="flex h-[112px] flex-col rounded-[11px] border p-2.5"
                            style={cellStyle(cell.netPnl, cell.count, maxAbs)}
                          >
                            <div
                              className={`font-mono text-xs font-semibold ${
                                cell.count ? 'text-txt2' : 'text-[#4A5464]'
                              }`}
                            >
                              {cell.day}
                            </div>
                            <div className="grow" />
                            {cell.count > 0 ? (
                              <>
                                <div
                                  className={`tnum font-mono text-sm font-bold ${
                                    cell.netPnl >= 0 ? 'text-win' : 'text-loss'
                                  }`}
                                >
                                  {signedMoney(cell.netPnl, 0)}
                                </div>
                                <div className="mt-0.5 text-[10.5px] text-txt3">
                                  {fill(d.calendar.closedTrades, { n: cell.count })}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ),
                      )}

                      <div className="flex h-[112px] flex-col rounded-[11px] border border-line bg-card2 p-2.5">
                        <div className="text-[10.5px] font-bold text-txt3">
                          {fill(d.calendar.weekShort, { n: wi + 1 })}
                        </div>
                        <div className="grow" />
                        <div
                          className={`tnum font-mono text-sm font-bold ${
                            weekPnl >= 0 ? 'text-win' : 'text-loss'
                          }`}
                        >
                          {weekCount ? signedMoney(weekPnl, 0) : '—'}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-txt3">
                          {fill(d.calendar.closedTrades, { n: weekCount })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: d.calendar.monthResult,
              value: signedMoney(monthPnl),
              sub: fill(d.calendar.closedTrades, { n: monthTrades.length }),
              tone: monthPnl >= 0 ? 'text-win' : 'text-loss',
            },
            {
              label: d.calendar.bestDay,
              value: bestDay ? signedMoney(bestDay.netPnl) : '—',
              sub: bestDay
                ? fill(d.calendar.dayCount, { day: bestDay.day, n: bestDay.count })
                : d.calendar.noData,
              tone: 'text-win',
            },
            {
              label: d.calendar.worstDay,
              value: worstDay ? signedMoney(worstDay.netPnl) : '—',
              sub: worstDay
                ? fill(d.calendar.dayCount, { day: worstDay.day, n: worstDay.count })
                : d.calendar.noData,
              tone: 'text-loss',
            },
            {
              label: d.calendar.greenDays,
              value: `${greenDays} / ${dayTotals.length}`,
              sub: dayTotals.length
                ? fill(d.calendar.greenDaysSub, {
                    pct: pct((greenDays / dayTotals.length) * 100, 0),
                  })
                : d.calendar.noData,
              tone: 'text-txt',
            },
          ].map((s) => (
            <Card key={s.label} padding="p-4">
              <SectionLabel>{s.label}</SectionLabel>
              <div className={`tnum mt-2 font-mono text-[21px] font-semibold ${s.tone}`}>
                {s.value}
              </div>
              <div className="mt-1 text-[11.5px] text-txt3">{s.sub}</div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 xl:flex-row">
          <Card className="min-w-0 grow">
            <CardTitle
              right={
                <span className="text-[11.5px] text-txt3">{monthTitle(year, month, locale)}</span>
              }
            >
              {d.calendar.byWeekday}
            </CardTitle>
            {monthSummary.count > 0 ? (
              <VBars
                rows={weekdayBreakdown(monthTrades, timeZone)
                  .slice(0, 5)
                  .map((row, i) => ({ label: weekdays[i], value: row.netPnl }))}
                width={520}
                height={182}
              />
            ) : (
              <p className="py-8 text-center text-[12.5px] text-txt3">{d.calendar.empty}</p>
            )}
          </Card>

          <Card className="w-full shrink-0 xl:w-[360px]">
            <CardTitle>{d.calendar.monthSummary}</CardTitle>
            <div className="flex items-center gap-4">
              <Donut value={monthSummary.winRate} caption={d.calendar.winRate} size={120} />
              <div className="min-w-0 grow">
                <KeyValue label={d.calendar.wins} value={String(monthSummary.wins)} tone="win" />
                <KeyValue label={d.calendar.losses} value={String(monthSummary.losses)} tone="loss" />
                <KeyValue
                  label={d.calendar.avgR}
                  value={
                    monthSummary.count
                      ? `${monthSummary.avgR >= 0 ? '+' : '−'}${num(Math.abs(monthSummary.avgR), 2)}R`
                      : '—'
                  }
                />
                <KeyValue
                  label={d.calendar.compliance}
                  value={monthSummary.count ? pct(monthSummary.ruleCompliance, 0) : '—'}
                  tone="win"
                />
              </div>
            </div>
          </Card>
        </div>

        {dayTotals.length === 0 ? (
          <p className="text-center text-[12.5px] text-txt3">
            {fill(d.calendar.emptyLong, { month: monthTitle(year, month, locale) })}
          </p>
        ) : (
          <p className="text-center text-[12px] text-txt3">
            {fill(d.calendar.averageDay, {
              amount: signedMoney(monthPnl / dayTotals.length),
              n: num(monthTrades.length / dayTotals.length, 1),
            })}
          </p>
        )}
      </div>
    </>
  );
}
