'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getUser } from '@/lib/session';
import { isLocale } from '@/lib/i18n';
import { LOCALE_COOKIE } from '@/lib/i18n/server';

const YEAR = 60 * 60 * 24 * 365;

/** Tilni almashtirish.
 *
 *  Cookie kirmagan odam uchun ham ishlaydi; kirgan bo'lsa tanlov
 *  hisobiga ham yoziladi va boshqa qurilmada ham saqlanadi.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const value = String(formData.get('locale') ?? '');
  if (!isLocale(value)) return;

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, value, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: YEAR,
  });

  const user = await getUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { locale: value } });
  }

  revalidatePath('/', 'layout');
}
