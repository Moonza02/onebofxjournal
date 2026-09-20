import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';
import { Icon } from '@/components/ui/icons';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { DELETION_GRACE_DAYS } from '@/lib/verify';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deletion?: string }>;
}) {
  if (await getUser()) redirect('/panel');

  const { deletion } = await searchParams;
  const { d } = await getI18n();

  return (
    <AuthShell>
      {/* O'chirishdan keyin shu sahifaga qaytariladi — nima
          bo'lganini va qaytarish mumkinligini shu yerda aytamiz. */}
      {deletion ? (
        <div className="mb-5 rounded-[12px] border border-amber/30 bg-amber-soft px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-amber">
            <Icon name="clock" size={14} />
            {d.deletion.requestedTitle}
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-amber/90">
            {fill(d.deletion.requestedBody, { days: DELETION_GRACE_DAYS })}
          </p>
        </div>
      ) : null}

      <LoginForm />
    </AuthShell>
  );
}
