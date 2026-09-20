import Link from 'next/link';
import { getDict } from '@/lib/i18n/server';

export default async function NotFound() {
  const d = await getDict();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[420px] rounded-[14px] border border-line bg-card p-6 text-center">
        <div className="font-mono text-[42px] font-semibold text-txt3">404</div>
        <h1 className="mt-2 font-display text-lg font-semibold text-txt">
          {d.errors.notFoundTitle}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-txt2">{d.errors.notFoundBody}</p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh"
        >
          {d.errors.toDashboard}
        </Link>
      </div>
    </div>
  );
}
