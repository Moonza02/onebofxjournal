import { describe, expect, it } from 'vitest';
import { mailFromAddress } from '../src/lib/mail-address';

describe('mailFromAddress', () => {
  it('burchakli qavs ichidan oladi', () => {
    expect(mailFromAddress('ONEBO FX <bot@onebofx.uz>')).toBe('bot@onebofx.uz');
  });

  it('yalang manzilni ham oladi', () => {
    expect(mailFromAddress('bot@onebofx.uz')).toBe('bot@onebofx.uz');
    expect(mailFromAddress('  BOT@OneboFX.uz  ')).toBe('bot@onebofx.uz');
  });

  // Bu tekshiruv aynan shu holat uchun yozilgan: `MAIL_FROM` da
  // o'rnini bosuvchi manzil qolib ketgandi va Gmail xatni rad etardi.
  it("o'rnini bosuvchi manzilni ham qaytaradi — solishtirish chaqiruvchida", () => {
    expect(mailFromAddress('ONEBO FX <no-reply@example.com>')).toBe('no-reply@example.com');
  });

  it("manzil bo'lmasa null", () => {
    expect(mailFromAddress('ONEBO FX')).toBeNull();
    expect(mailFromAddress('<buzuq>')).toBeNull();
    expect(mailFromAddress('bot@localhost')).toBeNull();
    expect(mailFromAddress('')).toBeNull();
    expect(mailFromAddress(undefined)).toBeNull();
    expect(mailFromAddress(null)).toBeNull();
  });
});
