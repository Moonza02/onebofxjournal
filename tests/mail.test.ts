import { describe, expect, it } from 'vitest';
import { pickMail } from '@/lib/mail-config';
import { brevoPayload, brevoSender } from '@/lib/mail-brevo';

const SMTP = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_USER: 'bot@onebofx.uz',
  SMTP_PASS: 'abcdefghijklmnop',
};

describe('pickMail', () => {
  it('hech narsa sozlanmagan — null', () => {
    expect(pickMail({})).toBeNull();
  });

  it("bo'sh qiymat yo'q bilan barobar", () => {
    // Railway'da o'zgaruvchi ro'yxatda turib, ichi bo'sh bo'lishi mumkin.
    expect(pickMail({ ...SMTP, SMTP_PASS: '   ' })).toBeNull();
  });

  it('faqat SMTP bor — SMTP tanlanadi', () => {
    const config = pickMail(SMTP);
    expect(config).toEqual({
      kind: 'smtp',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: 'bot@onebofx.uz',
      pass: 'abcdefghijklmnop',
      from: 'ONEBO FX <bot@onebofx.uz>',
    });
  });

  it('465 — to‘g‘ridan-to‘g‘ri TLS', () => {
    const config = pickMail({ ...SMTP, SMTP_PORT: '465' });
    expect(config).toMatchObject({ kind: 'smtp', port: 465, secure: true });
  });

  it('buzuq port — 587 ga qaytadi', () => {
    expect(pickMail({ ...SMTP, SMTP_PORT: 'salom' })).toMatchObject({ port: 587 });
  });

  // Eng muhim qoida: bulutda SMTP portlari yopiq, shuning uchun
  // ikkalasi sozlangan bo'lsa ishlaydigani tanlanishi kerak.
  it('ikkalasi bor — HTTPS ustun', () => {
    const config = pickMail({ ...SMTP, BREVO_API_KEY: 'xkeysib-123' });
    expect(config).toEqual({
      kind: 'brevo',
      apiKey: 'xkeysib-123',
      from: 'ONEBO FX <bot@onebofx.uz>',
    });
  });

  it('MAIL_FROM berilsa o‘sha ishlatiladi', () => {
    const config = pickMail({
      BREVO_API_KEY: 'xkeysib-123',
      MAIL_FROM: 'ONEBO FX <xat@onebofx.uz>',
    });
    expect(config).toEqual({
      kind: 'brevo',
      apiKey: 'xkeysib-123',
      from: 'ONEBO FX <xat@onebofx.uz>',
    });
  });

  it('kalit bor, jo‘natuvchi yo‘q — HTTPS tanlanmaydi', () => {
    // Manzilsiz jo'natib bo'lmaydi, shuning uchun bu sozlama emas.
    expect(pickMail({ BREVO_API_KEY: 'xkeysib-123' })).toBeNull();
  });
});

describe('brevoSender', () => {
  it('nom va manzilni ajratadi', () => {
    expect(brevoSender('ONEBO FX <bot@onebofx.uz>')).toEqual({
      name: 'ONEBO FX',
      email: 'bot@onebofx.uz',
    });
  });

  it('yalang manzil — nomsiz', () => {
    expect(brevoSender('bot@onebofx.uz')).toEqual({ email: 'bot@onebofx.uz' });
  });

  it('qo‘shtirnoqli nom tozalanadi', () => {
    expect(brevoSender('"ONEBO FX" <bot@onebofx.uz>')).toEqual({
      name: 'ONEBO FX',
      email: 'bot@onebofx.uz',
    });
  });

  it('manzil yo‘q — null', () => {
    expect(brevoSender('ONEBO FX')).toBeNull();
  });
});

describe('brevoPayload', () => {
  const base = { to: 'ibrohim@example.com', subject: 'Kod', text: '931204' };

  it('eng kam maydonlar', () => {
    expect(brevoPayload(base, 'ONEBO FX <bot@onebofx.uz>')).toEqual({
      sender: { name: 'ONEBO FX', email: 'bot@onebofx.uz' },
      to: [{ email: 'ibrohim@example.com' }],
      subject: 'Kod',
      textContent: '931204',
    });
  });

  it('html berilsa qo‘shiladi', () => {
    const payload = brevoPayload({ ...base, html: '<b>931204</b>' }, 'bot@onebofx.uz');
    expect(payload?.htmlContent).toBe('<b>931204</b>');
  });

  it('ilova base64 ga o‘tadi', () => {
    const payload = brevoPayload(
      { ...base, attachments: [{ filename: 'hisobot.pdf', content: Buffer.from('salom') }] },
      'bot@onebofx.uz',
    );
    expect(payload?.attachment).toEqual([
      { name: 'hisobot.pdf', content: Buffer.from('salom').toString('base64') },
    ]);
  });

  it('jo‘natuvchi yaroqsiz — null', () => {
    expect(brevoPayload(base, 'ONEBO FX')).toBeNull();
  });
});
