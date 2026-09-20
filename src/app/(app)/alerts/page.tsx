import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, Empty, Kpi } from '@/components/ui/primitives';
import AlertBanner from '@/components/alerts/AlertBanner';
import { Icon } from '@/components/ui/icons';
import { db } from '@/lib/db';
import { getActiveAccount, getTrades } from '@/lib/account';
import { evaluateAlerts, summarizeAlertOutcomes, type AlertKind } from '@/lib/alerts';
import { clock, monthTitle, pct, shortDate, signedMoney } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { fill, type Dict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function kindLabels(d: Dict): Record<AlertKind, string> {
  return {
    DAILY_LIMIT_NEAR: d.alerts.kindDailyNear,
    DAILY_LIMIT_HIT: d.alerts.kindDailyHit,
    LOSS_STREAK: d.alerts.kindLossStreak,
    REVENGE_TRADE: d.alerts.kindRevenge,
    DRAWDOWN_NEAR: d.alerts.kindDrawdown,
    CORRELATION: d.alerts.kindCorrelation,
    RISK_TOO_BIG: d.alerts.kindRiskBig,
  };
}

type AlertRow = {
  id: string;
  kind: AlertKind;
  message: string;
  context: string;
  action: 'IGNORED' | 'STOPPED' | null;
  tradeId: string | null;
  createdAt: Date;
};

export default async function AlertsPage() {
  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const KIND_LABEL = kindLabels(d);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [history, trades]: [AlertRow[], Awaited<ReturnType<typeof getTrades>>] = await Promise.all([
    db.riskAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    getTrades(account.id),
  ]);

  const live = evaluateAlerts({ account, trades, timeZone: user.timezone, d });
  const thisMonth = history.filter((a) => a.createdAt >= monthStart);
  const outcome = summarizeAlertOutcomes(thisMonth, trades);

  const obeyRate = outcome.total > 0 ? (outcome.stopped / outcome.total) * 100 : 0;

  return (
    <>
      <Topbar
        title={d.alerts.title}
        sub={fill(d.alerts.sub, {
          month: monthTitle(monthStart.getFullYear(), monthStart.getMonth(), locale),
          n: thisMonth.length,
        })}
        cta={null}
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        {live.length > 0 ? (
          <Card padding="p-4">
            <CardTitle
              right={<Chip tone="amber">{fill(d.dashboard.countPieces, { n: live.length })}</Chip>}
            >
              {d.alerts.current}
            </CardTitle>
            <AlertBanner alerts={live} showStopButton />
          </Card>
        ) : (
          <Card padding="p-4">
            <div className="flex items-center gap-3">
              <span className="text-win">
                <Icon name="check" size={18} />
              </span>
              <div>
                <div className="text-[13px] font-bold text-txt">{d.alerts.noneTitle}</div>
                <p className="mt-0.5 text-[12px] text-txt3">{d.alerts.noneBody}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Kpi
            label={d.alerts.thisMonth}
            value={String(outcome.total)}
            sub={d.alerts.thisMonthSub}
          />
          <Kpi
            label={d.alerts.stopped}
            value={String(outcome.stopped)}
            sub={outcome.total ? fill(d.alerts.stoppedSub, { pct: pct(obeyRate, 0) }) : '—'}
            tone="win"
          />
          <Kpi
            label={d.alerts.ignored}
            value={String(outcome.ignored)}
            sub={fill(d.alerts.ignoredSub, { n: outcome.ignoredLosses })}
            tone={outcome.ignored > 0 ? 'amber' : 'plain'}
          />
          <Kpi
            label={d.alerts.ignoredPnl}
            value={outcome.ignored ? signedMoney(outcome.ignoredPnl) : '—'}
            sub={d.alerts.ignoredPnlSub}
            tone={outcome.ignoredPnl >= 0 ? 'win' : 'loss'}
          />
        </div>

        {outcome.ignored > 0 ? (
          <Card padding="p-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-blue">
                <Icon name="brain" size={18} />
              </span>
              <p className="text-[12.5px] leading-relaxed text-txt2">
                {fill(d.alerts.summary, {
                  total: outcome.total,
                  stopped: outcome.stopped,
                  ignored: outcome.ignored,
                  losses: outcome.ignoredLosses,
                })}{' '}
                <b className={outcome.ignoredPnl >= 0 ? 'text-win' : 'text-loss'}>
                  {signedMoney(outcome.ignoredPnl)}
                </b>
                .
              </p>
            </div>
          </Card>
        ) : null}

        <Card className="flex grow flex-col">
          <CardTitle
            right={<span className="text-[11.5px] text-txt3">{d.alerts.historyNote}</span>}
          >
            {d.alerts.history}
          </CardTitle>

          {history.length === 0 ? (
            <Empty
              icon="shield"
              title={d.alerts.emptyTitle}
              hint={d.alerts.emptyHint}
            />
          ) : (
            <div className="flex flex-col">
              {history.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-start gap-3 border-b border-line2 py-3 last:border-b-0"
                >
                  <div className="w-[92px] shrink-0">
                    <div className="font-mono text-[12px] font-semibold text-txt2">
                      {shortDate(alert.createdAt, locale)}
                    </div>
                    <div className="font-mono text-[11px] text-txt3">{clock(alert.createdAt)}</div>
                  </div>

                  <div className="w-[150px] shrink-0">
                    <Chip tone="neutral" className="text-[10.5px]">
                      {KIND_LABEL[alert.kind]}
                    </Chip>
                  </div>

                  <div className="min-w-[200px] grow">
                    <p className="text-[12.5px] leading-relaxed text-txt2">{alert.message}</p>
                    {alert.context ? (
                      <p className="mt-0.5 font-mono text-[11px] text-txt3">{alert.context}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {alert.action === 'STOPPED' ? (
                      <Chip tone="win" icon="check">
                        {d.alerts.actionStopped}
                      </Chip>
                    ) : alert.action === 'IGNORED' ? (
                      <Chip tone="amber">{d.alerts.actionIgnored}</Chip>
                    ) : null}
                    {alert.tradeId ? (
                      <Link
                        href={`/trades/${alert.tradeId}`}
                        className="text-[11.5px] font-bold text-blue hover:text-bluel"
                      >
                        {d.alerts.goTrade}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
