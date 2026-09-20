'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import {
  getMentorship,
  makeInviteCode,
  MAX_MENTORS,
  MAX_STUDENTS,
  normalizeCode,
  NOTE_MAX,
  type MentorRole,
} from '@/lib/mentor';
import { rateLimit } from '@/lib/ratelimit';
import { getBilling } from '@/lib/payments';
import { has, limits } from '@/lib/billing';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export type MentorState = { error?: string; ok?: string };

/* ------------------------------------------------------------------ taklif */

const inviteSchema = z.object({
  role: z.enum(['MENTOR', 'STUDENT']),
});

export async function createInvite(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const parsed = inviteSchema.safeParse({ role: formData.get('role') });
  if (!parsed.success) return { error: d.mentor.errRole };

  const billing = await getBilling(user);
  if (!has(billing.plan, 'mentor')) return { error: d.billing.lockedMentor };

  // Kod generatsiyasiga chegara — kodlar cheksiz yaratilmasin.
  if (!(await rateLimit(`invite:${user.id}`, 10, 60 * 60 * 1000)).allowed) {
    return { error: d.mentor.errTooManyInvites };
  }

  const open = await db.mentorship.count({
    where: { createdById: user.id, status: 'PENDING' },
  });
  if (open >= 5) {
    return { error: d.mentor.errOpenInvites };
  }

  const base = {
    inviterRole: parsed.data.role,
    createdById: user.id,
    ...(parsed.data.role === 'MENTOR' ? { mentorId: user.id } : { studentId: user.id }),
  };

  // Kod takrorlanishi deyarli mumkin emas, lekin unique cheklov buzilsa
  // foydalanuvchiga xato ko'rsatgandan ko'ra qayta urinish arzonroq.
  try {
    await db.mentorship.create({ data: { ...base, inviteCode: makeInviteCode() } });
  } catch {
    await db.mentorship.create({ data: { ...base, inviteCode: makeInviteCode() } });
  }

  revalidatePath('/mentor');
  return { ok: d.mentor.okInvite };
}

export async function cancelInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  await db.mentorship.deleteMany({
    where: { id, createdById: user.id, status: 'PENDING' },
  });

  revalidatePath('/mentor');
}

/* ------------------------------------------------------------------ qo'shilish */

export async function joinByCode(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const billing = await getBilling(user);
  if (!has(billing.plan, 'mentor')) return { error: d.billing.lockedMentor };

  const code = normalizeCode(String(formData.get('code') ?? ''));

  if (code.length !== 8) return { error: d.mentor.errCodeLength };

  // Kodni terib topishga urinishlarni cheklaymiz.
  if (!(await rateLimit(`join:${user.id}`, 20, 60 * 60 * 1000)).allowed) {
    return { error: d.mentor.errJoinTooMany };
  }

  // Bazada kod defis bilan saqlanadi.
  const stored = `${code.slice(0, 4)}-${code.slice(4)}`;

  const link: {
    id: string;
    status: string;
    inviterRole: MentorRole;
    createdById: string;
  } | null = await db.mentorship.findUnique({
    where: { inviteCode: stored },
    select: { id: true, status: true, inviterRole: true, createdById: true },
  });

  if (!link || link.status !== 'PENDING') return { error: d.mentor.errCodeNotFound };
  if (link.createdById === user.id) return { error: d.mentor.errOwnInvite };

  // Qo'shiluvchi — taklif yaratuvchisining teskari rolida.
  const joiningAs: MentorRole = link.inviterRole === 'MENTOR' ? 'STUDENT' : 'MENTOR';

  const existing = await db.mentorship.count({
    where: {
      status: 'ACTIVE',
      ...(joiningAs === 'MENTOR' ? { mentorId: user.id } : { studentId: user.id }),
    },
  });

  // Mentor uchun chegara tarifdan keladi; MAX_STUDENTS — umumiy shift.
  const studentCap = Math.min(limits(billing.plan).students, MAX_STUDENTS);
  if (joiningAs === 'MENTOR' && existing >= studentCap) {
    return { error: fill(d.mentor.errStudentCap, { n: studentCap }) };
  }
  if (joiningAs === 'STUDENT' && existing >= MAX_MENTORS) {
    return { error: fill(d.mentor.errMentorCap, { n: MAX_MENTORS }) };
  }

  await db.mentorship.update({
    where: { id: link.id },
    data: {
      status: 'ACTIVE',
      acceptedAt: new Date(),
      ...(joiningAs === 'MENTOR' ? { mentorId: user.id } : { studentId: user.id }),
    },
  });

  revalidatePath('/mentor');
  redirect(`/mentor/${link.id}`);
}

