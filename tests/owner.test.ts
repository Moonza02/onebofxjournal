import { describe, expect, it } from 'vitest';
import { giftEmails, isGift, isOwner, ownerEmails } from '../src/lib/owner';
import { activePlan, has, limits, PLAN_ORDER, PLANS, priceFor } from '../src/lib/billing';

describe('ownerEmails', () => {
  it("qo'yilmagan — bo'sh", () => {
    expect(ownerEmails({}).size).toBe(0);
    expect(ownerEmails({ OWNER_EMAILS: '   ' }).size).toBe(0);
  });

  it('vergul, nuqta-vergul va bo‘sh joy bilan ajraladi', () => {
    const set = ownerEmails({ OWNER_EMAILS: 'a@b.uz, c@d.uz;  e@f.uz' });
    expect([...set].sort()).toEqual(['a@b.uz', 'c@d.uz', 'e@f.uz']);
  });

  it('manzilga o‘xshamagan bo‘lak tashlanadi', () => {
    expect([...ownerEmails({ OWNER_EMAILS: 'ibrohim, a@b.uz' })]).toEqual(['a@b.uz']);
  });
});

describe('isOwner', () => {
  const env = { OWNER_EMAILS: 'Moonza@ONEBOFX.uz' };

  it('katta-kichik harf farq qilmaydi', () => {
    expect(isOwner('moonza@onebofx.uz', env)).toBe(true);
    expect(isOwner('  MOONZA@OneboFX.UZ  ', env)).toBe(true);
  });

  it('boshqa manzil — yo‘q', () => {
    expect(isOwner('kimdir@onebofx.uz', env)).toBe(false);
  });

  it('manzil yo‘q — yo‘q', () => {
    expect(isOwner(null, env)).toBe(false);
    expect(isOwner('', env)).toBe(false);
  });

  // Eng muhim standart: sozlanmagan tizimda hech kim ega emas.
  it('sozlanmagan — hech kim ega emas', () => {
    expect(isOwner('moonza@onebofx.uz', {})).toBe(false);
  });
});

describe('OWNER tarifi', () => {
  const sub = { plan: 'FREE' as const, planUntil: null, trialEndsAt: null };

  it('ega — muddat ham, to‘lov ham tekshirilmaydi', () => {
    expect(activePlan(sub, new Date(), 'OWNER')).toEqual({
      plan: 'OWNER',
      trial: false,
      daysLeft: null,
      until: null,
    });
  });

  it('ega emas — odatdagidek bepulga tushadi', () => {
    expect(activePlan(sub, new Date(), null).plan).toBe('FREE');
  });

  // Muddati tugagan to'lov ham egaga ta'sir qilmaydi.
  it('muddati tugagan Pro ustidan yopadi', () => {
    const expired = {
      plan: 'PRO' as const,
      planUntil: new Date('2020-01-01'),
      trialEndsAt: null,
    };
    expect(activePlan(expired, new Date(), 'OWNER').plan).toBe('OWNER');
  });

  it('hamma imkoniyat ochiq', () => {
    for (const feature of PLANS.MENTOR.features) {
      expect(has('OWNER', feature)).toBe(true);
    }
  });

  it('limitlar cheksiz', () => {
    expect(limits('OWNER')).toEqual({
      accounts: Infinity,
      tradesPerMonth: Infinity,
      students: Infinity,
    });
  });

  // Sotuvda yo'q: narx sahifasi PLAN_ORDER bo'yicha chiziladi.
  it('sotuvdagi tariflar qatorida yo‘q', () => {
    expect(PLAN_ORDER).not.toContain('OWNER');
  });

  it('narxi yo‘q', () => {
    expect(priceFor('OWNER', 12)).toBe(0);
  });
});

describe('GIFT tarifi', () => {
  const sub = { plan: 'FREE' as const, planUntil: null, trialEndsAt: null };
  const env = { GIFT_EMAILS: 'Nurillo@Example.uz' };

  it('ro‘yxatdagi manzil sovg‘a oladi', () => {
    expect(isGift('nurillo@example.uz', env)).toBe(true);
    expect(isGift('kimdir@example.uz', env)).toBe(false);
  });

  it('sozlanmagan — hech kimga sovg‘a yo‘q', () => {
    expect(giftEmails({}).size).toBe(0);
    expect(isGift('nurillo@example.uz', {})).toBe(false);
  });

  it('muddat ham, to‘lov ham tekshirilmaydi', () => {
    expect(activePlan(sub, new Date(), 'GIFT')).toEqual({
      plan: 'GIFT',
      trial: false,
      daysLeft: null,
      until: null,
    });
  });

  it('Mentor darajasidagi hamma imkoniyat ochiq', () => {
    for (const feature of PLANS.MENTOR.features) {
      expect(has('GIFT', feature)).toBe(true);
    }
    expect(limits('GIFT')).toEqual(PLANS.MENTOR.limits);
  });

  // Eng muhim shart: sovg‘a pul hisobotlariga tegmaydi.
  it('sotuvda yo‘q va narxi yo‘q', () => {
    expect(PLAN_ORDER).not.toContain('GIFT');
    expect(priceFor('GIFT', 12)).toBe(0);
  });
});
