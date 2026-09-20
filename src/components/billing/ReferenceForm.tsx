'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitReference, type CheckoutState } from '@/actions/billing';
import { useD } from '@/components/i18n/Provider';

function Submit() {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[38px] shrink-0 cursor-pointer items-center rounded-[10px] border border-blued bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:opacity-55"
    >
      {pending ? d.billing.sending : d.billing.send}
    </button>
  );
}

/** O'tkazma qilingach chek raqami — tasdiqni xodim beradi. */
export default function ReferenceForm({ id, current }: { id: string; current: string }) {
  const d = useD();
  const [state, action] = useActionState<CheckoutState, FormData>(submitReference, {});

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-[180px] grow basis-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
            {d.billing.referenceField}
          </span>
          <input
            name="reference"
            defaultValue={current}
            autoComplete="off"
            placeholder={d.billing.referencePlaceholder}
            className="box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 text-[13px] text-txt outline-none transition-colors focus:border-blue"
          />
        </label>
        <Submit />
      </div>

      {state.error ? (
        <div className="rounded-[10px] border border-loss/35 bg-loss-soft px-3 py-2 text-[12px] text-loss">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-[10px] border border-win/35 bg-win-soft px-3 py-2 text-[12px] font-semibold text-win">
          {state.ok}
        </div>
      ) : null}
    </form>
  );
}
