import { describe, expect, it } from 'vitest';
import { normalizeSite } from '../src/lib/site';

describe('normalizeSite', () => {
  it("to'g'ri manzilni o'zgartirmaydi", () => {
    expect(normalizeSite('https://onebofx.uz')).toBe('https://onebofx.uz');
  });

  it('sxema yozilmagan bo\'lsa https qo\'shadi', () => {
    expect(normalizeSite('onebofx.uz')).toBe('https://onebofx.uz');
    expect(normalizeSite('onebofxjournal-production.up.railway.app')).toBe(
      'https://onebofxjournal-production.up.railway.app',
    );
  });

  it('oxiridagi chiziqlarni va bo\'sh joyni olib tashlaydi', () => {
    expect(normalizeSite('  https://onebofx.uz///  ')).toBe('https://onebofx.uz');
    expect(normalizeSite('https://onebofx.uz/ilova/')).toBe('https://onebofx.uz/ilova');
  });

  it('http ni ham qabul qiladi', () => {
    expect(normalizeSite('http://onebofx.uz')).toBe('http://onebofx.uz');
  });

  it('kompyuterdagi manzillar ishlaydi', () => {
    expect(normalizeSite('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeSite('localhost:3000')).toBe('https://localhost:3000');
  });

  // Asosiy sabab: shu qiymatlardan biri ilgari butun saytni yiqitardi.
  it("o'rnini bosuvchi so'z yoki axlat — null", () => {
    expect(normalizeSite('MANZIL')).toBeNull();
    expect(normalizeSite('bu-yerga-manzil')).toBeNull();
    expect(normalizeSite('https://')).toBeNull();
    expect(normalizeSite('://onebofx.uz')).toBeNull();
  });

  it("bo'sh yoki yo'q qiymat — null", () => {
    expect(normalizeSite('')).toBeNull();
    expect(normalizeSite('   ')).toBeNull();
    expect(normalizeSite(undefined)).toBeNull();
    expect(normalizeSite(null)).toBeNull();
  });

  it('http va https dan boshqa sxema qabul qilinmaydi', () => {
    expect(normalizeSite('ftp://onebofx.uz')).toBeNull();
    expect(normalizeSite('javascript:alert(1)')).toBeNull();
  });
});
