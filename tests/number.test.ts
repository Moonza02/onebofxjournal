import { describe, expect, it } from 'vitest';
import { parseNumber, toNumber } from '../src/lib/number';

describe('parseNumber', () => {
  it('oddiy sonlar', () => {
    expect(parseNumber('0.25')).toBe(0.25);
    expect(parseNumber('4148')).toBe(4148);
    expect(parseNumber('-12.5')).toBe(-12.5);
    expect(parseNumber(7)).toBe(7);
  });

  // Asosiy xato shu edi: telefon klaviaturasi vergul qo'yadi,
  // server esa Number('0,25') → NaN deb saqlashni rad etardi.
  it('vergul — o‘nlik ajratgich', () => {
    expect(parseNumber('0,25')).toBe(0.25);
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('150,123')).toBe(150.123);
  });

  it('bo‘sh joy — minglik ajratgich', () => {
    expect(parseNumber('100 122')).toBe(100122);
    expect(parseNumber('1 000')).toBe(1000);
    expect(parseNumber("1'000'000")).toBe(1000000);
  });

  it('ikkalasi bor — keyingisi o‘nlik', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
    expect(parseNumber('1,234.56')).toBe(1234.56);
  });

  it('takrorlangan ajratgich — minglik', () => {
    expect(parseNumber('1.234.567')).toBe(1234567);
    expect(parseNumber('1,234,567')).toBe(1234567);
  });

  it('matndan ko‘chirilgan minus', () => {
    expect(parseNumber('−900')).toBe(-900);
  });

  it('o‘qib bo‘lmasa NaN', () => {
    expect(parseNumber('')).toBeNaN();
    expect(parseNumber('   ')).toBeNaN();
    expect(parseNumber('salom')).toBeNaN();
    expect(parseNumber(null)).toBeNaN();
    expect(parseNumber(undefined)).toBeNaN();
    expect(parseNumber(Infinity)).toBeNaN();
  });
});

describe('toNumber', () => {
  it('o‘qib bo‘lmasa tayinlangan qiymat', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber('salom')).toBe(0);
    expect(toNumber('salom', 1)).toBe(1);
  });

  it('o‘qilsa o‘sha son', () => {
    expect(toNumber('0,25')).toBe(0.25);
  });
});
