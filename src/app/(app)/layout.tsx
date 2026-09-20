import Sidebar, { MobileNav } from '@/components/ui/Sidebar';
import { getActiveAccount } from '@/lib/account';
import { db } from '@/lib/db';
import { programShort } from '@/lib/i18n/labels';
import { unreadCount } from '@/lib/mentor';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/components/i18n/Provider';
import DemoBanner from '@/components/demo/DemoBanner';
import VerifyBanner from '@/components/account/VerifyBanner';
import DeletionBanner from '@/components/account/DeletionBanner';
import { resendVerification } from '@/actions/verify';
import { cancelDeletion } from '@/actions/settings';
import { daysUntilDeletion } from '@/lib/verify';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const unread = await unreadCount(user.id);
  // Xodim paneli havolasi faqat xodimga ko'rinadi.
  const me = await db.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  const isAdmin = me?.isAdmin ?? false;
  const badges: Record<string, number> = unread > 0 ? { '/mentor': unread } : {};

  return (
    <I18nProvider locale={locale} dict={d}>
    <div className="flex min-h-screen bg-bg">
      {/* Klaviatura bilan yurgan odam har sahifada yon menyuni
          qaytadan bosib o'tmasligi uchun. */}
      <a href="#main" className="skip-link">
        {d.common.skipToContent}
      </a>
      <Sidebar
        userName={user.name}
        accountName={user.name}
        accountSub={`${account.name} · ${programShort(account.program, d)}`}
        badges={badges}
        locale={locale}
        isAdmin={isAdmin}
      />
      <main id="main" tabIndex={-1} className="flex min-h-screen min-w-0 grow flex-col">
        <MobileNav badges={badges} />
        {user.isDemo ? <DemoBanner d={d} expiresAt={user.demoExpiresAt} /> : null}
        {/* O'chirish eslatmasi tasdiqlash eslatmasidan muhimroq —
            shuning uchun yuqorida turadi. */}
        {user.deletionRequestedAt ? (
          <DeletionBanner
            days={daysUntilDeletion(user.deletionRequestedAt)}
            action={cancelDeletion}
          />
        ) : null}
        {!user.isDemo && !user.emailVerifiedAt ? (
          <VerifyBanner action={resendVerification} />
        ) : null}
        {children}
      </main>
    </div>
    </I18nProvider>
  );
}
