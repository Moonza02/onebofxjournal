import 'server-only';
import { db } from './db';
import { dayKeyIn, todayKeyIn } from './tz';
import type { Dict } from './i18n';

/** Kundalik sanalari vaqt mintaqasidan qat'i nazar bir xil turishi uchun
 *  UTC yarim tunida saqlanadi va shu ko'rinishda o'qiladi.
 */

/** Odat kalitlari bazada shu ko'rinishda saqlanadi — til almashsa ham
 *  eski yozuvlar joyida qoladi. Ko'rsatishda `habitLabels(d)` tarjima qiladi.
 */
export const HABITS = ['habit1', 'habit2', 'habit3', 'habit4', 'habit5'] as const;

export function habitLabels(d: Dict): string[] {
  return HABITS.map((key) => d.journal[key]);
}

export type JournalEntryRow = {
  id: string;
  date: Date;
  plan: string;
  notes: string;
  review: string;
  lessons: string[];
  tags: string[];
  discipline: number | null;
  patience: number | null;
  focus: number | null;
  stress: number | null;
  habitsDone: string[];
};

/** "2026-09-19" → UTC yarim tun. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Yozuv sanasi UTC yarim tunda saqlanadi — mintaqadan qat'i nazar
 *  bir xil kalit chiqishi uchun.
 */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(timeZone: string): string {
  return todayKeyIn(timeZone);
}

/** Sana kalitini tekshiradi — searchParams dan kelgan qiymatga ishonmaymiz. */
export function isValidKey(key: string | undefined): key is string {
  return Boolean(key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(key)));
}

export async function getEntry(userId: string, key: string): Promise<JournalEntryRow | null> {
  return db.journalEntry.findUnique({
    where: { userId_date: { userId, date: dateFromKey(key) } },
  });
}

export async function getEntries(userId: string, take = 40): Promise<JournalEntryRow[]> {
  return db.journalEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take,
  });
}

/** Oxirgi yozuvlardagi kayfiyat o'rtachasi — o'ng ustundagi trend uchun. */
export function moodAverage(entries: JournalEntryRow[]): number | null {
  const values: number[] = [];
  for (const e of entries) {
    for (const v of [e.discipline, e.patience, e.focus]) {
      if (typeof v === 'number') values.push(v);
    }
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Ketma-ket necha kun yozuv qoldirilgan. */
export function writingStreak(entries: JournalEntryRow[], timeZone: string): number {
  if (entries.length === 0) return 0;
  const keys = new Set(entries.map((e) => dayKey(e.date)));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = dayKeyIn(cursor, timeZone);
    if (keys.has(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
