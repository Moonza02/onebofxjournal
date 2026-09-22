import { describe, expect, it } from 'vitest';
import {
  SWEEP_BATCH,
  sweepDeletedUsers,
  sweepExpiredDemos,
  sweepUnverified,
  type SweepDeps,
} from '@/lib/sweep';
import { DELETION_GRACE_MS, UNVERIFIED_TTL_MS } from '@/lib/verify';

const NOW = new Date(2026, 8, 20, 12, 0, 0);

/** Bazasiz tekshiruv uchun soxta amallar. */
function deps(rows: { id: string }[], failing: string[] = [], cancelled: string[] = []) {
  const calls: { where: Record<string, unknown>; take: number }[] = [];
  const deletedUsers: string[] = [];
  const deletedObjects: string[] = [];
  const errors: { scope: string; id: string }[] = [];

  const fake: SweepDeps = {
    findUsers: async (where, take) => {
      calls.push({ where, take });
      return rows;
    },
    deleteUser: async (id) => {
      if (failing.includes(id)) throw new Error('bo‘lmadi');
      // Bekor qilingan bo'lsa shart to'g'ri kelmaydi — hech narsa o'chmaydi.
      if (cancelled.includes(id)) return false;
      deletedUsers.push(id);
      return true;
    },
    deleteObjects: async (id) => {
      deletedObjects.push(id);
    },
    onError: async (scope, _error, id) => {
      errors.push({ scope, id });
    },
  };

  return { fake, calls, deletedUsers, deletedObjects, errors };
}

describe('sweepDeletedUsers', () => {
  it('muddati kelganlarni o‘chiradi', async () => {
    const d = deps([{ id: 'a' }, { id: 'b' }]);
    const count = await sweepDeletedUsers(NOW, d.fake);

    expect(count).toBe(2);
    expect(d.deletedUsers).toEqual(['a', 'b']);
  });

  it('30 kun oldingi chegarani so‘raydi', async () => {
    const d = deps([]);
    await sweepDeletedUsers(NOW, d.fake);

    const where = d.calls[0].where as { deletionRequestedAt: { lte: Date; not: null } };
    expect(where.deletionRequestedAt.lte.getTime()).toBe(NOW.getTime() - DELETION_GRACE_MS);
    // So'ralmaganlar tegilmasin.
    expect(where.deletionRequestedAt.not).toBeNull();
  });

  it('skrinshotlarni bazadan oldin o‘chiradi', async () => {
    // Tartib muhim: yozuv ketsa, qaysi fayllar kimniki ekani bilinmay qoladi.
    const order: string[] = [];
    const fake: SweepDeps = {
      findUsers: async () => [{ id: 'a' }],
      deleteUser: async () => {
        order.push('db');
        return true;
      },
      deleteObjects: async () => {
        order.push('storage');
      },
      onError: async () => {},
    };

    await sweepDeletedUsers(NOW, fake);
    expect(order).toEqual(['storage', 'db']);
  });

  it('bittasi bo‘lmasa qolganlari to‘xtamaydi', async () => {
    const d = deps([{ id: 'a' }, { id: 'bad' }, { id: 'c' }], ['bad']);
    const count = await sweepDeletedUsers(NOW, d.fake);

    expect(count).toBe(2);
    expect(d.deletedUsers).toEqual(['a', 'c']);
    expect(d.errors).toEqual([{ scope: 'sweep.user', id: 'bad' }]);
  });

  it('ro‘yxat tuzilgandan keyin bekor qilgan odam o‘chmaydi', async () => {
    // Eng qimmat holat: tozalash ro'yxatni oldi, foydalanuvchi shu
    // orada «bekor qilish» ni bosdi. O'chirish paytida shart qayta
    // tekshiriladi, shuning uchun u joyida qoladi.
    const d = deps([{ id: 'a' }, { id: 'bekor' }], [], ['bekor']);
    const count = await sweepDeletedUsers(NOW, d.fake);

    expect(count).toBe(1);
    expect(d.deletedUsers).toEqual(['a']);
    // Bu holat xato emas — jurnalga yozilmaydi.
    expect(d.errors).toEqual([]);
  });

  it('saqlagich javob bermasa yozuv o‘chirilmaydi', async () => {
    // Fayllar qolib, ular kimniki ekani bilinmay qoladigan holatga
    // yo'l qo'ymaymiz: yozuv keyingi urinishga qoladi.
    const failedStorage: string[] = [];
    const fake: SweepDeps = {
      findUsers: async () => [{ id: 'a' }],
      deleteObjects: async () => {
        throw new Error('saqlagich yo‘q');
      },
      deleteUser: async (id) => {
        failedStorage.push(id);
        return true;
      },
      onError: async () => {},
    };

    expect(await sweepDeletedUsers(NOW, fake)).toBe(0);
    expect(failedStorage).toEqual([]);
  });

  it('bir martada chegaradan ortig‘ini so‘ramaydi', async () => {
    const d = deps([]);
    await sweepDeletedUsers(NOW, d.fake);
    expect(d.calls[0].take).toBe(SWEEP_BATCH);
  });

  it('hech kim bo‘lmasa tinch o‘tadi', async () => {
    const d = deps([]);
    expect(await sweepDeletedUsers(NOW, d.fake)).toBe(0);
    expect(d.deletedUsers).toEqual([]);
  });
});

