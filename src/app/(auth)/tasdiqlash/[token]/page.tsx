import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { Icon } from '@/components/ui/icons';
import { db } from '@/lib/db';
import { getI18n } from '@/lib/i18n/server';
import { hashToken, looksLikeToken } from '@/lib/reset';
import { verificationUsable } from '@/lib/verify';

export const dynamic = 'force-dynamic';

type Outcome = 'ok' | 'already' | 'fail';

type Row = {
  id: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: { id: string; email: string; emailVerifiedAt: Date | null };
};

/** Havolani ochish — shu yerning o'zida tasdiqlanadi.
 *
 *  Pochta xizmatlari havolalarni oldindan ochib ko'radi, shuning uchun
 *  kalit foydalanuvchi bosgunicha ishlatilgan bo'lishi mumkin. Bunday
 *  holda "xato" deyish noto'g'ri bo'lardi: manzil allaqachon
 *  tasdiqlangan — shuni aytamiz.
 */
async function consume(token: string): Promise<Outcome> {
  const row: Row | null = await db.emailVerification.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { id: true, email: true, emailVerifiedAt: true } },
    },
  });

  if (!row) return 'fail';
  if (row.user.emailVerifiedAt) return 'already';
  if (!verificationUsable(row, row.user.email)) return 'fail';

  // Kalitni faqat hali ishlatilmagan bo'lsa band qilamiz — ikki
  // so'rov bir vaqtda kelsa g'olibi bitta bo'ladi.
  const ok = await db.$transaction(async (tx: typeof db) => {
    const claimed = await tx.emailVerification.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    await tx.user.update({
      where: { id: row.user.id },
      data: { emailVerifiedAt: new Date() },
    });

    // Qolgan ochiq kalitlar ham kerak emas.
    await tx.emailVerification.updateMany({
      where: { userId: row.user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    return true;
  });

  return ok ? 'ok' : 'already';
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeToken(token)) notFound();

  const outcome = await consume(token);
  const { d } = await getI18n();

  const view = {
    ok: { icon: 'check' as const, tone: 'win', title: d.verify.okTitle, body: d.verify.okBody },
    already: {
      icon: 'check' as const,
      tone: 'win',
      title: d.verify.alreadyTitle,
      body: d.verify.alreadyBody,
    },
    fail: { icon: 'x' as const, tone: 'loss', title: d.verify.failTitle, body: d.verify.failBody },
  }[outcome];

  return (
    <AuthShell>
      <div className="flex flex-col items-start">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${
            view.tone === 'win' ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss'
          }`}
        >
          <Icon name={view.icon} size={20} width={2.8} />
        </span>

        <h1 className="mt-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-txt">
          {view.title}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt2">{view.body}</p>

        <Link
          href="/panel"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-[11px] border border-blued bg-blued px-5 text-[14px] font-bold text-white transition-colors hover:bg-blueh focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          {outcome === 'fail' ? d.verify.failCta : d.verify.okCta}
          <Icon name="chev" size={15} width={2.4} />
        </Link>
      </div>
    </AuthShell>
  );
}
