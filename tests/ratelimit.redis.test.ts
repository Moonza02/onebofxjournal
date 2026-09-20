import { afterAll, describe, expect, it } from 'vitest';
import net from 'node:net';

/** Redis bilan ishlaydigan yo'l.
 *
 *  Redis topilmasa test o'tkazib yuboriladi — shunda `npm test` Redis
 *  o'rnatilmagan mashinada ham ishlaydi. Tekshirish uchun:
 *
 *      redis-server --port 6399 --daemonize yes
 *      REDIS_TEST_URL=redis://127.0.0.1:6399 npm test
 */

const URL = process.env.REDIS_TEST_URL ?? 'redis://127.0.0.1:6379';

async function reachable(): Promise<boolean> {
  const { hostname, port } = new global.URL(URL);
  return new Promise((resolve) => {
    const socket = net
      .connect({ host: hostname, port: Number(port) || 6379 })
      .setTimeout(300)
      .on('connect', () => {
        socket.end();
        resolve(true);
      })
      .on('timeout', () => {
        socket.destroy();
        resolve(false);
      })
      .on('error', () => resolve(false));
  });
}

const hasRedis = await reachable();

describe.skipIf(!hasRedis)('Redis saqlagichi', async () => {
  process.env.REDIS_URL = URL;

  const { rateLimit, resetLimit } = await import('@/lib/ratelimit');
  const { default: Redis } = await import('ioredis');
  const probe = new Redis(URL);

  afterAll(async () => {
    await probe.quit();
  });

  it('hisoblagich Redis da turadi va muddat bilan yoziladi', async () => {
    const key = `test:${Math.random()}`;

    expect((await rateLimit(key, 2, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 2, 60_000)).remaining).toBe(0);

    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);

    // Hisob haqiqatan Redis da — ya'ni boshqa nusxa ham shuni ko'radi.
    expect(await probe.get(`rl:${key}`)).toBe('3');
    expect(await probe.pttl(`rl:${key}`)).toBeGreaterThan(0);

    await probe.del(`rl:${key}`);
  });

  it('muddat o‘tgach kalit o‘zi yo‘qoladi', async () => {
    const key = `test:${Math.random()}`;

    await rateLimit(key, 1, 60);
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(await probe.get(`rl:${key}`)).toBeNull();
  });

  it('resetLimit Redis dagi kalitni ham o‘chiradi', async () => {
    const key = `test:${Math.random()}`;

    await rateLimit(key, 1, 60_000);
    expect((await rateLimit(key, 1, 60_000)).allowed).toBe(false);

    await resetLimit(key);

    expect(await probe.get(`rl:${key}`)).toBeNull();
    expect((await rateLimit(key, 1, 60_000)).allowed).toBe(true);

    await probe.del(`rl:${key}`);
  });
});
