import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import CodeForm from '@/components/auth/CodeForm';
import { Icon } from '@/components/ui/icons';
import { confirmCode, resendPending } from '@/actions/verify';
import { db } from '@/lib/db';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { getPending } from '@/lib/pending';
import { getUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Pochtaga kelgan kodni kiritish sahifasi.
 *
 *  Ikki yo'ldan kelinadi: endigina ro'yxatdan o'tilgan, yoki
 *  tasdiqlanmagan hisob bilan kirishga urinilgan. Ikkalasida ham
 *  odam ichkarida emas, shuning uchun sahifa kirish qobig'ida
 *  turadi.
 */
export default async function VerifyPendingPage() {
  // Allaqachon kirgan odamning bu yerda ishi yo'q.
  if (await getUser()) redirect('/panel');

  const { d } = await getI18n();
  const id = await getPending();

  // Belgi yo'q — ya'ni bu sahifaga tasodifan kelingan yoki yarim
  // soatdan ko'p vaqt o'tgan. Bunday holda kirish sahifasiga
  // qaytarish eng to'g'ri yo'l: u yerdan hammasi boshlanadi.
  if (!id) {
    return (
      <AuthShell>
        <div className="flex flex-col items-start">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-loss-soft text-loss">
            <Icon name="x" size={20} width={2.8} />
          </span>

          <h1 className="mt-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-txt">
            {d.verify.failTitle}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-txt2">{d.verify.errExpired}</p>

          <Link
            href="/login"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[11px] border border-blued bg-blued px-5 text-[14px] font-bold text-white transition-colors hover:bg-blueh focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {d.verify.loginCta}
            <Icon name="chev" size={15} width={2.4} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  const row: { email: string } | null = await db.user.findUnique({
    where: { id },
    select: { email: true },
  });

  return (
    <AuthShell>
      <div className="flex w-full flex-col items-start">
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-blue-soft text-bluel">
          <Icon name="mail" size={20} width={2.8} />
        </span>

        <h1 className="mt-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-txt">
          {d.verify.sentTitle}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt2">
          {row?.email ? fill(d.verify.sentBody, { email: row.email }) : d.verify.sentBodyNoEmail}
        </p>

        <CodeForm confirm={confirmCode} resend={resendPending} />

        <p className="mt-6 text-center text-[12.5px] text-txt3">
          <Link href="/login" className="transition-colors hover:text-txt2">
            {d.verify.loginCta}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
