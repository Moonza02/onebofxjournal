import { describe, expect, it } from 'vitest';
import {
  DELETION_GRACE_DAYS,
  daysUntilDeletion,
  deletionDue,
  deletionDueAt,
  needsVerification,
  UNVERIFIED_TTL_DAYS,
  UNVERIFIED_TTL_MS,
  unverifiedCutoff,
  VERIFY_TTL_MS,
  verificationUsable,
  verifyExpiry,
  cleanCode,
  looksLikeCode,
  MAX_CODE_ATTEMPTS,
} from '@/lib/verify';

const NOW = new Date(2026, 8, 20, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function row(
  over: Partial<{ email: string; expiresAt: Date; usedAt: Date | null; attempts: number }> = {},
) {
  return {
    email: 'ibrohim@example.com',
    // Kod 15 daqiqa yashaydi, shuning uchun sinovda ham shundan ichkari.
    expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
    usedAt: null,
    attempts: 0,
    ...over,
  };
}

/* ------------------------------------------------------------ tasdiqlash */

describe('verifyExpiry', () => {
  it('o‘n besh daqiqalik muddat beradi', () => {
    // Kod olti xonali, ya'ni taxmin qilinishi mumkin — muddat qisqa.
    expect(verifyExpiry(NOW).getTime()).toBe(NOW.getTime() + 15 * 60 * 1000);
    expect(VERIFY_TTL_MS).toBe(15 * 60 * 1000);
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

  it('urinishlar tugagan kod ishlamaydi', () => {
    // Asosiy himoya: olti xonali kodni taxmin qilib bo'lmasin.
    const burned = row({ attempts: MAX_CODE_ATTEMPTS });
    expect(verificationUsable(burned, 'ibrohim@example.com', NOW)).toBe(false);
  });

  it('oxirgi urinish hali ishlaydi', () => {
    const last = row({ attempts: MAX_CODE_ATTEMPTS - 1 });
    expect(verificationUsable(last, 'ibrohim@example.com', NOW)).toBe(true);
  });
});

describe('looksLikeCode', () => {
  it('olti xonali raqam', () => {
    expect(looksLikeCode('000000')).toBe(true);
    expect(looksLikeCode('931204')).toBe(true);
  });

  it('boshqasi emas', () => {
    expect(looksLikeCode('12345')).toBe(false);
    expect(looksLikeCode('1234567')).toBe(false);
    expect(looksLikeCode('12a456')).toBe(false);
    expect(looksLikeCode('')).toBe(false);
  });
});

describe('cleanCode', () => {
  it('pochtadan nusxa olinganda qo‘shilib keladigan narsalarni tozalaydi', () => {
    expect(cleanCode(' 931 204 ')).toBe('931204');
    expect(cleanCode('931-204')).toBe('931204');
    expect(cleanCode('kod: 931204')).toBe('931204');
  });

  it('ortiqchasini kesadi', () => {
    expect(cleanCode('9312049999')).toBe('931204');
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

describe('unverifiedCutoff', () => {
  const NOW = new Date(2026, 8, 20, 12, 0, 0);

  it('bir hafta oldingi vaqtni qaytaradi', () => {
    expect(unverifiedCutoff(NOW).getTime()).toBe(NOW.getTime() - UNVERIFIED_TTL_MS);
    expect(UNVERIFIED_TTL_DAYS).toBe(7);
  });

  it('chegara tasdiqlash havolasining muddatidan uzun', () => {
    // Aks holda havola hali amal qilib turganda hisob o'chib ketardi.
    expect(UNVERIFIED_TTL_MS).toBeGreaterThan(VERIFY_TTL_MS);
  });
});
