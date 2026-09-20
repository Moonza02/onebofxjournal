import Topbar from '@/components/ui/Topbar';
import Tabs, { journalTabs } from '@/components/ui/Tabs';
import { Card, CardTitle, Chip, KeyValue } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import CoachChat from '@/components/journal/CoachChat';
import ClearChat from '@/components/journal/ClearChat';
import { getActiveAccount, getTrades } from '@/lib/account';
import { buildContext, getChat, grounding } from '@/lib/coach';
import { money, num, signedMoney } from '@/lib/format';
import { fill } from '@/lib/i18n';
import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const { user, account } = await getActiveAccount();
  const { d } = await getI18n(user.locale);
  const billing = await getBilling(user);

  if (!has(billing.plan, 'coach')) {
    return (
      <>
        <Topbar title={d.coach.title} sub={d.coach.lockedSub} />
        <Tabs tabs={journalTabs(d)} active="/journal/suhbat" />
        <Locked
          feature="coach"
          what={d.coach.lockedWhat}
          why={d.coach.lockedWhy}
        />
      </>
    );
  }

  const [rows, trades] = await Promise.all([getChat(user.id), getTrades(account.id)]);

  const context = buildContext(account, trades, user.timezone, d);
  const steps = grounding(context, d);

  const limitTone = context.limitUsedPct >= 80 ? 'loss' : context.limitUsedPct >= 50 ? 'amber' : 'win';

  return (
    <>
      <Topbar
        title={d.coach.title}
        sub={d.coach.sub}
      />
      <Tabs tabs={journalTabs(d)} active="/journal/suhbat" />

      <div className="flex min-h-0 grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="flex min-h-0 min-w-0 grow flex-col">
          <CoachChat rows={rows} />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[290px]">
          <Card padding="p-4">
            <CardTitle right={<Chip tone={limitTone}>{num(context.limitUsedPct, 0)}%</Chip>}>
              {d.coach.state}
            </CardTitle>
            <KeyValue
              label={d.coach.todayResult}
              value={context.todayCount ? signedMoney(context.todayPnl) : '—'}
              tone={context.todayPnl > 0 ? 'win' : context.todayPnl < 0 ? 'loss' : 'muted'}
            />
            <KeyValue
              label={d.coach.todayTrades}
              value={fill(d.dashboard.countPieces, { n: context.todayCount })}
            />
            <KeyValue
              label={d.coach.lossStreak}
              value={
                context.lossStreakToday
                  ? fill(d.dashboard.countPieces, { n: context.lossStreakToday })
                  : d.common.none
              }
              tone={context.lossStreakToday >= 2 ? 'loss' : 'muted'}
            />
            <KeyValue
              label={d.coach.openTrades}
              value={
                context.openCount
                  ? fill(d.dashboard.countPieces, { n: context.openCount })
                  : d.common.none
              }
              tone={context.openCount ? 'amber' : 'muted'}
            />
            <KeyValue label={d.coach.balance} value={money(account.startingBalance, 0)} mono />
          </Card>

          <Card padding="p-4">
            <CardTitle>{steps.title}</CardTitle>
            <ol className="flex flex-col gap-2.5">
              {steps.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md bg-blue-soft font-mono text-[10.5px] font-bold text-bluel">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-txt2">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-line2 pt-3 text-[11px] leading-relaxed text-txt4">
              {d.coach.offlineNote}
            </p>
          </Card>

          <Card padding="p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-px shrink-0 text-txt3">
                <Icon name="shield" size={15} />
              </span>
              <p className="text-[11.5px] leading-relaxed text-txt3">
                {d.coach.disclaimer}
              </p>
            </div>
          </Card>

          {rows.length > 0 ? <ClearChat count={rows.length} /> : null}
        </div>
      </div>
    </>
  );
}
