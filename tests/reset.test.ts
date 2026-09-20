import { describe, expect, it } from 'vitest';
import {
  expiryFrom,
  hashToken,
  isUsable,
  looksLikeToken,
  newToken,
  RESET_TTL_MS,
  resetUrl,
  sameHash,
} from '@/lib/reset';

describe('kalit yaratish', () => {
  it('har safar boshqa kalit chiqadi', () => {
    const many = new Set(Array.from({ length: 200 }, () => newToken()));
    expect(many.size).toBe(200);
  });

  it('kalit havolaga qulay ko‘rinishda', () => {
    for (let i = 0; i < 50; i += 1) {
      const token = newToken();
      // base64url: `+`, `/` va `=` bo'lmasligi kerak — aks holda
      // havolada qochirish talab qilinardi.
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(looksLikeToken(token)).toBe(true);
    }
  });
});

describe('looksLikeToken', () => {
  it('yaroqsiz shakllarni bazaga bormasdan rad etadi', () => {
    expect(looksLikeToken('')).toBe(false);
    expect(looksLikeToken('qisqa')).toBe(false);
    expect(looksLikeToken('a'.repeat(31))).toBe(false);
    expect(looksLikeToken('a'.repeat(65))).toBe(false);
    expect(looksLikeToken(`${'a'.repeat(40)}/../../etc`)).toBe(false);
    expect(looksLikeToken(`${'a'.repeat(40)}=`)).toBe(false);
  });
});

describe('xeshlash', () => {
  it('bir xil kalit bir xil xesh beradi', () => {
    const token = newToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('xesh kalitning o‘zini oshkor qilmaydi', () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
  });

  it('bitta belgi farq qilsa ham xesh butunlay boshqa', () => {
    expect(hashToken('abcdefgh')).not.toBe(hashToken('abcdefgi'));
  });

  it('sameHash teng va teng emaslarni ajratadi', () => {
    const a = hashToken('bir');
    expect(sameHash(a, hashToken('bir'))).toBe(true);
    expect(sameHash(a, hashToken('ikki'))).toBe(false);
    // Uzunligi farq qilsa ham yiqilmaydi.
    expect(sameHash(a, 'qisqa')).toBe(false);
  });
});

describe('muddat', () => {
  it('bir soatdan keyin tugaydi', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    expect(expiryFrom(now).getTime() - now.getTime()).toBe(RESET_TTL_MS);
  });

  it('yangi kalit ishlaydi', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    expect(isUsable({ expiresAt: expiryFrom(now), usedAt: null }, now)).toBe(true);
  });

  it('muddati o‘tgani ishlamaydi', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    const later = new Date(now.getTime() + RESET_TTL_MS + 1000);
    expect(isUsable({ expiresAt: expiryFrom(now), usedAt: null }, later)).toBe(false);
  });

  it('ishlatilgani ikkinchi marta ishlamaydi', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    expect(isUsable({ expiresAt: expiryFrom(now), usedAt: now }, now)).toBe(false);
  });

  it('yo‘q kalit ishlamaydi', () => {
    expect(isUsable(null)).toBe(false);
  });
});

describe('havola', () => {
  it('manzilni to‘g‘ri yig‘adi', () => {
    expect(resetUrl('abc', 'https://onebofx.uz')).toBe('https://onebofx.uz/parolni-tiklash/abc');
  });

  it('oxiridagi ortiqcha chiziqni olib tashlaydi', () => {
    expect(resetUrl('abc', 'https://onebofx.uz///')).toBe(
      'https://onebofx.uz/parolni-tiklash/abc',
    );
  });
});
