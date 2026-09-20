'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { register, type FormState } from '@/actions/auth';
import { AuthField, AuthError, SubmitButton } from './fields';
import { useD } from '@/components/i18n/Provider';

export default function RegisterForm() {
  const d = useD();
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});

  return (
    <form action={action}>
      <h1 className="font-display text-[26px] font-semibold text-txt">{d.auth.registerTitle}</h1>
      <p className="mt-2 text-[13.5px] text-txt3">{d.auth.registerSub}</p>

      <div className="mt-7 flex flex-col gap-4">
        <AuthField label={d.auth.fieldName} name="name" type="text" autoComplete="name" required mono={false} />
        <AuthField label={d.auth.fieldEmail} name="email" type="email" autoComplete="email" required />
        <AuthField
          label={d.auth.fieldPassword}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={d.auth.passwordHint}
        />
      </div>

      <AuthError message={state.error} />

      <SubmitButton pending={pending}>{d.auth.registerSubmit}</SubmitButton>

      <p className="mt-6 text-center text-[12.5px] text-txt3">
        {d.auth.haveAccount}{' '}
        <Link href="/login" className="font-bold text-blue hover:text-bluel">
          {d.auth.goLogin}
        </Link>
      </p>
    </form>
  );
}
