import { describe, expect, it } from 'vitest';
import {
  DELETION_GRACE_DAYS,
  daysUntilDeletion,
  deletionDue,
  deletionDueAt,
  needsVerification,
  VERIFY_TTL_MS,
  verificationUsable,
  verifyExpiry,
  verifyUrl,
} from '@/lib/verify';

const NOW = new Date(2026, 8, 20, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function row(over: Partial<{ email: string; expiresAt: Date; usedAt: Date | null }> = {}) {
  return {
    email: 'ibrohim@example.com',
    expiresAt: new Date(NOW.getTime() + HOUR),
    usedAt: null,
    ...over,
  };
}

/* ------------------------------------------------------------ tasdiqlash */

describe('verifyExpiry', () => {
  it('sutkalik muddat beradi', () => {
    expect(verifyExpiry(NOW).getTime() - NOW.getTime()).toBe(VERIFY_TTL_MS);
    expect(VERIFY_TTL_MS).toBe(DAY);
  });
});

describe('verifyUrl', () => {
  it('to‘liq havola tuzadi', () => {
    expect(verifyUrl('abc', 'https://onebo.uz')).toBe('https://onebo.uz/tasdiqlash/abc');
  });

  it('oxiridagi chiziqchani takrorlamaydi', () => {
    expect(verifyUrl('abc', 'https://onebo.uz/')).toBe('https://onebo.uz/tasdiqlash/abc');
  });

  it('manzil berilmasa nisbiy yo‘l', () => {
    expect(verifyUrl('abc', undefined)).toBe('/tasdiqlash/abc');
  });
});

describe('verificationUsable', () => {
  it('yangi kalit ishlaydi', () => {
    expect(verificationUsable(row(), 'ibrohim@example.com', NOW)).toBe(true);
  });

  it('yo‘q kalit ishlamaydi', () => {
    expect(verificationUsable(null, 'ibrohim@example.com', NOW)).toBe(false);
  });

  it('ishlatilgan kalit ishlamaydi', () => {
    expect(verificationUsable(row({ usedAt: NOW }), 'ibrohim@example.com', NOW)).toBe(false);
  });

  it('muddati o‘tgan kalit ishlamaydi', () => {
    const old = row({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(verificationUsable(old, 'ibrohim@example.com', NOW)).toBe(false);
  });

  it('manzil o‘zgargan bo‘lsa ishlamaydi', () => {
    // Eng muhim holat: kalit eski manzil uchun berilgan, foydalanuvchi
    // esa manzilini almashtirgan — eski kalit yangisini tasdiqlamasin.
    expect(verificationUsable(row(), 'yangi@example.com', NOW)).toBe(false);
  });

  it('manzil katta-kichik harfda farq qilmaydi', () => {
    expect(verificationUsable(row(), 'Ibrohim@Example.com', NOW)).toBe(true);
  });
});

describe('needsVerification', () => {
  it('tasdiqlanmagan hisob hisobot jo‘nata olmaydi', () => {
    expect(needsVerification('weeklyReport', { emailVerifiedAt: null })).toBe(true);
  });

  it('tasdiqlangan hisob jo‘nata oladi', () => {
    expect(needsVerification('weeklyReport', { emailVerifiedAt: NOW })).toBe(false);
  });

  it('namuna hisobdan tasdiqlash so‘ralmaydi', () => {
    // Manzili o'ylab topilgan — tasdiqlab bo'lmaydi, shuning uchun
    // to'sib qo'yish ham ma'nosiz. (Boshqa joyda demo alohida rad etiladi.)
    expect(needsVerification('weeklyReport', { emailVerifiedAt: null, isDemo: true })).toBe(false);
  });
});

/* -------------------------------------------------------------- o'chirish */

describe('deletionDueAt', () => {
  it('30 kun qo‘shadi', () => {
    expect(DELETION_GRACE_DAYS).toBe(30);
    const due = deletionDueAt(NOW);
    expect(due.getTime() - NOW.getTime()).toBe(30 * DAY);
  });
});

describe('daysUntilDeletion', () => {
  it('so‘ralgan kuni 30 kun qoladi', () => {
    expect(daysUntilDeletion(NOW, NOW)).toBe(30);
  });

  it('kunlar o‘tgani sari kamayadi', () => {
    expect(daysUntilDeletion(NOW, new Date(NOW.getTime() + 10 * DAY))).toBe(20);
  });

  it('bir necha soat qolganda ham 1 deydi, 0 emas', () => {
    // Yuqoriga yaxlitlash: hisob hali turibdi, "0 kun" deb qo'rqitmaymiz.
    const almost = new Date(NOW.getTime() + 30 * DAY - 3 * HOUR);
    expect(daysUntilDeletion(NOW, almost)).toBe(1);
  });

  it('muddat kelganda 0', () => {
    expect(daysUntilDeletion(NOW, new Date(NOW.getTime() + 30 * DAY))).toBe(0);
    expect(daysUntilDeletion(NOW, new Date(NOW.getTime() + 40 * DAY))).toBe(0);
  });
});

describe('deletionDue', () => {
  it('so‘ralmagan bo‘lsa — yo‘q', () => {
    expect(deletionDue(null, NOW)).toBe(false);
  });

  it('muddat ichida — yo‘q', () => {
    expect(deletionDue(NOW, new Date(NOW.getTime() + 29 * DAY))).toBe(false);
  });

  it('muddat tugaganda — ha', () => {
    expect(deletionDue(NOW, new Date(NOW.getTime() + 30 * DAY))).toBe(true);
  });

  it('bir kun oldin ham — yo‘q', () => {
    const justBefore = new Date(NOW.getTime() + 30 * DAY - 1);
    expect(deletionDue(NOW, justBefore)).toBe(false);
  });
});
