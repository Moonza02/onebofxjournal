'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { startCheckout, type CheckoutState } from '@/actions/billing';
import { Icon } from '@/components/ui/icons';
import { PERIODS, PLANS, priceFor, savingFor, sum, type Plan } from '@/lib/billing';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';

const PROVIDERS = [
  { key: 'PAYME', label: 'providerPayme' },
  { key: 'CLICK', label: 'providerClick' },
  { key: 'UZUM', label: 'providerUzum' },
  { key: 'MANUAL', label: 'providerManual' },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]['key'];

function Pay({ label }: { label: string }) {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-blued bg-blued px-4 text-[13px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? d.billing.opening : label}
    </button>
  );
}

/** Tarif, muddat va to'lov usulini tanlash.
 *  Narx bu yerda faqat ko'rsatiladi — to'lanadigan summani server
 *  qayta hisoblaydi.
 */
export default function PlanPicker({
  current,
  providers,
}: {
  current: Plan;
  /** Qaysi to'lov usullari ulangan — serverdan keladi. */
  providers: ProviderKey[];
}) {
  const d = useD();
  const [state, action] = useActionState<CheckoutState, FormData>(startCheckout, {});
  const [plan, setPlan] = useState<Plan>(current === 'MENTOR' ? 'MENTOR' : 'PRO');
  const [months, setMonths] = useState(1);
  const shown = PROVIDERS.filter((p) => providers.includes(p.key));
  const [provider, setProvider] = useState<ProviderKey>(shown[0]?.key ?? 'MANUAL');

  const price = priceFor(plan, months);
  const saved = savingFor(plan, months);
  const perMonth = Math.round(price / months);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-txt3">
          {d.billing.planLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['PRO', 'MENTOR'] as Plan[]).map((key) => {
            const on = plan === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={`flex min-w-[140px] grow basis-0 cursor-pointer flex-col items-start gap-0.5 rounded-[11px] border px-3.5 py-2.5 text-left transition-colors ${
                  on ? 'border-blue bg-blue-soft' : 'border-line bg-card2 hover:border-[#2A3240]'
                }`}
              >
                <span className={`text-[13px] font-bold ${on ? 'text-txt' : 'text-txt2'}`}>
                  {d.plans[key].name}
                </span>
                <span className="font-mono text-[11px] text-txt3">
                  {sum(PLANS[key].monthly, d.billing.currency)} {d.billing.perMonth}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-txt3">
          {d.billing.periodLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => {
            const on = months === period.months;
            return (
              <button
                key={period.months}
                type="button"
                onClick={() => setMonths(period.months)}
                className={`relative flex min-w-[86px] grow basis-0 cursor-pointer flex-col items-center gap-0.5 rounded-[11px] border px-3 py-2.5 transition-colors ${
                  on ? 'border-blue bg-blue-soft' : 'border-line bg-card2 hover:border-[#2A3240]'
                }`}
              >
                <span className={`text-[12.5px] font-bold ${on ? 'text-txt' : 'text-txt2'}`}>
                  {fill(d.billing.monthsShort, { n: period.months })}
                </span>
                <span
                  className={`text-[10.5px] font-semibold ${
                    period.discountPct > 0 ? 'text-win' : 'text-txt4'
                  }`}
                >
                  {period.discountPct > 0 ? `−${period.discountPct}%` : d.billing.noDiscount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-txt3">
          {d.billing.providerLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          {shown.map((p) => {
            const on = provider === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setProvider(p.key)}
                className={`flex min-w-[108px] grow basis-0 cursor-pointer items-center justify-center rounded-[11px] border px-3 py-2.5 text-[12.5px] font-bold transition-colors ${
                  on ? 'border-blue bg-blue-soft text-txt' : 'border-line bg-card2 text-txt2'
                }`}
              >
                {d.billing[p.label]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[13px] border border-line bg-card2 p-4">
        <div className="flex items-end gap-2">
          <span className="tnum font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-txt">
            {sum(price, d.billing.currency)}
          </span>
          <span className="pb-1 text-[12px] text-txt3">
            {months > 1
              ? `· ${sum(perMonth, d.billing.currency)} ${d.billing.perMonth}`
              : d.billing.perMonth}
          </span>
        </div>
        {saved > 0 ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-[7px] bg-win-soft px-2 py-[3px] text-[11.5px] font-bold text-win">
            <Icon name="check" size={11} width={2.6} />
            {fill(d.billing.saved, { amount: sum(saved, d.billing.currency) })}
          </div>
        ) : null}
      </div>

      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="months" value={months} />
      <input type="hidden" name="provider" value={provider} />

      <Pay label={provider === 'MANUAL' ? d.billing.goManual : d.billing.goPay} />

      {state.error ? (
        <div className="rounded-[10px] border border-loss/35 bg-loss-soft px-3 py-2 text-[12px] leading-relaxed text-loss">
          {state.error}
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-txt4">
        {d.billing.checkoutNote}
      </p>
    </form>
  );
}
