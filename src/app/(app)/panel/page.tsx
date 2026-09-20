import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Bar, Card, CardTitle, Chip, Kpi, SectionLabel } from '@/components/ui/primitives';
import EquityCurve from '@/components/charts/EquityCurve';
import MorningBrief from '@/components/brief/MorningBrief';
import Onboarding from '@/components/onboarding/Onboarding';
import { accountConfigured, onboardingDone } from '@/lib/onboarding';
import AlertBanner from '@/components/alerts/AlertBanner';
import HBars from '@/components/charts/HBars';
import TradesTable, { DirChip } from '@/components/trades/TradesTable';
import { getActiveAccount, getTrades } from '@/lib/account';
import { duration, monthTitle, money, num, pct, signedMoney, signedPct } from '@/lib/format';
import { groupBy, isClosed, pnlOnDay, riskAmount, summarize } from '@/lib/stats';
import { todayKeyIn } from '@/lib/tz';
import { specFor } from '@/lib/instruments';
import { evaluateAlerts } from '@/lib/alerts';
import { buildStatus, statReminder, todayLine } from '@/lib/brief';
import { getEntries } from '@/lib/journal';
import { db } from '@/lib/db';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const trades = await getTrades(account.id);

  const utcToday = new Date();
  const briefDate = new Date(
    Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), utcToday.getUTCDate()),
  );

  const [briefRow, journalEntries] = await Promise.all([
    db.dailyBrief.findUnique({
      where: { userId_date: { userId: user.id, date: briefDate } },
      select: { dismissedAt: true },
    }),
    getEntries(user.id, 3),
  ]);

  const timeZone = user.timezone;
  const alerts = evaluateAlerts({ account, trades, timeZone, d });
  const showBrief = !briefRow?.dismissedAt;
  const lastLesson = journalEntries.find((e) => e.lessons.length > 0)?.lessons[0] ?? null;

  // Boshlash kartochkasi: uchala qadam tugagach yoki savdo yetarlicha
  // bo'lgach o'zi yo'qoladi — uni yopish tugmasi kerak emas.
  // `getTrades` backtestlarni allaqachon chiqarib tashlaydi.
  const onboarding = {
    accountReady: accountConfigured(account),
    hasTrade: trades.length > 0,
    hasJournal: journalEntries.length > 0,
  };
  const showOnboarding = !onboardingDone(onboarding) && trades.length < 3;

  const summary = summarize(trades, account.startingBalance);
  const open = trades.filter((t) => !isClosed(t));
  const today = new Date();
  const todayPnl = pnlOnDay(trades, todayKeyIn(timeZone), timeZone);

  // Kunlik limit kun boshidagi balansdan hisoblanadi.
  const dayStart = summary.balance - todayPnl;
  const dailyLimit = (dayStart * account.dailyLossPct) / 100;
  const dailyUsed = Math.max(0, -todayPnl);
  const dailyRatio = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;

  const bySetup = groupBy(trades, (t) => t.setup?.name ?? d.dashboard.noSetup).slice(0, 5);
  const growth =
    account.startingBalance > 0 ? (summary.netPnl / account.startingBalance) * 100 : 0;

  return (
    <>
      <Topbar
        title={d.nav.dashboard}
        sub={`${monthTitle(today.getFullYear(), today.getMonth(), locale)} · ${account.name}`}
        cta={{ label: d.dashboard.newTrade, href: '/trades/new' }}
      />

      <div className="flex grow flex-col gap-[18px] p-5 sm:p-[22px] sm:px-[26px]">
        {showOnboarding ? <Onboarding d={d} state={onboarding} /> : null}

        {showBrief ? (
          <MorningBrief
            status={buildStatus(account, trades, timeZone)}
            todayLine={todayLine(account, trades, account.startingBalance, timeZone, d)}
            reminder={statReminder(trades, timeZone, d, locale)}
            lastLesson={lastLesson}
          />
        ) : null}

        {alerts.length > 0 ? <AlertBanner alerts={alerts} showStopButton /> : null}

        <div className="flex flex-wrap gap-3.5">
          <Kpi
            label={d.kpi.netPnl}
            value={signedMoney(summary.netPnl)}
            sub={fill(d.dashboard.ofAccount, { pct: signedPct(growth) })}
            tone={summary.netPnl >= 0 ? 'win' : 'loss'}
          />
          <Kpi
            label={d.kpi.winRate}
            value={`${num(summary.winRate, 0)}%`}
            sub={fill(d.dashboard.winsOf, {
              wins: summary.wins,
              total: summary.wins + summary.losses,
            })}
          />
          <Kpi
            label={d.kpi.profitFactor}
            value={summary.profitFactor === null ? '∞' : num(summary.profitFactor, 2)}
            sub={d.dashboard.pfTarget}
            tone={summary.profitFactor !== null && summary.profitFactor < 1.8 ? 'amber' : 'plain'}
          />
          <Kpi
            label={d.kpi.avgR}
            value={`${summary.avgR >= 0 ? '+' : '−'}${num(Math.abs(summary.avgR), 2)}R`}
            sub={fill(d.dashboard.totalRSub, {
              r: `${summary.totalR >= 0 ? '+' : '−'}${num(Math.abs(summary.totalR), 1)}R`,
            })}
          />
          <Kpi
            label={d.kpi.expectancy}
            value={signedMoney(summary.expectancy)}
            sub={d.dashboard.perTrade}
          />
        </div>

        <Card>
          <div className="mb-2.5 flex flex-wrap items-end gap-3.5">
            <div className="grow">
              <SectionLabel>{d.dashboard.equityLabel}</SectionLabel>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
                <span className="tnum font-mono text-3xl font-semibold tracking-[-0.02em] text-txt">
                  {money(summary.balance)}
                </span>
                <span
                  className={`tnum font-mono text-[13px] font-bold ${
                    summary.netPnl >= 0 ? 'text-win' : 'text-loss'
                  }`}
                >
                  {signedMoney(summary.netPnl)}
                </span>
                <span className="text-xs text-txt3">
                  {fill(d.dashboard.startingBalance, { amount: money(account.startingBalance) })}
                </span>
              </div>
            </div>
            <Chip tone="neutral">{fill(d.dashboard.closedTrades, { n: summary.count })}</Chip>
          </div>

          <EquityCurve
            locale={locale}
            points={summary.equity.map((p) => ({ at: p.at.toISOString(), balance: p.balance }))}
            startingBalance={account.startingBalance}
          />
        </Card>

        <div className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
          <div className="flex min-w-0 grow flex-col">
            <Card className="flex grow flex-col">
              <CardTitle
                right={
                  <Link href="/trades" className="text-xs font-bold text-blue hover:text-bluel">
                    {d.dashboard.viewAll}
                  </Link>
                }
              >
                {d.dashboard.recentTrades}
              </CardTitle>
              <TradesTable trades={trades.slice(0, 8)} />
            </Card>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[358px]">
            <Card padding="p-4">
              <CardTitle
                right={
                  <Chip tone={open.length ? 'amber' : 'neutral'}>
                    {fill(d.dashboard.countPieces, { n: open.length })}
                  </Chip>
                }
              >
                {d.dashboard.openPositions}
              </CardTitle>
              {open.length === 0 ? (
                <p className="text-[12.5px] text-txt3">{d.dashboard.noOpen}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {open.slice(0, 3).map((t) => {
                    const spec = specFor(t.symbol);
                    return (
                      <Link
                        key={t.id}
                        href={`/trades/${t.id}`}
                        className="flex flex-col gap-2 rounded-[11px] bg-card2 p-3 transition-colors hover:bg-[#1A202A]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-txt">{t.symbol}</span>
                          <DirChip direction={t.direction} />
                          <span className="grow" />
                          <span className="font-mono text-[11.5px] text-txt3">
                            {num(t.volume, 2)} {d.units.lot}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Chip tone="neutral" className="text-[10.5px]">
                            {d.dashboard.entry} {num(t.entryPrice, spec.priceDecimals)}
                          </Chip>
                          <Chip tone="loss" className="text-[10.5px]">
                            SL {num(t.stopPrice, spec.priceDecimals)}
                          </Chip>
                          <Chip tone="neutral" className="text-[10.5px]">
                            1R {money(riskAmount(t), 0)}
                          </Chip>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card padding="p-4">
              <CardTitle>{d.dashboard.todayRisk}</CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="tnum font-mono text-[22px] font-semibold text-txt">
                  {pct(dailyRatio, 0)}
                </span>
                <span className="text-xs text-txt3">
                  {fill(d.dashboard.limitUsed, {
                    amount: money(dailyLimit, 0),
                    pct: pct(account.dailyLossPct, 1),
                  })}
                </span>
              </div>
              <div className="mt-2.5">
                <Bar
                  value={dailyRatio}
                  tone={dailyRatio >= 100 ? 'loss' : dailyRatio >= 70 ? 'amber' : 'blue'}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone={todayPnl >= 0 ? 'win' : 'loss'}>
                  {d.dashboard.today} {signedMoney(todayPnl)}
                </Chip>
                {dailyRatio >= 100 ? (
                  <Chip tone="loss" icon="shield">
                    {d.dashboard.limitHit}
                  </Chip>
                ) : dailyRatio >= 70 ? (
                  <Chip tone="amber" icon="shield">
                    {d.dashboard.limitNear}
                  </Chip>
                ) : (
                  <Chip tone="win" icon="check">
                    {d.dashboard.rulesKept}
                  </Chip>
                )}
              </div>
              {dailyRatio >= 70 ? (
                <p className="mt-3 rounded-[11px] bg-amber-soft p-3 text-[11.5px] leading-relaxed text-txt2">
                  {dailyRatio >= 100 ? d.dashboard.limitHitNote : d.dashboard.limitNearNote}
                </p>
              ) : null}
            </Card>

            <Card padding="p-4">
              <CardTitle
                right={
                  <Chip tone="neutral">{fill(d.dashboard.countTrades, { n: summary.count })}</Chip>
                }
              >
                {d.dashboard.bySetup}
              </CardTitle>
              <HBars rows={bySetup} labelWidth={116} valueWidth={68} />
              <div className="mt-4 border-t border-line2 pt-3">
                <div className="flex items-center justify-between text-xs text-txt3">
                  <span>{d.dashboard.avgHold}</span>
                  <span className="font-mono font-semibold text-txt2">
                    {summary.count ? duration(summary.avgHoldMs, d.units) : '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-txt3">
                  <span>{d.dashboard.maxDrawdown}</span>
                  <span className="font-mono font-semibold text-loss">
                    {summary.maxDrawdown > 0
                      ? `−${money(summary.maxDrawdown, 0)} (−${pct(summary.maxDrawdownPct)})`
                      : '—'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
