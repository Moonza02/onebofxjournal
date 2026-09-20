/** Mentor bo'limining mijoz tomonida ham kerak bo'ladigan qismi.
 *  mentor.ts `server-only`, shuning uchun umumiy qiymatlar shu yerda.
 */

export const NOTE_MAX = 2000;

export type MentorRole = 'MENTOR' | 'STUDENT';
export type MentorshipStatus = 'PENDING' | 'ACTIVE' | 'ENDED';
