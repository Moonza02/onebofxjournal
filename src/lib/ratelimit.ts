import 'server-only';
import { headers } from 'next/headers';

/** Urinishlar chegarasi.
 *
 *  Ikki xil saqlagich bor va tanlov `REDIS_URL` ga qarab bo'ladi:
 *
 *  - `REDIS_URL` yo'q — hisoblagich shu jarayon xotirasida. Bitta
 *    serverda ishlaydigan ilova uchun yetarli.
 *  - `REDIS_URL` bor — hisoblagich Redis'da, ya'ni ilovaning barcha
 *    nusxalari bitta hisobni ko'radi. Shunda "15 daqiqada 10 urinish"
 *    haqiqatan ham 10 ta bo'ladi, nusxalar soniga ko'paymaydi.
 *
 *  Redis javob bermasa chegara butunlay ochilib ketmaydi: shu so'rov
 *  xotiradagi hisoblagichga tushadi. Ya'ni himoya kuchsizlanadi
 *  (har nusxa alohida sanaydi), lekin yo'qolmaydi.
 */

export type RateLimitResult = { allowed: boolean; retryAfterSec: number; remaining: number };

/** Hisoblagich qiymatidan qaror — sof funksiya, shuning uchun sinaladi. */
export function decide(count: number, limit: number, ttlMs: number): RateLimitResult {
  if (count > limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)), remaining: 0 };
  }
  return { allowed: true, retryAfterSec: 0, remaining: Math.max(0, limit - count) };
}

/* ------------------------------------------------------------------ xotira */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Vaqti o'tgan yozuvlarni tozalaydi — xotira cheksiz o'smasligi uchun. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Kalitni bittaga oshiradi va {hisob, qolgan vaqt} qaytaradi. */
function bumpMemory(key: string, windowMs: number): { count: number; ttlMs: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { count: 1, ttlMs: windowMs };
  }

  bucket.count += 1;
  return { count: bucket.count, ttlMs: bucket.resetAt - now };
}

/* ------------------------------------------------------------------- Redis */

/** INCR va muddat bitta qadamda — aks holda ikki so'rov orasida
 *  kalit muddatsiz qolib ketishi mumkin.
 */
const SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { count, redis.call('PTTL', KEYS[1]) }
`;

type MinimalRedis = {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  ping(): Promise<unknown>;
};

let client: MinimalRedis | null = null;
let pending: Promise<MinimalRedis | null> | null = null;
let nextTry = 0;

/** Ulanish bir marta ochiladi va qayta ishlatiladi. Ulanib bo'lmasa
 *  har so'rovda qayta urinilmaydi — keyingi urinish 10 soniyadan keyin.
 */
async function connect(url: string): Promise<MinimalRedis | null> {
  try {
    const { default: Redis } = await import('ioredis');

    const instance = new Redis(url, {
      // Ulanish shu yerda ochiladi: tayyor bo'lmagan ulanishga buyruq
      // yuborilsa ioredis xato beradi va birinchi so'rov Redis'ni
      // chetlab o'tardi.
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      commandTimeout: 1000,
      connectTimeout: 2000,
    });

    // Ulanish uzilsa jarayon yiqilmasin — ioredis o'zi qayta ulanadi,
    // oradagi so'rovlar esa xotiradagi hisoblagichga tushadi.
    instance.on('error', () => {});

    await instance.connect();
    client = instance as unknown as MinimalRedis;
    return client;
  } catch {
    nextTry = Date.now() + 10_000;
    pending = null;
    return null;
  }
}

async function redis(): Promise<MinimalRedis | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (client) return client;
  if (Date.now() < nextTry) return null;

  pending ??= connect(url);
  return pending;
}

/** Redis'dagi hisoblagich. Xato bo'lsa `null` — chaqiruvchi xotiraga o'tadi. */
async function bumpRedis(
  key: string,
  windowMs: number,
): Promise<{ count: number; ttlMs: number } | null> {
  const connection = await redis();
  if (!connection) return null;

  try {
    const raw = await connection.eval(SCRIPT, 1, `rl:${key}`, windowMs);
    if (!Array.isArray(raw)) return null;

    const count = Number(raw[0]);
    const ttlMs = Number(raw[1]);
    if (!Number.isFinite(count)) return null;

    return { count, ttlMs: ttlMs > 0 ? ttlMs : windowMs };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- API */

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const hit = (await bumpRedis(key, windowMs)) ?? bumpMemory(key, windowMs);
  return decide(hit.count, limit, hit.ttlMs);
}

/** Muvaffaqiyatli kirishdan keyin hisoblagich tozalanadi. */
export async function resetLimit(key: string): Promise<void> {
  buckets.delete(key);

  const connection = await redis();
  if (!connection) return;

  try {
    await connection.del(`rl:${key}`);
  } catch {
    // Tozalanmasa ham xavfsiz: chegara o'z muddatida o'zi bo'shaydi.
  }
}

/** Proxy ortidagi haqiqiy IP. Topilmasa — umumiy kalit. */
export async function clientKey(prefix: string): Promise<string> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || store.get('x-real-ip') || 'unknown';
  return `${prefix}:${ip}`;
}

/** Sog'liq tekshiruvi uchun: Redis javob beryaptimi.
 *  `off` — sozlanmagan (bu xato emas), `up` — javob berdi, `error` — yo'q.
 */
export async function redisPing(): Promise<'off' | 'up' | 'error'> {
  if (!process.env.REDIS_URL) return 'off';

  const connection = await redis();
  if (!connection) return 'error';

  try {
    await connection.ping();
    return 'up';
  } catch {
    return 'error';
  }
}

/** Testlar uchun: xotiradagi hisoblagichni bo'shatadi. */
export function clearMemoryLimits(): void {
  buckets.clear();
}
