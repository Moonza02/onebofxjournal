'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createInvite, joinByCode, type MentorState } from '@/actions/mentor';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-blued bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? busy : label}
    </button>
  );
}

function Message({ state }: { state: MentorState }) {
  if (state.error) {
    return (
      <div className="rounded-[10px] border border-loss/35 bg-loss-soft px-3 py-2 text-[12px] leading-relaxed text-loss">
        {state.error}
      </div>
    );
  }
  if (state.ok) {
    return (
      <div className="rounded-[10px] border border-win/35 bg-win-soft px-3 py-2 text-[12px] font-semibold text-win">
        {state.ok}
      </div>
    );
  }
  return null;
}

/** Taklif yaratish — yaratuvchi o'z rolini tanlaydi, ikkinchi tomon
 *  avtomatik teskari rolda qo'shiladi.
 */
export function InviteForm() {
  const d = useD();
  const [state, action] = useActionState<MentorState, FormData>(createInvite, {});
  const [role, setRole] = useState<'MENTOR' | 'STUDENT'>('MENTOR');

  const options = [
    { key: 'MENTOR' as const, label: d.mentor.iAmMentor, hint: d.mentor.iAmMentorHint },
    { key: 'STUDENT' as const, label: d.mentor.iAmStudent, hint: d.mentor.iAmStudentHint },
  ];

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = role === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setRole(o.key)}
              className={`flex min-w-[150px] grow basis-0 cursor-pointer flex-col items-start gap-0.5 rounded-[11px] border px-3.5 py-2.5 text-left transition-colors ${
                on ? 'border-blue bg-blue-soft' : 'border-line bg-card2 hover:border-[#2A3240]'
              }`}
            >
              <span className={`text-[12.5px] font-bold ${on ? 'text-txt' : 'text-txt2'}`}>
                {o.label}
              </span>
              <span className="text-[11px] text-txt3">{o.hint}</span>
            </button>
          );
        })}
      </div>

      <input type="hidden" name="role" value={role} />
      <Submit label={d.mentor.createCode} busy={d.mentor.creating} />
      <Message state={state} />
    </form>
  );
}

/** Kod bilan qo'shilish. */
export function JoinForm() {
  const d = useD();
  const [state, action] = useActionState<MentorState, FormData>(joinByCode, {});

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-[170px] grow basis-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
            {d.mentor.codeField}
          </span>
          <input
            name="code"
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            className="tnum box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 font-mono text-[14px] uppercase tracking-[0.12em] text-txt outline-none transition-colors focus:border-blue"
          />
        </label>
        <Submit label={d.mentor.join} busy={d.mentor.checking} />
      </div>
      <Message state={state} />
    </form>
  );
}

/** Kodni nusxalash tugmasi. */
export function CopyCode({ code }: { code: string }) {
  const d = useD();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-line bg-card2 px-2.5 text-[11.5px] font-bold text-txt3 transition-colors hover:text-txt2"
    >
      <Icon name={copied ? 'check' : 'link'} size={13} />
      {copied ? d.common.copied : d.common.copy}
    </button>
  );
}
