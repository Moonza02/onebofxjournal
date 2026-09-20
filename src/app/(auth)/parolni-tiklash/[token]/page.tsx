import { notFound } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { NewPasswordForm } from '@/components/auth/ResetForms';
import { looksLikeToken } from '@/lib/reset';

export const dynamic = 'force-dynamic';

/** Kalit shu yerda tekshirilmaydi — faqat shakli qaraladi.
 *  Haqiqiy tekshiruv formani yuborganda bo'ladi, shunda havolani
 *  ochgan odam kalit yaroqli yoki yaroqsizligini bilib ololmaydi.
 */
export default async function ResetTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!looksLikeToken(token)) notFound();

  return (
    <AuthShell>
      <NewPasswordForm token={token} />
    </AuthShell>
  );
}
