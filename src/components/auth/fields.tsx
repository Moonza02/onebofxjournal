'use client';

import { useD } from '@/components/i18n/Provider';

export function AuthField({
  label,
  hint,
  mono = true,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[11.5px] font-bold tracking-[0.06em] text-txt3">{label}</span>
      <input
        className={`box-border h-12 w-full rounded-xl border border-line bg-card2 px-[15px] text-sm text-txt outline-none transition-colors focus:border-blue ${
          mono ? 'font-mono' : ''
        }`}
        {...rest}
      />
      {hint ? <span className="text-[11px] text-txt4">{hint}</span> : null}
    </label>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-4 rounded-[10px] bg-loss-soft px-3.5 py-3 text-[12.5px] font-semibold text-loss"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  const d = useD();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-blued text-sm font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? d.common.working : children}
    </button>
  );
}
