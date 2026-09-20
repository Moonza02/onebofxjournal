import Topbar from '@/components/ui/Topbar';
import SetupForm from '@/components/playbook/SetupForm';
import { createSetup } from '@/actions/setups';
import { requireUser } from '@/lib/session';
import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function NewSetupPage() {
  const user = await requireUser();
  const d = await getDict(user.locale);
  return (
    <>
      <Topbar title={d.setupForm.newTitle} sub={d.setupForm.newSub} cta={null} />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <SetupForm action={createSetup} submitLabel={d.setupForm.saveNew} />
      </div>
    </>
  );
}
