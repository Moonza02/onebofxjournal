import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

const COOKIE = 'onebo_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 kun

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET o‘rnatilmagan yoki juda qisqa. .env faylga kamida 32 belgili qiymat qo‘ying.',
    );
  }
  return new TextEncoder().encode(value);
}

/** Sessiya ochiladi.
 *
 *  Belgiga foydalanuvchining "sessiya avlodi" ham yoziladi. Parol
 *  almashganda avlod bittaga oshadi va eski belgilar shu zahoti
 *  kuchini yo'qotadi — boshqa qurilmalarda ochiq qolgan kirishlar ham.
 */
export async function createSession(userId: string, version?: number) {
  const current =
    version ??
    (await db.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } }))
      ?.sessionVersion ??
    0;

  const token = await new SignJWT({ sub: userId, v: current })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  locale: string;
  /** Namuna hisob — ma'lumoti o'ylab topilgan va muddati bor. */
  isDemo: boolean;
  demoExpiresAt: Date | null;
  /** Pochta tasdiqlangan payt; `null` — hali tasdiqlanmagan. */
  emailVerifiedAt: Date | null;
  /** O'chirish so'ralgan payt; `null` — so'ralmagan. */
  deletionRequestedAt: Date | null;
};

/** Sessiyadagi foydalanuvchi, yoki null. */
export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const id = typeof payload.sub === 'string' ? payload.sub : null;
    if (!id) return null;

    const user = await db.user.findUnique({
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        locale: true,
        sessionVersion: true,
        isDemo: true,
        demoExpiresAt: true,
        emailVerifiedAt: true,
        deletionRequestedAt: true,
      },
      where: { id },
    });
    if (!user) return null;

    // Belgidagi avlod bazadagidan orqada qolgan bo'lsa — parol
    // almashgan, demak bu belgi endi ishlamaydi.
    const version = typeof payload.v === 'number' ? payload.v : 0;
    if (version !== user.sessionVersion) return null;

    const { sessionVersion: _version, ...rest } = user;
    return rest;
  } catch {
    return null;
  }
}

/** Foydalanuvchi shart bo'lgan sahifalar uchun. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
