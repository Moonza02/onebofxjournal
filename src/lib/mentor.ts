import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { TRADE_SELECT, type AccountRow, type TradeRow } from './account';
import type { MentorRole, MentorshipStatus } from './mentor.types';

/** Mentor va o'quvchi.
 *
 *  Asosiy qoida: mentor o'quvchining ma'lumotini faqat o'quvchi ruxsat
 *  bergan darajada ko'radi, va **psixologiya suhbati hech qachon
 *  ulashilmaydi** — u hech qanday bayroq bilan ochilmaydi, bu yerda
 *  uni o'qiydigan funksiya umuman yo'q.
 *
 *  Har bir o'qish funksiyasi chaqiruvchining shu aloqada tomon ekanini
 *  o'zi tekshiradi — sahifaga ishonilmaydi.
 */

export { NOTE_MAX } from './mentor.types';
export type { MentorRole, MentorshipStatus } from './mentor.types';

export type Party = { id: string; name: string; email: string } | null;

export type MentorshipRow = {
  id: string;
  inviteCode: string;
  inviterRole: MentorRole;
  createdById: string;
  mentorId: string | null;
  studentId: string | null;
  status: MentorshipStatus;
  shareTrades: boolean;
  shareAlerts: boolean;
  shareJournal: boolean;
  createdAt: Date;
  acceptedAt: Date | null;
  endedAt: Date | null;
  mentor: Party;
  student: Party;
};

export type NoteRow = {
  id: string;
  authorId: string;
  tradeId: string | null;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  author: { id: string; name: string };
  trade: { id: string; symbol: string; direction: string; openedAt: Date } | null;
};

/** Bitta odam bir vaqtda nechta faol aloqada bo'lishi mumkin. */
export const MAX_STUDENTS = 25;
export const MAX_MENTORS = 3;

const PARTY_SELECT = { select: { id: true, name: true, email: true } } as const;

const MENTORSHIP_SELECT = {
  id: true,
  inviteCode: true,
  inviterRole: true,
  createdById: true,
  mentorId: true,
  studentId: true,
  status: true,
  shareTrades: true,
  shareAlerts: true,
  shareJournal: true,
  createdAt: true,
  acceptedAt: true,
  endedAt: true,
  mentor: PARTY_SELECT,
  student: PARTY_SELECT,
} as const;

/** Kod odam tomonidan o'qiladigan bo'lishi kerak — telefon orqali
 *  aytiladi. Shuning uchun adashtiradigan harflar (O, 0, I, 1) yo'q.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeInviteCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) code += '-';
  }
  return code;
}

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/* ------------------------------------------------------------------ o'qish */

/** Foydalanuvchining hamma aloqalari: mentor sifatida ham, o'quvchi
 *  sifatida ham, va hali qabul qilinmagan takliflari.
 */
export async function getMentorships(userId: string): Promise<{
  asMentor: MentorshipRow[];
  asStudent: MentorshipRow[];
  pending: MentorshipRow[];
}> {
  const rows: MentorshipRow[] = await db.mentorship.findMany({
    where: {
      OR: [{ mentorId: userId }, { studentId: userId }, { createdById: userId }],
      status: { not: 'ENDED' },
    },
    orderBy: { createdAt: 'desc' },
    select: MENTORSHIP_SELECT,
  });

  return {
    asMentor: rows.filter((r) => r.status === 'ACTIVE' && r.mentorId === userId),
    asStudent: rows.filter((r) => r.status === 'ACTIVE' && r.studentId === userId),
    pending: rows.filter((r) => r.status === 'PENDING' && r.createdById === userId),
  };
}

/** Aloqa — faqat tomon bo'lsa qaytadi. Aks holda null. */
export async function getMentorship(id: string, userId: string): Promise<MentorshipRow | null> {
  const row: MentorshipRow | null = await db.mentorship.findFirst({
    where: { id, OR: [{ mentorId: userId }, { studentId: userId }] },
    select: MENTORSHIP_SELECT,
  });
  return row;
}

export function roleIn(link: MentorshipRow, userId: string): MentorRole | null {
  if (link.mentorId === userId) return 'MENTOR';
  if (link.studentId === userId) return 'STUDENT';
  return null;
}

/** Aloqadagi ikkinchi tomon. */
export function counterpart(link: MentorshipRow, userId: string): Party {
  return link.mentorId === userId ? link.student : link.mentor;
}

export async function getNotes(mentorshipId: string, userId: string): Promise<NoteRow[]> {
  const link = await getMentorship(mentorshipId, userId);
  if (!link) return [];

  return db.mentorNote.findMany({
    where: { mentorshipId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      authorId: true,
      tradeId: true,
      body: true,
      createdAt: true,
      readAt: true,
      author: { select: { id: true, name: true } },
      trade: { select: { id: true, symbol: true, direction: true, openedAt: true } },
    },
  });
}

/** O'qilmagan izohlar soni — yon paneldagi belgi uchun. */
export async function unreadCount(userId: string): Promise<number> {
  return db.mentorNote.count({
    where: {
      readAt: null,
      authorId: { not: userId },
      mentorship: {
        status: 'ACTIVE',
        OR: [{ mentorId: userId }, { studentId: userId }],
      },
    },
  });
}

export async function markNotesRead(mentorshipId: string, userId: string): Promise<void> {
  await db.mentorNote.updateMany({
    where: { mentorshipId, authorId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

/* ------------------------------------------------------------------ o'quvchi ma'lumoti */

export type StudentView = {
  account: AccountRow | null;
  trades: TradeRow[];
  journal: { date: Date; lessons: string[]; review: string }[];
  ignoredAlerts: number;
  /** Nimalar berilmagani — interfeys buni ochiq aytadi. */
  hidden: string[];
};

/** Mentor ko'radigan ma'lumot. Har bir bo'lak o'quvchining bayrog'iga
 *  bog'liq; bayroq yopiq bo'lsa ma'lumot umuman yuklanmaydi.
 */
export async function getStudentView(
  link: MentorshipRow,
  viewerId: string,
): Promise<StudentView | null> {
  if (link.status !== 'ACTIVE' || link.mentorId !== viewerId || !link.studentId) return null;

  const hidden: string[] = [];
  if (!link.shareTrades) hidden.push('hiddenTrades');
  if (!link.shareAlerts) hidden.push('hiddenAlerts');
  if (!link.shareJournal) hidden.push('hiddenJournal');

  const account: AccountRow | null = await db.account.findFirst({
    where: { userId: link.studentId, isArchived: false },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  });

  const trades: TradeRow[] =
    link.shareTrades && account
      ? await db.trade.findMany({
          where: { accountId: account.id, isBacktest: false },
          orderBy: { openedAt: 'desc' },
          take: 200,
          select: TRADE_SELECT,
        })
      : [];

  const journal: { date: Date; lessons: string[]; review: string }[] = link.shareJournal
    ? await db.journalEntry.findMany({
        where: { userId: link.studentId },
        orderBy: { date: 'desc' },
        take: 10,
        select: { date: true, lessons: true, review: true },
      })
    : [];

  const ignoredAlerts = link.shareAlerts
    ? await db.riskAlert.count({ where: { userId: link.studentId, action: 'IGNORED' } })
    : 0;

  return { account, trades, journal, ignoredAlerts, hidden };
}
