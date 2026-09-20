import Link from 'next/link';
import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import { Btn, BtnLink, Card, CardTitle, Chip, KeyValue, Meter, RuleRow, SectionLabel } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { DirChip } from '@/components/trades/TradesTable';
import { deleteTrade } from '@/actions/trades';
import { getTradeDetail } from '@/lib/account';
import { requireUser } from '@/lib/session';
import { specFor } from '@/lib/instruments';
import { clock, duration, longDate, money, num, pct, rText, signedMoney } from '@/lib/format';
import { holdMs, isClosed, netPnl, plannedRR, rMultiple, riskAmount, stopPips } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { sessionLabel } from '@/lib/i18n/labels';

export const dynamic = 'force-dynamic';

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  const trade = await getTradeDetail(id, user.id);
  if (!trade) notFound();

  const spec = specFor(trade.symbol);
  const closed = isClosed(trade);
  const pnl = netPnl(trade);
  const r = rMultiple(trade);
  const risk = riskAmount(trade);
  const rr = plannedRR(trade);
  const passed = trade.checks.filter((c) => c.passed).length;

  const ratings = [
    { label: d.tradeDetail.discipline, value: trade.discipline, tone: 'win' as const },
    { label: d.tradeDetail.patience, value: trade.patience, tone: 'amber' as const },
    { label: d.tradeDetail.confidence, value: trade.confidence, tone: 'blue' as const },
    { label: d.tradeDetail.stress, value: trade.stress, tone: 'loss' as const },
  ].filter((x) => x.value !== null);

  return (
    <>
      <Topbar
        title={d.tradeDetail.title}
        sub={fill(d.tradeDetail.sub, { symbol: trade.symbol })}
        cta={null}
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trades"
            aria-label={d.tradeDetail.back}
            className="flex h-[34px] w-[34px] shrink-0 rotate-180 items-center justify-center rounded-[9px] border border-line bg-card text-txt2 transition-colors hover:text-txt"
          >
            <Icon name="chev" size={16} />
          </Link>
          <span className="font-display text-[22px] font-bold text-txt">{trade.symbol}</span>
          <DirChip direction={trade.direction} />
          {trade.timeframe ? <Chip tone="neutral">{trade.timeframe}</Chip> : null}
          <span className="text-[12.5px] text-txt3">
            {longDate(trade.openedAt, locale)} · {clock(trade.openedAt)}
            {trade.closedAt ? ` → ${clock(trade.closedAt)}` : ''}
            {trade.session ? ` · ${sessionLabel(trade.session, d)}` : ''}
          </span>
          <span className="grow" />
          <BtnLink href={`/trades/${trade.id}/edit`} icon="pen">
            {d.common.edit}
          </BtnLink>
          <form action={deleteTrade}>
            <input type="hidden" name="id" value={trade.id} />
            <Btn type="submit" kind="danger" icon="trash">
              {d.common.delete}
            </Btn>
          </form>
        </div>

        <Card padding="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <SectionLabel>{d.tradeDetail.result}</SectionLabel>
              <div
                className={`tnum mt-[7px] font-mono text-[28px] font-semibold ${
                  closed ? (pnl >= 0 ? 'text-win' : 'text-loss') : 'text-amber'
                }`}
              >
                {closed ? signedMoney(pnl) : d.tradeDetail.open}
              </div>
            </div>
            <span className="h-[46px] w-px bg-line" />
            <div>
              <SectionLabel>{d.tradeDetail.rMultiple}</SectionLabel>
              <div
                className={`tnum mt-[7px] font-mono text-[28px] font-semibold ${
                  closed ? (r >= 0 ? 'text-win' : 'text-loss') : 'text-txt3'
                }`}
              >
                {closed ? rText(r) : '—'}
              </div>
            </div>
            <span className="h-[46px] w-px bg-line" />
            <div>
              <SectionLabel>{d.tradeDetail.risk}</SectionLabel>
              <div className="tnum mt-[7px] font-mono text-[28px] font-semibold text-txt">
                {money(risk)}
              </div>
            </div>
            <span className="grow" />
            <div className="flex flex-wrap gap-2">
              <Chip tone={trade.ruleCompliant ? 'win' : 'amber'} icon={trade.ruleCompliant ? 'check' : 'x'}>
                {trade.ruleCompliant ? d.tradeDetail.byPlan : d.tradeDetail.offPlan}
              </Chip>
              {trade.setup ? <Chip tone="blue">{trade.setup.name}</Chip> : null}
              {trade.tags.map((tag) => (
                <Chip key={tag} tone="blue">
                  #{tag}
                </Chip>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
          <div className="flex min-w-0 grow flex-col gap-3.5">
            <Card>
              <CardTitle>{d.tradeDetail.prices}</CardTitle>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <KeyValue
                    label={d.tradeDetail.entryPrice}
                    value={num(trade.entryPrice, spec.priceDecimals)}
                  />
                  <KeyValue
                    label={d.tradeDetail.stopLoss}
                    value={num(trade.stopPrice, spec.priceDecimals)}
                    tone="loss"
                  />
                  <KeyValue
                    label={d.tradeDetail.takeProfit}
                    value={trade.takeProfit === null ? '—' : num(trade.takeProfit, spec.priceDecimals)}
                    tone="win"
                  />
                  <KeyValue
                    label={d.tradeDetail.exitPrice}
                    value={trade.exitPrice === null ? '—' : num(trade.exitPrice, spec.priceDecimals)}
                  />
                  <KeyValue label={d.tradeDetail.volume} value={`${num(trade.volume, 2)} ${d.units.lot}`} />
                </div>
                <div>
                  <KeyValue
                    label={d.tradeDetail.stopDistance}
                    value={fill(d.risk.pipsValue, { n: num(stopPips(trade), 1) })}
                  />
                  <KeyValue
                    label={d.tradeDetail.plannedRR}
                    value={rr === null ? '—' : `1 : ${num(rr, 2)}`}
                    tone="win"
                  />
                  <KeyValue
                    label={d.tradeDetail.riskOfAccount}
                    value={pct((risk / trade.account.startingBalance) * 100, 2)}
                    tone={
                      (risk / trade.account.startingBalance) * 100 > trade.account.riskPerTradePct
                        ? 'loss'
                        : 'amber'
                    }
                  />
                  <KeyValue
                    label={d.tradeDetail.fees}
                    value={`−${money(trade.commission + trade.swap)}`}
                    tone="muted"
                  />
                  <KeyValue
                    label={d.tradeDetail.holdTime}
                    value={closed ? duration(holdMs(trade), d.units) : '—'}
                  />
                </div>
              </div>
              {trade.pnlOverride !== null ? (
                <p className="mt-3.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
                  {fill(d.tradeDetail.overrideNote, { amount: signedMoney(trade.pnlOverride) })}
                </p>
              ) : null}
            </Card>

            {trade.screenshotKey ? (
              <Card>
                <CardTitle
                  right={
                    <Chip tone="neutral" icon="img">
                      {d.tradeDetail.screenshot}
                    </Chip>
                  }
                >
                  {d.tradeDetail.chart}
                </CardTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/screenshot/${trade.screenshotKey}`}
                  alt={fill(d.tradeDetail.screenshotAlt, { symbol: trade.symbol })}
                  className="block w-full rounded-xl border border-line"
                />
              </Card>
            ) : null}

            {trade.notes ? (
              <Card>
                <CardTitle>{d.tradeDetail.review}</CardTitle>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-txt2">
                  {trade.notes}
                </p>
              </Card>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[340px]">
            {trade.checks.length > 0 ? (
              <Card>
                <CardTitle
                  right={
                    <Chip tone={passed === trade.checks.length ? 'win' : 'amber'}>
                      {passed}/{trade.checks.length}
                    </Chip>
                  }
                >
                  {d.tradeDetail.planRules}
                </CardTitle>
                {trade.checks.map((c) => (
                  <RuleRow key={c.id} label={c.label} passed={c.passed} />
                ))}
              </Card>
            ) : null}

            {ratings.length > 0 ? (
              <Card>
                <CardTitle>{d.tradeDetail.psychology}</CardTitle>
                <div className="flex flex-col gap-2.5">
                  {ratings.map((x) => (
                    <Meter key={x.label} label={x.label} value={x.value!} tone={x.tone} />
                  ))}
                </div>
              </Card>
            ) : null}

            <Card padding="p-4">
              <CardTitle>{d.tradeDetail.account}</CardTitle>
              <KeyValue label={d.tradeDetail.account} value={trade.account.name} mono={false} />
              <KeyValue
                label={d.tradeDetail.source}
                value={
                  trade.source === 'MANUAL'
                    ? d.tradeDetail.sourceManual
                    : trade.source === 'SCREENSHOT'
                      ? d.tradeDetail.sourceScreenshot
                      : trade.source
                }
                mono={false}
              />
              <KeyValue
                label={d.tradeDetail.pipValue}
                value={fill(d.tradeDetail.perLot, { amount: money(trade.pipValuePerLot) })}
              />
              <KeyValue label={d.tradeDetail.pipSize} value={num(trade.pipSize, 5)} />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
