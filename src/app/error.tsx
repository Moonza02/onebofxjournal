'use client';

import { useEffect } from 'react';
import { useCookieLocale } from '@/components/i18n/useCookieLocale';
import { reportClientError } from '@/actions/report-error';

/** Kutilmagan xato. Foydalanuvchi oq ekran ko'rmasligi kerak. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const d = useCookieLocale();

  useEffect(() => {
    // Serverdagi jurnal bilan bog'lash uchun digest konsolga chiqadi.
    console.error('ONEBO FX xatosi:', error.digest ?? error.message);
    // Va serverga ham xabar beriladi — aks holda mijozdagi xato
    // hech qayerda qayd etilmay qolardi.
    void reportClientError(error.digest ?? '', error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[440px] rounded-[14px] border border-line bg-card p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-loss-soft text-loss">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>

        <h1 className="mt-4 font-display text-lg font-semibold text-txt">{d.errors.title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-txt2">{d.errors.body}</p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-txt3">
            {d.errors.code}: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="flex h-10 cursor-pointer items-center rounded-[10px] bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh"
          >
            {d.errors.retry}
          </button>
          {/* Ataylab oddiy <a>: xato chegarasida `next/link` buzilgan
              daraxt ichida qoladi, to'liq qayta yuklash esa undan chiqaradi. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="flex h-10 items-center rounded-[10px] border border-line bg-card2 px-4 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {d.errors.toDashboard}
          </a>
        </div>
      </div>
    </div>
  );
}
