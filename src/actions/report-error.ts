'use server';

import { headers } from 'next/headers';
import { getUser } from '@/lib/session';
import { logError } from '@/lib/log';

/** Brauzerdagi xato chegarasi shu yerga xabar beradi.
 *
 *  Xato chegarasi mijoz tomonida ishlaydi, jurnal esa serverda —
 *  shuning uchun oradagi ko'prik kerak. Bu yerga ishonchsiz matn
 *  keladi, shuning uchun u qisqartiriladi va faqat jurnalga tushadi.
 */
export async function reportClientError(digest: string, message: string): Promise<void> {
  const user = await getUser();
  const store = await headers();

  await logError('client', message.slice(0, 500) || 'unknown', {
    digest: digest.slice(0, 120) || null,
    userId: user?.id ?? null,
    path: store.get('referer'),
  });
}
