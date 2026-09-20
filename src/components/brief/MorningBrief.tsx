import { Card, Chip } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import EconomicSection from './EconomicSection';
import { dismissBrief } from '@/actions/brief';
import { money, pct, signedMoney } from '@/lib/format';
import type { BriefStatus } from '@/lib/brief';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export default async function MorningBrief({
  status,
  todayLine,
  reminder,
  lastLesson,
}: {
  status: BriefStatus;
  todayLine: string;
  reminder: string | null;
  lastLesson: string | null;
}) {
  const d = await getDict();

  return (
    <Card padding="p-5" className="border-blue/25">
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-blue-soft text-blue">
          <Icon name="target" size={18} />
        </span>
        <div className="min-w-0 grow">
          <h2 className="font-display text-[17px] font-semibold text-txt">{d.brief.title}</h2>
          <p className="text-[11.5px] text-txt3">{d.brief.sub}</p>
        </div>
        <form action={dismissBrief}>
          <button
            type="submit"
            aria-label={d.brief.close}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-txt3 transition-colors hover:text-txt"
          >
            <Icon name="x" size={16} />
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <span className="mt-px shrink-0 text-txt3">
            <Icon name="clock" size={15} />
          </span>
          <p className="text-[12.5px] leading-relaxed text-txt2">
            <b className="text-txt">{d.brief.yesterday}</b>{' '}
            {status.yesterdayTrades === 0 ? (
              d.brief.noTrades
            ) : (
              <>
                {fill(d.brief.tradesCount, { n: status.yesterdayTrades })}{' '}
                <b className={status.yesterdayPnl >= 0 ? 'text-win' : 'text-loss'}>
                  {signedMoney(status.yesterdayPnl)}
                </b>
                . {status.yesterdayCompliant ? d.brief.rulesOk : d.brief.rulesBroken}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <span className="mt-px shrink-0 text-txt3">
            <Icon name="shield" size={15} />
          </span>
          <p className="text-[12.5px] leading-relaxed text-txt2">
            <b className="text-txt">{d.brief.today}</b> {todayLine}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip
            tone={
              status.drawdownUsedPct >= 80
                ? 'loss'
                : status.drawdownUsedPct >= 50
                  ? 'amber'
                  : 'neutral'
            }
          >
            {fill(d.brief.drawdown, { pct: pct(status.drawdownUsedPct, 0) })}
          </Chip>
          <Chip tone={status.targetProgressPct >= 100 ? 'win' : 'neutral'}>
            {fill(d.brief.goal, { pct: pct(Math.max(0, status.targetProgressPct), 0) })}
          </Chip>
          <Chip tone="neutral">
            {fill(d.brief.dailyLimit, { amount: money(status.dailyLimit, 0) })}
          </Chip>
          {status.openCount > 0 ? (
            <Chip tone="amber">{fill(d.brief.openPositions, { n: status.openCount })}</Chip>
          ) : null}
        </div>

        {reminder ? (
          <div className="flex gap-3">
            <span className="mt-px shrink-0 text-blue">
              <Icon name="chart" size={15} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-txt2">
              <b className="text-txt">{d.brief.fromStats}</b> {reminder}
            </p>
          </div>
        ) : null}

        {lastLesson ? (
          <div className="flex gap-3">
            <span className="mt-px shrink-0 text-amber">
              <Icon name="flame" size={15} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-txt2">
              <b className="text-txt">{d.brief.lastLesson}</b> {lastLesson}
            </p>
          </div>
        ) : null}

        <EconomicSection />
      </div>
    </Card>
  );
}
