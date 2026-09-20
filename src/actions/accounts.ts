'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { canAddAccount, getBilling } from '@/lib/payments';
import { getDict } from '@/lib/i18n/server';
import type { Dict } from '@/lib/i18n';

export type AccountFormState = { error?: string; ok?: boolean };

const numberField = z.preprocess((v) => Number(v), z.number().finite().nonnegative());

const accountSchema = (d: Dict) =>
  z.object({
    name: z.string().trim().min(1, d.accounts.errName),
  broker: z.string().trim().optional(),
  startingBalance: numberField,
  program: z.enum(['HYPER_GROWTH', 'HIGH_STAKES', 'BOOTCAMP', 'CUSTOM']),
  dailyLossPct: numberField,
  maxDrawdownPct: numberField,
  profitTargetPct: numberField,
  riskPerTradePct: numberField,
});

export async function updateAccount(
  accountId: string,
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();

  const owned = await db.account.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });
  const d = await getDict(user.locale);
  if (!owned) return { error: d.accounts.notFound };

  const parsed = accountSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.startingBalance <= 0) {
    return { error: d.accounts.balanceError };
  }

  await db.account.update({
    where: { id: accountId },
    data: { ...parsed.data, broker: parsed.data.broker ?? '' },
  });

  revalidatePath('/');
  revalidatePath('/accounts');
  revalidatePath('/risk');
  return { ok: true };
}

export async function createAccount(formData: FormData) {
  const user = await requireUser();

  // Tarifdagi hisoblar chegarasi.
  const billing = await getBilling(user);
  if (!canAddAccount(billing)) {
    redirect('/tarif');
  }

  const name =
    String(formData.get('name') ?? '').trim() || (await getDict(user.locale)).accounts.newDefaultName;

  await db.account.create({
    data: { userId: user.id, name, startingBalance: 10000, isActive: false },
  });

  revalidatePath('/accounts');
}

export async function activateAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  const owned = await db.account.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return;

  await db.$transaction([
    db.account.updateMany({ where: { userId: user.id }, data: { isActive: false } }),
    db.account.update({ where: { id }, data: { isActive: true, isArchived: false } }),
  ]);

  revalidatePath('/');
  revalidatePath('/accounts');
}
