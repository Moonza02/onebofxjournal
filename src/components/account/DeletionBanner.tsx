'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';
import type { SettingsState } from '@/actions/settings';

/** Hisob o'chirilish arafasida turganda ko'rinadigan lenta.
 *
 *  Eng muhimi — bekor qilish tugmasi shu yerda, har sahifada.
 *  Fikridan qaytgan odam uni qidirib yurmasligi kerak.
 */
export default function DeletionBanner({
  days,
  action,
}: {
  /** Serverda hisoblanadi: brauzer soati bilan farq qilib, gidratsiya
   *  paytida raqam sakrab ketmasligi uchun. */
  days: number;
  action: () => Promise<SettingsState>;
}) {
  const d = useD();
  const [state, formAction] = useActionState<SettingsState, FormData>(async () => action(), {});

  if (state.ok) {
    return (
      <div className="flex items-center gap-2 border-b border-win/30 bg-win-soft px-5 py-2.5 text-[12px] font-bold text-win sm:px-[26px]">
        <Icon name="check" size={14} width={2.8} />
        {d.deletion.cancelled}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-loss/30 bg-loss-soft px-5 py-2.5 sm:px-[26px]">
      <span className="flex items-center gap-2 text-[12px] font-bold text-loss">
        <Icon name="trash" size={14} />
        {d.deletion.pendingTitle}
      </span>

      <span className="min-w-0 text-[12px] leading-relaxed text-loss/90">
        {days > 0 ? fill(d.deletion.pendingBody, { days }) : d.deletion.pendingBodyToday}
      </span>

      <form action={formAction} className="ml-auto shrink-0">
        <Cancel label={d.deletion.cancel} pendingLabel={d.deletion.cancelling} />
      </form>
    </div>
  );
}

function Cancel({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[8px] border border-loss/40 px-2.5 py-1 text-[11.5px] font-bold text-loss transition-colors hover:bg-loss/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-loss disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
