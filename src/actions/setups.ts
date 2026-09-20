'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { getDict } from '@/lib/i18n/server';
import type { Dict } from '@/lib/i18n';

export type SetupState = { error?: string };

const lines = (value: string | undefined) =>
  (value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const csv = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const schema = (d: Dict) =>
  z.object({
    name: z.string().trim().min(1, d.playbook.errName),
  description: z.string().optional(),
  entryRules: z.string().optional(),
  exitRules: z.string().optional(),
  riskRules: z.string().optional(),
  timeframes: z.string().optional(),
  sessions: z.string().optional(),
  status: z.enum(['ACTIVE', 'TESTING', 'ARCHIVED']),
});

function buildData(values: z.infer<ReturnType<typeof schema>>) {
  return {
    name: values.name,
    description: values.description ?? '',
    entryRules: lines(values.entryRules),
    exitRules: lines(values.exitRules),
    riskRules: lines(values.riskRules),
    timeframes: csv(values.timeframes),
    sessions: csv(values.sessions),
    status: values.status,
  };
}

export async function createSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const parsed = schema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const setup = await db.setup.create({
    data: { userId: user.id, ...buildData(parsed.data) },
  });

  revalidatePath('/playbook');
  redirect(`/playbook?s=${setup.id}`);
}

export async function updateSetup(
  setupId: string,
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const owned = await db.setup.findFirst({
    where: { id: setupId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { error: d.playbook.errNotFound };

  const parsed = schema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.setup.update({ where: { id: setupId }, data: buildData(parsed.data) });

  revalidatePath('/playbook');
  revalidatePath('/trades/new');
  redirect(`/playbook?s=${setupId}`);
}

/** Setup o'chirilmaydi — arxivga olinadi.
 *  Sabab: unga bog'langan savdolar statistikasi saqlanib qolishi kerak.
 */
export async function archiveSetup(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  const owned = await db.setup.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) redirect('/playbook');

  await db.setup.update({ where: { id }, data: { status: 'ARCHIVED' } });

  revalidatePath('/playbook');
  redirect('/playbook');
}
