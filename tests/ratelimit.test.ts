import { afterEach, describe, expect, it } from 'vitest';
import { clearMemoryLimits, decide, rateLimit, resetLimit } from '@/lib/ratelimit';

/** REDIS_URL sinovda qo'yilmaydi — shuning uchun xotiradagi saqlagich
 *  ishlaydi. Redis yo'lining o'zi qaror mantig'i bilan bir xil
 *  (`decide`), farqi faqat hisoblagich qayerda turishida.
 */

afterEach(() => {
  clearMemoryLimits();
});

describe('decide', () => {
  it('chegaragacha ruxsat beradi va qolganini sanaydi', () => {
    expect(decide(1, 3, 60_000)).toEqual({ allowed: true, retryAfterSec: 0, remaining: 2 });
    expect(decide(3, 3, 60_000)).toEqual({ allowed: true, retryAfterSec: 0, remaining: 0 });
  });

  it('chegaradan oshsa to‘xtatadi va kutish vaqtini beradi', () => {
    const result = decide(4, 3, 30_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSec).toBe(30);
  });

  it('qolgan vaqt bir soniyadan kam bo‘lsa ham nol qaytarmaydi', () => {
    // Aks holda "0 soniyadan keyin urinib ko'ring" degan xabar chiqardi.
    expect(decide(9, 2, 120).retryAfterSec).toBe(1);
  });
});

describe('rateLimit', () => {
  it('bir xil kalit bo‘yicha sanaydi', async () => {
    const key = `test:${Math.random()}`;

    expect((await rateLimit(key, 2, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 2, 60_000)).remaining).toBe(0);

    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('har kalit alohida hisoblanadi', async () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;

    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).allowed).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).allowed).toBe(true);
  });

  it('muddat tugagach hisob noldan boshlanadi', async () => {
    const key = `short:${Math.random()}`;

    await rateLimit(key, 1, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect((await rateLimit(key, 1, 1)).allowed).toBe(true);
  });

  it('resetLimit muvaffaqiyatli kirishdan keyin hisobni tozalaydi', async () => {
    const key = `login:${Math.random()}`;

    await rateLimit(key, 1, 60_000);
    expect((await rateLimit(key, 1, 60_000)).allowed).toBe(false);

    await resetLimit(key);
    expect((await rateLimit(key, 1, 60_000)).allowed).toBe(true);
  });
});
