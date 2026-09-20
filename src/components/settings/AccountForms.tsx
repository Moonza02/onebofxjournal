'use client';

import { useActionState, useState } from 'react';
import { changePassword, deleteAccount, type SettingsState } from '@/actions/settings';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';
import { DELETION_GRACE_DAYS } from '@/lib/verify';

function Field({
  label,
  name,
  type = 'password',
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={type === 'password' ? 8 : undefined}
        required
        className="tnum box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 font-mono text-[13px] text-txt outline-none transition-colors focus:border-blue"
      />
    </label>
  );
}

function Message({ state, okText }: { state: SettingsState; okText: string }) {
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
        {okText}
      </div>
    );
  }
  return null;
}

/** Parolni o'zgartirish. Hozirgi parol so'raladi. */
export function PasswordForm() {
  const d = useD();
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-txt3">{d.settings.passwordNote}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 grow basis-0">
          <Field
            label={d.settings.currentField}
            name="current"
            autoComplete="current-password"
          />
        </div>
        <div className="min-w-0 grow basis-0">
          <Field label={d.settings.newField} name="password" autoComplete="new-password" />
        </div>
        <div className="min-w-0 grow basis-0">
          <Field label={d.settings.repeatField} name="repeat" autoComplete="new-password" />
        </div>
      </div>

      <Message state={state} okText={d.settings.passwordOk} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-blued bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? d.settings.changing : d.settings.changeButton}
        </button>
      </div>
    </form>
  );
}

/** Hisobni o'chirish. Ikki qadam: avval so'raladi, keyin pochta yoziladi. */
export function DeleteForm({
  email,
  pendingDays,
}: {
  email: string;
  /** O'chirish allaqachon so'ralgan bo'lsa — necha kun qolgani. */
  pendingDays?: number;
}) {
  const d = useD();
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<SettingsState, FormData>(deleteAccount, {});

  // Allaqachon so'ralgan bo'lsa formani qayta ko'rsatishdan ma'no yo'q:
  // muddat baribir qaytadan boshlanmaydi. Bu yerda holatni aytamiz,
  // bekor qilish tugmasi esa har sahifadagi lentada turibdi.
  if (pendingDays !== undefined) {
    return (
      <div className="flex flex-col gap-2 rounded-[12px] border border-loss/30 bg-loss-soft px-4 py-3">
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-loss">
          <Icon name="clock" size={14} />
          {d.deletion.pendingTitle}
        </div>
        <p className="text-[12px] leading-relaxed text-loss/90">
          {pendingDays > 0
            ? fill(d.deletion.pendingBody, { days: pendingDays })
            : d.deletion.pendingBodyToday}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-txt3">
        {fill(d.settings.deleteNote, { days: DELETION_GRACE_DAYS })}
      </p>

      {!asking ? (
        <div>
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-loss/35 bg-loss-soft px-4 text-[12.5px] font-bold text-loss transition-colors hover:bg-loss/20"
          >
            <Icon name="trash" size={14} />
            {d.settings.deleteButton}
          </button>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
              {d.settings.deleteConfirmLabel}
            </span>
            <input
              name="email"
              type="email"
              autoComplete="off"
              placeholder={email}
              required
              className="box-border h-10 w-full max-w-[360px] rounded-[10px] border border-loss/35 bg-card2 px-3 font-mono text-[13px] text-txt outline-none transition-colors focus:border-loss"
            />
          </label>

          <Message state={state} okText="" />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-lossd bg-lossd px-4 text-[12.5px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-55"
            >
              {pending ? d.settings.deleting : d.settings.deleteConfirmButton}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="inline-flex h-[38px] cursor-pointer items-center rounded-[10px] border border-line bg-card2 px-4 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
            >
              {d.common.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