describe('sweepExpiredDemos', () => {
  it('muddati tugagan namuna hisoblarni so‘raydi', async () => {
    const d = deps([{ id: 'demo1' }]);
    const count = await sweepExpiredDemos(NOW, d.fake);

    expect(count).toBe(1);
    const where = d.calls[0].where as { isDemo: boolean; demoExpiresAt: { lt: Date } };
    expect(where.isDemo).toBe(true);
    expect(where.demoExpiresAt.lt).toEqual(NOW);
  });

  it('xatoni o‘z nomi bilan yozadi', async () => {
    const d = deps([{ id: 'bad' }], ['bad']);
    await sweepExpiredDemos(NOW, d.fake);
    expect(d.errors).toEqual([{ scope: 'sweep.demo', id: 'bad' }]);
  });
});

describe('xavfsizlik', () => {
  it('o‘chirish so‘ralmagan hisob shartga tushmaydi', async () => {
    // Shart `not: null` bo'lmasa, sanasi yo'q hamma hisob "muddati
    // kelgan" bo'lib qolardi — eng qimmat xato shu bo'lardi.
    const d = deps([]);
    await sweepDeletedUsers(NOW, d.fake);
    expect(JSON.stringify(d.calls[0].where)).toContain('"not":null');
  });

  it('kelajakdagi sana hali tegilmaydi', async () => {
    const d = deps([]);
    await sweepDeletedUsers(NOW, d.fake);
    const where = d.calls[0].where as { deletionRequestedAt: { lte: Date } };
    // Bugun so'ragan odam bugun o'chib ketmasligi kerak.
    expect(where.deletionRequestedAt.lte.getTime()).toBeLessThan(NOW.getTime());
  });
});

describe('sweepUnverified', () => {
  it('tasdiqlanmaganlarni o‘chiradi', async () => {
    const d = deps([{ id: 'a' }, { id: 'b' }]);
    const count = await sweepUnverified(NOW, d.fake);

    expect(count).toBe(2);
    expect(d.deletedUsers).toEqual(['a', 'b']);
  });

  it('7 kunlik chegarani va faqat tasdiqlanmaganlarni so‘raydi', async () => {
    const d = deps([]);
    await sweepUnverified(NOW, d.fake);

    const where = d.calls[0].where as {
      emailVerifiedAt: null;
      isDemo: boolean;
      createdAt: { lt: Date };
    };

    expect(where.emailVerifiedAt).toBeNull();
    expect(where.createdAt.lt.getTime()).toBe(NOW.getTime() - UNVERIFIED_TTL_MS);
    // Namuna hisoblar bu yerga tushmasligi kerak: ularning manzili
    // o'ylab topilgan va hech qachon tasdiqlanmaydi.
    expect(where.isDemo).toBe(false);
  });

  it('o‘chirish paytida tasdiqlangan bo‘lsa — tegilmaydi', async () => {
    // Shart qayta qo'yiladi: ro'yxat tuzilgandan keyin odam havolani
    // bosgan bo'lishi mumkin.
    const d = deps([{ id: 'a' }, { id: 'b' }], [], ['a']);
    const count = await sweepUnverified(NOW, d.fake);

    expect(count).toBe(1);
    expect(d.deletedUsers).toEqual(['b']);
  });
});
