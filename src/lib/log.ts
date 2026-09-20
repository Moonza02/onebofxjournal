import 'server-only';
import { db } from './db';

/** Xatolarni yozish.
 *
 *  Ikki joyga yoziladi va tartibi muhim:
 *
 *  1. **stderr** — har doim va birinchi. Docker, systemd yoki boshqa
 *     har qanday muhit shu oqimni yig'adi. Bu hech qachon yiqilmaydi.
 *  2. **Baza** — imkon bo'lsa. Shu bilan xatolarni serverga kirmasdan,
 *     admin sahifasidan ko'rish mumkin.
 *
 *  Baza yiqilganda ham birinchi yo'l ishlaydi — aynan o'sha paytda
 *  xabar eng kerak bo'ladi.
 *
 *  Yozuv hech qachon chaqiruvchini to'xtatmaydi: `logError` hech narsa
 *  otmaydi va uni `await` qilmasa ham bo'ladi.
 */

/** Uzun matn bazani shishirmasligi uchun. */
const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;

export type ErrorMeta = {
  userId?: string | null;
  path?: string | null;
  digest?: string | null;
};

function textOf(error: unknown): { message: string; stack?: string; digest?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack,
      digest: (error as { digest?: string }).digest,
    };
  }
  if (typeof error === 'string') return { message: error };
  return { message: String(error) };
}

function clip(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function logError(
  scope: string,
  error: unknown,
  meta: ErrorMeta = {},
): Promise<void> {
  const { message, stack, digest } = textOf(error);
  const at = new Date().toISOString();

  // JSON qator: jurnal yig'adigan vositalar buni o'qiy oladi.
  try {
    console.error(
      JSON.stringify({
        at,
        level: 'error',
        scope,
        message: clip(message, MAX_MESSAGE),
        digest: meta.digest ?? digest ?? null,
        userId: meta.userId ?? null,
        path: meta.path ?? null,
      }),
    );
  } catch {
    // Hatto seriyalash ham yiqilsa — jim o'tamiz.
  }

  try {
    await db.appError.create({
      data: {
        scope,
        message: clip(message, MAX_MESSAGE) ?? 'unknown',
        digest: meta.digest ?? digest ?? null,
        stack: clip(stack, MAX_STACK) ?? null,
        userId: meta.userId ?? null,
        path: meta.path ?? null,
      },
    });
  } catch {
    // Baza yozib bo'lmasa ham yuqoridagi qator allaqachon chiqib bo'ldi.
  }
}

/** Eski yozuvlar cheksiz to'planmasligi uchun.
 *  Admin sahifasi ochilganda chaqiriladi — alohida cron kerak emas.
 */
export async function pruneErrors(keepDays = 30): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    await db.appError.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch {
    // Tozalash ham yordamchi ish.
  }
}
