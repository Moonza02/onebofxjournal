import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import AuthShell from '@/components/auth/AuthShell';
import { RequestForm } from '@/components/auth/ResetForms';

export const dynamic = 'force-dynamic';

export default async function ResetRequestPage() {
  if (await getUser()) redirect('/panel');
  return (
    <AuthShell>
      <RequestForm />
    </AuthShell>
  );
}