/* ------------------------------------------------------------------ sozlama */

const shareSchema = z.object({
  id: z.string().min(1),
  shareTrades: z.boolean(),
  shareAlerts: z.boolean(),
  shareJournal: z.boolean(),
});

/** Nimani ulashishni faqat o'quvchi o'zgartira oladi. */
export async function updateSharing(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = shareSchema.safeParse({
    id: formData.get('id'),
    shareTrades: formData.get('shareTrades') === 'on',
    shareAlerts: formData.get('shareAlerts') === 'on',
    shareJournal: formData.get('shareJournal') === 'on',
  });
  if (!parsed.success) return;

  await db.mentorship.updateMany({
    where: { id: parsed.data.id, studentId: user.id, status: 'ACTIVE' },
    data: {
      shareTrades: parsed.data.shareTrades,
      shareAlerts: parsed.data.shareAlerts,
      shareJournal: parsed.data.shareJournal,
    },
  });

  revalidatePath(`/mentor/${parsed.data.id}`);
}

/** Aloqani ikkala tomon ham to'xtata oladi. Yozishmalar o'chmaydi —
 *  aloqa `ENDED` bo'lib qoladi va ro'yxatdan chiqadi.
 */
export async function endMentorship(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  await db.mentorship.updateMany({
    where: { id, status: 'ACTIVE', OR: [{ mentorId: user.id }, { studentId: user.id }] },
    data: { status: 'ENDED', endedAt: new Date() },
  });

  revalidatePath('/mentor');
  redirect('/mentor');
}

/* ------------------------------------------------------------------ izoh */

const noteSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1).max(NOTE_MAX),
  tradeId: z.string().optional(),
});

export async function addNote(_prev: MentorState, formData: FormData): Promise<MentorState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const parsed = noteSchema.safeParse({
    id: formData.get('id'),
    body: formData.get('body'),
    tradeId: formData.get('tradeId') || undefined,
  });
  if (!parsed.success) {
    const tooLong = String(formData.get('body') ?? '').trim().length > NOTE_MAX;
    return { error: tooLong ? d.mentor.errNoteLong : d.mentor.errNoteEmpty };
  }

  const link = await getMentorship(parsed.data.id, user.id);
  if (!link || link.status !== 'ACTIVE') return { error: d.mentor.errLinkNotFound };

  if (!(await rateLimit(`note:${user.id}`, 60, 60 * 60 * 1000)).allowed) {
    return { error: d.mentor.errTooManyNotes };
  }

  // Savdoga bog'lash faqat o'sha o'quvchining savdosi bo'lsa.
  let tradeId: string | null = null;
  if (parsed.data.tradeId && link.studentId) {
    const owned = await db.trade.count({
      where: { id: parsed.data.tradeId, account: { userId: link.studentId } },
    });
    if (owned > 0) tradeId = parsed.data.tradeId;
  }

  await db.mentorNote.create({
    data: { mentorshipId: link.id, authorId: user.id, body: parsed.data.body, tradeId },
  });

  revalidatePath(`/mentor/${link.id}`);
  return { ok: d.mentor.okNote };
}
