import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import SetupForm from '@/components/playbook/SetupForm';
import { updateSetup } from '@/actions/setups';
import { getSetups } from '@/lib/account';
import { requireUser } from '@/lib/session';
import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function EditSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const d = await getDict(user.locale);

  const setup = (await getSetups(user.id)).find((s) => s.id === id);
  if (!setup) notFound();

  return (
    <>
      <Topbar title={d.setupForm.editTitle} sub={setup.name} cta={null} />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <SetupForm
          action={updateSetup.bind(null, setup.id)}
          setup={setup}
          submitLabel={d.setupForm.saveEdit}
        />
      </div>
    </>
  );
}
