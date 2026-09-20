import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, KeyValue } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import PlanPicker from '@/components/billing/PlanPicker';
import { requireUser } from '@/lib/session';
import { enabledProviders, getBilling, getPayments } from '@/lib/payments';
import { limits, PLAN_ORDER, PLANS, sum, TRIAL_DAYS } from '@/lib/billing';
import { longDate, shortDate } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { fill, type Dict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function providerLabels(d: Dict): Record<string, string> {
  return {
    PAYME: d.billing.providerPayme,
    CLICK: d.billing.providerClick,
    MANUAL: d.billing.providerManual,
  };
}

function statuses(d: Dict): Record<string, { label: string; tone: 'win' | 'amber' | 'loss' }> {
  return {
    PAID: { label: d.billing.statusPaid, tone: 'win' },
    PENDING: { label: d.billing.statusPending, tone: 'amber' },
    CANCELLED: { label: d.billing.statusCancelled, tone: 'loss' },
  };
}

export default async function TarifPage() {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);
  const PROVIDER_LABELS = providerLabels(d);
  const STATUS = statuses(d);
  const [billing, payments] = await Promise.all([getBilling(user), getPayments(user.id)]);

  const cap = limits(billing.plan);
  const tradeUse =
    cap.tradesPerMonth === Infinity
      ? null
      : Math.min(100, (billing.tradesThisMonth / cap.tradesPerMonth) * 100);

  return (
    <>
      <Topbar
        title={d.billing.title}
        sub={
          billing.trial
            ? fill(d.billing.subTrial, { days: billing.daysLeft ?? 0 })
            : billing.plan === 'FREE'
              ? d.billing.subFree
              : fill(d.billing.subPaid, {
                  plan: d.plans[billing.plan].name,
                  days: billing.daysLeft ?? 0,
                })
        }
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-blue-soft text-bluel">
              <Icon name="shield" size={20} />
            </span>
            <div className="min-w-0 grow">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[16px] font-semibold text-txt">
                  {d.plans[billing.plan].name}
                </span>
                {billing.trial ? <Chip tone="amber">{d.billing.trial}</Chip> : null}
                {billing.plan !== 'FREE' && !billing.trial ? (
                  <Chip tone={billing.daysLeft !== null && billing.daysLeft <= 5 ? 'amber' : 'win'}>
                    {fill(d.billing.daysLeft, { n: billing.daysLeft ?? 0 })}
                  </Chip>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12.5px] text-txt3">
                {billing.until
                  ? fill(d.billing.validUntil, { date: longDate(billing.until, locale) })
                  : d.billing.trialOver}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-line2 pt-3.5">
            <div className="min-w-[160px] grow basis-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
                  {d.billing.tradesThisMonth}
                </span>
                <span className="grow" />
                <span className="tnum font-mono text-[12px] font-bold text-txt2">
                  {billing.tradesThisMonth}
                  {tradeUse === null ? '' : ` / ${cap.tradesPerMonth}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-[4px] bg-[#151A22]">
                <div
                  className={`h-full rounded-[4px] ${
                    tradeUse === null ? 'bg-blue' : tradeUse >= 85 ? 'bg-amber' : 'bg-blue'
                  }`}
                  style={{ width: `${tradeUse ?? 100}%` }}
                />
              </div>
            </div>

            <div className="min-w-[160px] grow basis-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
                  {d.billing.accountsUsed}
                </span>
                <span className="grow" />
                <span className="tnum font-mono text-[12px] font-bold text-txt2">
                  {billing.accounts} / {cap.accounts}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-[4px] bg-[#151A22]">
                <div
                  className="h-full rounded-[4px] bg-blue"
                  style={{ width: `${Math.min(100, (billing.accounts / cap.accounts) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3.5 xl:flex-row">
          <div className="flex min-w-0 grow flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              {PLAN_ORDER.map((key) => {
                const spec = PLANS[key];
                const on = billing.plan === key;

                return (
                  <section
                    key={key}
                    className={`flex min-w-0 grow basis-0 flex-col rounded-[14px] border p-[18px] ${
                      on ? 'border-blue bg-card' : 'border-line bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] font-semibold text-txt">
                        {d.plans[key].name}
                      </span>
                      {on ? <Chip tone="blue">{d.billing.current}</Chip> : null}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-txt3">{d.plans[key].tagline}</p>

                    <div className="mt-3 flex items-end gap-1.5">
                      <span className="tnum font-mono text-[22px] font-semibold leading-none tracking-[-0.02em] text-txt">
                        {spec.monthly === 0
                          ? d.billing.free
                          : sum(spec.monthly, d.billing.currency)}
                      </span>
                      {spec.monthly > 0 ? (
                        <span className="pb-0.5 text-[11.5px] text-txt3">{d.billing.perMonth}</span>
                      ) : null}
                    </div>

                    <div className="mt-3.5 flex grow flex-col gap-2 border-t border-line2 pt-3.5">
                      {d.plans[key].highlights.map((line, i) => (
                        <div key={i} className="flex gap-2">
                          <span
                            className={`mt-px shrink-0 ${key === 'FREE' ? 'text-txt4' : 'text-blue'}`}
                          >
                            <Icon name="check" size={13} width={2.6} />
                          </span>
                          <span className="text-[12px] leading-relaxed text-txt2">{line}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {payments.length > 0 ? (
              <Card>
                <CardTitle>{d.billing.history}</CardTitle>
                <div className="flex flex-col">
                  {payments.map((p) => {
                    const status = STATUS[p.status];
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-2.5 border-b border-line2 py-2.5 last:border-b-0"
                      >
                        <span className="font-mono text-[11.5px] text-txt3">
                          {shortDate(p.createdAt, locale)}
                        </span>
                        <span className="text-[12.5px] font-semibold text-txt2">
                          {d.plans[p.plan].name} · {fill(d.billing.monthsShort, { n: p.months })}
                        </span>
                        <span className="text-[11.5px] text-txt3">
                          {PROVIDER_LABELS[p.provider] ?? p.provider}
                        </span>
                        <span className="grow" />
                        <span className="tnum font-mono text-[12.5px] font-semibold text-txt">
                          {sum(p.amount, d.billing.currency)}
                        </span>
                        <Chip tone={status.tone}>{status.label}</Chip>
                        {p.status === 'PENDING' && p.provider === 'MANUAL' ? (
                          <Link
                            href={`/tarif/tolov/${p.id}`}
                            className="text-[11.5px] font-bold text-bluel hover:underline"
                          >
                            {d.billing.openPayment}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[340px]">
            <Card>
              <CardTitle>{d.billing.openPlan}</CardTitle>
              <PlanPicker current={billing.plan} providers={enabledProviders()} />
            </Card>

            <Card>
              <CardTitle>{d.billing.questions}</CardTitle>
              <KeyValue
                label={d.billing.trialLabel}
                value={fill(d.billing.trialValue, { days: TRIAL_DAYS })}
                mono={false}
              />
              <KeyValue
                label={d.billing.autoCharge}
                value={d.billing.autoChargeValue}
                mono={false}
              />
              <KeyValue
                label={d.billing.afterExpiry}
                value={d.billing.afterExpiryValue}
                mono={false}
              />
              <p className="mt-3 text-[11.5px] leading-relaxed text-txt3">
                {d.billing.questionsNote}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
