'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { dateFromKey, HABITS, isValidKey } from '@/lib/journal';

export type JournalState = { error?: string; ok?: boolean };

const rating = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().min(1).max(5).optional(),
);

const schema = z.object({
  date: z.string().refine(isValidKey),
  plan: z.string().optional(),
  notes: z.string().optional(),
  review: z.string().optional(),
  lessons: z.string().optional(),
  tags: z.string().optional(),
  discipline: rating,
  patience: rating,
  focus: rating,
  stress: rating,
});

const lines = (value: string | undefined) =>
  (value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

export async function saveJournalEntry(
  _prev: JournalState,
  formData: FormData,
): Promise<JournalState> {
  const user = await requireUser();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const habitsDone = HABITS.filter((_, i) => formData.get(`habit-${i}`) === 'on');

  const data = {
    plan: parsed.data.plan ?? '',
    notes: parsed.data.notes ?? '',
    review: parsed.data.review ?? '',
    lessons: lines(parsed.data.lessons),
    tags: (parsed.data.tags ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    discipline: parsed.data.discipline ?? null,
    patience: parsed.data.patience ?? null,
    focus: parsed.data.focus ?? null,
    stress: parsed.data.stress ?? null,
    habitsDone,
  };

  const date = dateFromKey(parsed.data.date);

  await db.journalEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, ...data },
    update: data,
  });

  revalidatePath('/journal');
  return { ok: true };
}
