import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';
import DemoRow from '@/components/auth/DemoRow';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getUser()) redirect('/panel');
  return (
    <AuthShell>
      <RegisterForm />
      <DemoRow />
    </AuthShell>
  );
}
