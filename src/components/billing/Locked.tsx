import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { firstPlanWith, PLANS, sum, type Feature } from '@/lib/billing';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

/** Tarifga kirmagan bo'lim.
 *
 *  Ataylab "sotuv devori" emas: nima yopiqligi, nega foydali ekani va
 *  qancha turishi bir joyda yoziladi. Ma'lumot yo'qolmagani ham
 *  aytiladi — odam qo'rqib qolmasin.
 */
export default async function Locked({
  feature,
  what,
  why,
}: {
  feature: Feature;
  /** Bo'lim nimani beradi — bir-ikki jumla. */
  what: string;
  /** Nega kerak — bitta aniq foyda. */
  why?: string;
}) {
  const d = await getDict();
  const plan = firstPlanWith(feature);
  const spec = PLANS[plan];

  return (
    <div className="flex grow items-center justify-center p-5 sm:p-[22px]">
      <div className="flex w-full max-w-[560px] flex-col items-center gap-4 rounded-[16px] border border-line bg-card px-6 py-9 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-blue-soft text-bluel">
          <Icon name="lock" size={22} />
        </span>

        <div>
          <h2 className="font-display text-[17px] font-semibold text-txt">
            {d.features[feature]}
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] leading-relaxed text-txt2">
            {what}
          </p>
          {why ? (
            <p className="mx-auto mt-2 max-w-[420px] text-[12px] leading-relaxed text-txt3">
              {why}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-[11px] border border-line2 bg-card2 px-3.5 py-2.5">
          <span className="text-[12.5px] font-bold text-txt">{d.plans[plan].name}</span>
          <span className="h-3.5 w-px bg-line2" />
          <span className="tnum font-mono text-[12.5px] font-semibold text-txt2">
            {sum(spec.monthly, d.billing.currency)} {d.billing.perMonth}
          </span>
        </div>

        <Link
          href="/tarif"
          className="inline-flex h-[40px] items-center gap-2 rounded-[11px] bg-blued px-5 text-[13px] font-bold text-white transition-colors hover:bg-blueh"
        >
          {d.billing.lockedCta}
          <Icon name="chev" size={15} width={2.4} />
        </Link>

        <p className="text-[11px] leading-relaxed text-txt4">
          {d.billing.lockedFooter}
        </p>
      </div>
    </div>
  );
}

/** Sahifa ichidagi kichik qulf — butun sahifa emas, bitta blok yopilganda. */
export async function LockedNote({ feature }: { feature: Feature }) {
  const d = await getDict();
  const plan = firstPlanWith(feature);

  return (
    <div className="flex items-center gap-2.5 rounded-[11px] border border-line2 bg-card2 px-3.5 py-2.5">
      <span className="shrink-0 text-txt3">
        <Icon name="lock" size={14} />
      </span>
      <span className="grow text-[12px] text-txt3">
        {d.features[feature]} — {fill(d.billing.lockedPlan, { plan: d.plans[plan].name })}.
      </span>
      <Link href="/tarif" className="shrink-0 text-[12px] font-bold text-bluel hover:underline">
        {d.billing.lockedOpen}
      </Link>
    </div>
  );
}
