'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, type FormState } from '@/actions/auth';
import { AuthField, AuthError, SubmitButton } from './fields';
import { useD } from '@/components/i18n/Provider';

export default function LoginForm() {
  const d = useD();
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action}>
      <h1 className="font-display text-[26px] font-semibold text-txt">{d.auth.loginTitle}</h1>
      <p className="mt-2 text-[13.5px] text-txt3">{d.auth.loginSub}</p>

      <div className="mt-7 flex flex-col gap-4">
        <AuthField label={d.auth.fieldEmail} name="email" type="email" autoComplete="email" required />
        <AuthField
          label={d.auth.fieldPassword}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <AuthError message={state.error} />

      <SubmitButton pending={pending}>{d.auth.loginSubmit}</SubmitButton>

      <p className="mt-4 text-center text-[12.5px]">
        <Link href="/parolni-tiklash" className="text-txt3 transition-colors hover:text-txt2">
          {d.reset.linkText}
        </Link>
      </p>

      <p className="mt-6 text-center text-[12.5px] text-txt3">
        {d.auth.noAccount}{' '}
        <Link href="/register" className="font-bold text-blue hover:text-bluel">
          {d.auth.goRegister}
        </Link>
      </p>
    </form>
  );
}
