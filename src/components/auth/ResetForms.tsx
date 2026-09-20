'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { applyReset, requestReset, type ResetState } from '@/actions/reset';
import { AuthField, AuthError, SubmitButton } from './fields';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';

/** Havola so'rash. Javob hisob bor-yo'qligini oshkor qilmaydi —
 *  shuning uchun muvaffaqiyat xabari har doim bir xil.
 */
export function RequestForm() {
  const d = useD();
  const [state, action, pending] = useActionState<ResetState, FormData>(requestReset, {});

  if (state.sent) {
    return (
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-win-soft text-win">
          <Icon name="check" size={22} width={2.6} />
        </span>

        <h1 className="mt-5 font-display text-[26px] font-semibold text-txt">{d.reset.title}</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-txt2">{d.reset.sent}</p>

        <Link
          href="/login"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl border border-line bg-card2 text-sm font-bold text-txt2 transition-colors hover:text-txt"
        >
          {d.reset.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={action}>
      <h1 className="font-display text-[26px] font-semibold text-txt">{d.reset.title}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-txt3">{d.reset.sub}</p>

      <div className="mt-7">
        <AuthField
          label={d.reset.emailField}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <AuthError message={state.error} />

      <SubmitButton pending={pending}>{d.reset.send}</SubmitButton>

      <p className="mt-6 text-center text-[12.5px] text-txt3">
        <Link href="/login" className="font-bold text-blue hover:text-bluel">
          {d.reset.backToLogin}
        </Link>
      </p>
    </form>
  );
}

/** Yangi parol qo'yish. Kalit yashirin maydonda keladi. */
export function NewPasswordForm({ token }: { token: string }) {
  const d = useD();
  const [state, action, pending] = useActionState<ResetState, FormData>(applyReset, {});

  if (state.sent) {
    return (
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-win-soft text-win">
          <Icon name="check" size={22} width={2.6} />
        </span>

        <h1 className="mt-5 font-display text-[26px] font-semibold text-txt">{d.reset.okTitle}</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-txt2">{d.reset.okBody}</p>

        <Link
          href="/panel"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-blued text-sm font-bold text-white transition-colors hover:bg-blueh"
        >
          {d.nav.dashboard}
        </Link>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />

      <h1 className="font-display text-[26px] font-semibold text-txt">{d.reset.newTitle}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-txt3">{d.reset.newSub}</p>

      <div className="mt-7 flex flex-col gap-4">
        <AuthField
          label={d.reset.passwordField}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthField
          label={d.reset.repeatField}
          name="repeat"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <AuthError message={state.error} />

      <SubmitButton pending={pending}>{d.reset.save}</SubmitButton>
    </form>
  );
}
