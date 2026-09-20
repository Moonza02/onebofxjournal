import { describe, expect, it } from 'vitest';
import {
  activePlan,
  extendUntil,
  firstPlanWith,
  has,
  limits,
  PERIODS,
  PLANS,
  priceFor,
  savingFor,
  sum,
} from '@/lib/billing';

describe('priceFor', () => {
  it('bir oy uchun tarif narxining o‘zi', () => {
    expect(priceFor('PRO', 1)).toBe(PLANS.PRO.monthly);
  });

  it('uzoq muddatda chegirma qo‘llanadi', () => {
    // 12 oy, 17% chegirma: 99 000 × 12 × 0.83 = 986 040 so'm.
    expect(priceFor('PRO', 12)).toBe(98_604_000);
  });

  it('natija butun so‘mga yaxlitlanadi — tiyin qolmaydi', () => {
    for (const period of PERIODS) {
      expect(priceFor('PRO', period.months) % 100).toBe(0);
      expect(priceFor('MENTOR', period.months) % 100).toBe(0);
    }
  });

  it('uzoq muddat bir oyga hisoblaganda arzonroq tushadi', () => {
    const one = priceFor('PRO', 1);
    const year = priceFor('PRO', 12) / 12;
    expect(year).toBeLessThan(one);
  });

  it('bepul tarif va noma’lum muddat uchun nol', () => {
    expect(priceFor('FREE', 1)).toBe(0);
    expect(priceFor('PRO', 7)).toBe(0);
    expect(priceFor('PRO', 0)).toBe(0);
  });
});

describe('savingFor', () => {
  it('chegirmasiz muddatda tejash yo‘q', () => {
    expect(savingFor('PRO', 1)).toBe(0);
  });

  it('yillik tarifda ikki oyga yaqin tejaladi', () => {
    const saved = savingFor('PRO', 12);
    expect(saved).toBeGreaterThan(PLANS.PRO.monthly * 1.9);
    expect(saved).toBeLessThan(PLANS.PRO.monthly * 2.1);
  });
});

describe('sum', () => {
  it('tiyinni so‘mga o‘girib, uch xonadan ajratadi', () => {
    expect(sum(9_900_000, 'so‘m')).toBe('99 000 so‘m');
    expect(sum(0, 'сум')).toBe('0 сум');
  });
});

describe('activePlan', () => {
  const now = new Date('2026-09-20T00:00:00Z');
  const future = new Date('2026-10-20T00:00:00Z');
  const past = new Date('2026-09-10T00:00:00Z');

  it('muddati o‘tmagan tarif amalda', () => {
    const active = activePlan({ plan: 'PRO', planUntil: future, trialEndsAt: null }, now);
    expect(active.plan).toBe('PRO');
    expect(active.trial).toBe(false);
    expect(active.daysLeft).toBe(30);
  });

  it('muddati tugagan tarif bepulga tushadi', () => {
    const active = activePlan({ plan: 'PRO', planUntil: past, trialEndsAt: null }, now);
    expect(active.plan).toBe('FREE');
    expect(active.daysLeft).toBeNull();
  });

  it('sinov muddati Pro beradi', () => {
    const active = activePlan({ plan: 'FREE', planUntil: null, trialEndsAt: future }, now);
    expect(active.plan).toBe('PRO');
    expect(active.trial).toBe(true);
  });

  it('sinov tugagach bepul', () => {
    const active = activePlan({ plan: 'FREE', planUntil: null, trialEndsAt: past }, now);
    expect(active.plan).toBe('FREE');
    expect(active.trial).toBe(false);
  });

  it('to‘langan tarif sinovdan ustun', () => {
    const active = activePlan(
      { plan: 'MENTOR', planUntil: future, trialEndsAt: future },
      now,
    );
    expect(active.plan).toBe('MENTOR');
    expect(active.trial).toBe(false);
  });

  it('muddat aynan hozir tugasa amalda emas', () => {
    const active = activePlan({ plan: 'PRO', planUntil: now, trialEndsAt: null }, now);
    expect(active.plan).toBe('FREE');
  });
});

describe('extendUntil', () => {
  const now = new Date('2026-09-20T00:00:00Z');

  it('o‘sha tarif uzaytirilsa qolgan muddat yo‘qolmaydi', () => {
    const until = new Date('2026-10-20T00:00:00Z');
    const next = extendUntil({ plan: 'PRO', planUntil: until }, 'PRO', 1, now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-11-20');
  });

  it('muddati tugagan bo‘lsa hozirdan boshlanadi', () => {
    const until = new Date('2026-09-01T00:00:00Z');
    const next = extendUntil({ plan: 'PRO', planUntil: until }, 'PRO', 1, now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-10-20');
  });

  it('boshqa tarifga o‘tilsa hozirdan boshlanadi', () => {
    const until = new Date('2026-12-20T00:00:00Z');
    const next = extendUntil({ plan: 'PRO', planUntil: until }, 'MENTOR', 1, now);
    expect(next.toISOString().slice(0, 10)).toBe('2026-10-20');
  });

  it('oy oxiridan qo‘shilganda keyingi oyga sakrab ketmaydi', () => {
    // 31-yanvar + 1 oy → 28-fevral, 3-mart emas.
    const jan31 = new Date('2027-01-31T00:00:00Z');
    const next = extendUntil({ plan: 'PRO', planUntil: null }, 'PRO', 1, jan31);
    expect(next.getMonth()).toBe(1);
  });

  it('o‘n ikki oy bir yil beradi', () => {
    const next = extendUntil({ plan: 'PRO', planUntil: null }, 'PRO', 12, now);
    expect(next.getFullYear()).toBe(2027);
  });
});

describe('ruxsatlar', () => {
  it('bepul tarifda qo‘shimcha bo‘limlar yopiq', () => {
    expect(has('FREE', 'coach')).toBe(false);
    expect(has('FREE', 'report')).toBe(false);
    expect(has('FREE', 'analytics')).toBe(false);
    expect(has('FREE', 'mentor')).toBe(false);
  });

  it('Pro da hammasi ochiq', () => {
    for (const feature of PLANS.PRO.features) expect(has('PRO', feature)).toBe(true);
  });

  it('chegaralar tarifga qarab o‘sadi', () => {
    expect(limits('FREE').accounts).toBeLessThan(limits('PRO').accounts);
    expect(limits('PRO').students).toBeLessThan(limits('MENTOR').students);
    expect(limits('FREE').tradesPerMonth).toBeLessThan(limits('PRO').tradesPerMonth);
  });

  it('imkoniyat eng arzon tarifdan boshlab qidiriladi', () => {
    expect(firstPlanWith('coach')).toBe('PRO');
    expect(firstPlanWith('report')).toBe('PRO');
  });
});
