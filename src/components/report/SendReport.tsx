'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { emailWeeklyReport, type ReportState } from '@/actions/report';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';

function Submit({ label }: { label: string }) {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-[9px] border border-blued bg-blued px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Icon name="mail" size={15} />
      {pending ? d.report.sending : label}
    </button>
  );
}

export default function SendReport({
  week,
  defaultEmail,
  configured,
}: {
  week: number;
  defaultEmail: string;
  configured: boolean;
}) {
  const d = useD();
  const [state, action] = useActionState<ReportState, FormData>(emailWeeklyReport, {});

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="week" value={week} />

      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-[200px] grow basis-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
            {d.report.emailField}
          </span>
          <input
            name="to"
            type="email"
            defaultValue={defaultEmail}
            placeholder={defaultEmail}
            className="box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 text-[13px] text-txt outline-none transition-colors focus:border-blue"
          />
        </label>
        <Submit label={d.report.sendButton} />
      </div>

      {!configured ? (
        <p className="text-[11.5px] leading-relaxed text-txt4">
          {d.report.smtpOff}
        </p>
      ) : null}

      {state.error ? (
        <div className="rounded-[10px] border border-loss/35 bg-loss-soft px-3 py-2 text-[12px] leading-relaxed text-loss">
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
