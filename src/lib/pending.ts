import 'server-only';
import { cookies } from 'next/headers';

/** «Tasdiqlash kutilmoqda» belgisi.
 *
 *  Ro'yxatdan o'tgan, lekin hali manzilini tasdiqlamagan odam
 *  ichkariga kirolmaydi — ya'ni uning sessiyasi yo'q. Lekin unga
 *  "xat qaysi manzilga ketdi" deb ko'rsatish va "qayta yuborish"
 *  tugmasini berish kerak. Shuning uchun kichik belgi qoldiriladi.
 *
 *  Bu **sessiya emas**: u hech qanday sahifani ochmaydi va hech
 *  narsani tasdiqlamaydi. Undan qilinadigan yagona ish — o'sha
 *  hisobning **o'z** manziliga tasdiqlash xatini qayta jo'natish,
 *  u ham soatiga bir necha marta.
 *
 *  Manzilni URL ga yozish mumkin emas edi: manzil — shaxsiy
 *  ma'lumot, u brauzer tarixida, server log'ida va ulashilgan
 *  havolada qolib ketadi.
 */
const COOKIE = 'onebo_pending';

/** Yarim soat: xatni kutib, "qayta yuborish"ni bosishga yetadi. */
const MAX_AGE = 30 * 60;

export async function setPending(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function getPending(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function clearPending(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
