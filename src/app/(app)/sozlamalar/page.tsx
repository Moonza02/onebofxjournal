import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { DeleteForm, PasswordForm } from '@/components/settings/AccountForms';
import { daysUntilDeletion } from '@/lib/verify';
import { requireUser } from '@/lib/session';
import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const d = await getDict(user.locale);

  return (
    <>
      <Topbar title={d.settings.title} sub={d.settings.sub} cta={null} />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Card>
            <CardTitle>{d.settings.passwordTitle}</CardTitle>
            <PasswordForm />
          </Card>

          <Card>
            <CardTitle>{d.settings.exportTitle}</CardTitle>
            <div className="flex flex-col gap-3">
              <p className="text-[12px] leading-relaxed text-txt3">{d.settings.exportNote}</p>
              <div>
                {/* Oddiy havola: fayl server tomondan oqib keladi,
                    shuning uchun bu yerda JavaScript kerak emas. */}
                <a
                  href="/api/export"
                  className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-card2 px-4 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
                >
                  <Icon name="dl" size={14} />
                  {d.settings.exportButton}
                </a>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-loss/25">
          <CardTitle>{d.settings.deleteTitle}</CardTitle>
          <DeleteForm
            email={user.email}
            pendingDays={
              user.deletionRequestedAt
                ? daysUntilDeletion(user.deletionRequestedAt)
                : undefined
            }
          />
        </Card>
      </div>
    </>
  );
}
