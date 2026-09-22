'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import { CODE_LENGTH } from '@/lib/verify';
import type { VerifyState } from '@/actions/verify';

/** Pochtaga kelgan kodni kiritish.
 *
 *  Ikkita alohida shakl: kodni tekshirish va xatni qayta yuborish.
 *  Ular bir-biriga xalaqit bermasligi kerak — qayta yuborish
 *  bosilganda kiritilgan kod yo'qolib ketmaydi.
 */
export default function CodeForm({
  confirm,
  resend,
}: {
  confirm: (prev: VerifyState, formData: FormData) => Promise<VerifyState>;
  resend: (prev: VerifyState, formData: FormData) => Promise<VerifyState>;
}) {
  const d = useD();
  const [state, confirmAction] = useActionState<VerifyState, FormData>(confirm, {});
  const [sent, resendAction] = useActionState<VerifyState, FormData>(resend, {});

  return (
    <div className="mt-6 w-full">
      <form action={confirmAction}>
        <label
          htmlFor="code"
          className="block text-[12px] font-bold uppercase tracking-[0.06em] text-txt3"
        >
          {d.verify.codeLabel}
        </label>

        <input
          id="code"
          name="code"
          type="text"
          // Telefonda raqamli klaviatura ochilsin, va kod SMS/pochtadan
          // avtomatik taklif qilinsin.
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          required
          autoFocus
          placeholder={'0'.repeat(CODE_LENGTH)}
          className="tnum mt-2 h-14 w-full rounded-[12px] border border-line bg-card2 text-center font-mono text-[26px] font-bold tracking-[0.35em] text-txt placeholder:text-txt4/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        />

        {state.error ? (
          <p className="mt-2.5 text-[13px] leading-relaxed text-loss">{state.error}</p>
        ) : null}

        {state.already ? (
          <p className="mt-2.5 flex items-center gap-2 text-[13px] font-bold text-win">
            <Icon name="check" size={14} width={2.8} />
            {d.verify.alreadyBody}
          </p>
        ) : null}

        <Confirm label={d.verify.codeSubmit} pendingLabel={d.verify.codeChecking} />
      </form>

      <div className="mt-5 border-t border-line2 pt-4">
        {sent.sent ? (
          <p className="flex items-center gap-2 text-[12.5px] font-bold text-win">
            <Icon name="check" size={14} width={2.8} />
            {d.verify.bannerSent}
          </p>
        ) : (
          <form action={resendAction} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[12.5px] text-txt3">{d.verify.noCode}</span>
            <Resend label={d.verify.bannerCta} sending={d.verify.bannerSending} />
          </form>
        )}

        {sent.error ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-loss">{sent.error}</p>
        ) : null}
      </div>
    </div>
  );
}

function Confirm({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blued bg-blued px-6 text-[14px] font-bold text-white transition-colors hover:bg-blueh focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
      {pending ? null : <Icon name="chev" size={15} width={2.4} />}
    </button>
  );
}

function Resend({ label, sending }: { label: string; sending: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[12.5px] font-bold text-blue transition-colors hover:text-bluel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60"
    >
      {pending ? sending : label}
    </button>
  );
}
