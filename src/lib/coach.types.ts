/** Suhbatning mijoz tomonida ham kerak bo'ladigan qismi.
 *  coach.ts `server-only` — shuning uchun umumiy turlar shu yerda turadi.
 */

/** Bitta xabar uzunligi chegarasi — kontekst ham, xarajat ham cheklanadi. */
export const MESSAGE_MAX = 2000;

export type ChatRole = 'USER' | 'ASSISTANT';

export type ChatRow = {
  id: string;
  role: ChatRole;
  content: string;
  moodTag: string;
  createdAt: Date;
};

/** Kayfiyat kalitlari bazada saqlanadi — yorliqlar lug'atdan olinadi. */
export const MOODS = [
  { key: 'xotirjam', label: 'moodCalm' },
  { key: 'asabiy', label: 'moodAngry' },
  { key: 'qorquv', label: 'moodFear' },
  { key: 'ochkozlik', label: 'moodGreed' },
  { key: 'qaytarish', label: 'moodRevenge' },
  { key: 'charchoq', label: 'moodTired' },
  { key: 'ishonchsizlik', label: 'moodUnsure' },
] as const;

export type MoodKey = (typeof MOODS)[number]['label'];
