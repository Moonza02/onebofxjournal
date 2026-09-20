import { describe, expect, it } from 'vitest';
import {
  accountId,
  ACCOUNT_FIELD,
  amount,
  checkAuth,
  checkOk,
  checkoutUrl,
  confirmed,
  created,
  failed,
  isMethod,
  reversed,
  sameService,
  statusFor,
  statusOf,
  transId,
  UZUM_ERROR,
  UZUM_STATUS,
  type UzumRequest,
} from '@/lib/uzum';

const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`, 'utf8').toString('base64')}`;

function body(over: Partial<UzumRequest> = {}): UzumRequest {
  return {
    serviceId: 777,
    timestamp: 1758000000000,
    transId: 'tx-1',
    amount: 9_900_000,
    params: { [ACCOUNT_FIELD]: 'pay-1' },
    ...over,
  };
}

describe('metod nomi', () => {
  it('faqat beshta metod qabul qilinadi', () => {
    for (const method of ['check', 'create', 'confirm', 'reverse', 'status']) {
      expect(isMethod(method)).toBe(true);
    }
    expect(isMethod('perform')).toBe(false);
    expect(isMethod('')).toBe(false);
    // Katta harf bilan ham o'tmasin — yo'l aynan mos kelishi kerak.
    expect(isMethod('Check')).toBe(false);
  });
});

describe('so‘rovni o‘qish', () => {
  it('hisob id si params dan olinadi', () => {
    expect(accountId(body())).toBe('pay-1');
    expect(accountId(body({ params: {} }))).toBeNull();
    expect(accountId(body({ params: { [ACCOUNT_FIELD]: '' } }))).toBeNull();
    expect(accountId(body({ params: { [ACCOUNT_FIELD]: 42 } }))).toBeNull();
  });

  it('tranzaksiya id si matn bo‘lishi kerak', () => {
    expect(transId(body())).toBe('tx-1');
    expect(transId(body({ transId: 12345 }))).toBeNull();
    expect(transId(body({ transId: '' }))).toBeNull();
  });

  it('summa butun va musbat tiyinda bo‘lishi kerak', () => {
    expect(amount(body())).toBe(9_900_000);
    expect(amount(body({ amount: 0 }))).toBeNull();
    expect(amount(body({ amount: -100 }))).toBeNull();
    // Kasr tiyin bo‘lmaydi — yaxlitlanib pul yo‘qolmasin.
    expect(amount(body({ amount: 990.5 }))).toBeNull();
    expect(amount(body({ amount: '9900000' }))).toBeNull();
  });

  it('serviceId solishtiriladi, tip farq qilmaydi', () => {
    expect(sameService(body(), '777')).toBe(true);
    expect(sameService(body({ serviceId: '777' }), '777')).toBe(true);
    expect(sameService(body(), '778')).toBe(false);
    // Sozlama berilmagan bo'lsa hech kim o'tmaydi.
    expect(sameService(body(), undefined)).toBe(false);
  });
});

describe('Basic auth', () => {
  it('to‘g‘ri juftlikni qabul qiladi', () => {
    expect(checkAuth(basic('shop', 'secret'), 'shop', 'secret')).toBe(true);
  });

  it('noto‘g‘ri login yoki parolni rad etadi', () => {
    expect(checkAuth(basic('shop', 'boshqa'), 'shop', 'secret')).toBe(false);
    expect(checkAuth(basic('kim', 'secret'), 'shop', 'secret')).toBe(false);
  });

  it('sarlavha bo‘lmasa yoki shakli boshqa bo‘lsa rad etadi', () => {
    expect(checkAuth(null, 'shop', 'secret')).toBe(false);
    expect(checkAuth('Bearer abc', 'shop', 'secret')).toBe(false);
    expect(checkAuth('Basic $$$', 'shop', 'secret')).toBe(false);
    expect(checkAuth(basic('shop', 'secret'), 'shop', '')).toBe(false);
  });

  it('sozlama to‘liq bo‘lmasa hech kim o‘tmaydi', () => {
    expect(checkAuth(basic('shop', 'secret'), undefined, 'secret')).toBe(false);
    expect(checkAuth(basic('shop', 'secret'), 'shop', undefined)).toBe(false);
  });
});

describe('javob shakllari', () => {
  it('xato javobida holat FAILED va kod bo‘ladi', () => {
    const response = failed(777, UZUM_ERROR.ACCOUNT_NOT_FOUND);
    expect(response.status).toBe(UZUM_STATUS.FAILED);
    expect(response.errorCode).toBe(10007);
    expect(response.serviceId).toBe(777);
    expect(typeof response.timestamp).toBe('number');
  });

  it('check javobi hisobni qaytaradi', () => {
    const response = checkOk(777, 'pay-1');
    expect(response.status).toBe(UZUM_STATUS.OK);
    expect(response.data).toEqual({ account: { value: 'pay-1' } });
  });

  it('create javobida transId va summa bo‘ladi', () => {
    const response = created(777, 'tx-1', 9_900_000);
    expect(response.status).toBe(UZUM_STATUS.CREATED);
    expect(response.transId).toBe('tx-1');
    expect(response.amount).toBe(9_900_000);
    expect(typeof response.transTime).toBe('number');
  });

  it('confirm va reverse javoblari o‘z vaqtini beradi', () => {
    expect(confirmed(777, 'tx-1').status).toBe(UZUM_STATUS.CONFIRMED);
    expect(typeof confirmed(777, 'tx-1').confirmTime).toBe('number');

    const back = reversed(777, 'tx-1', 500);
    expect(back.status).toBe(UZUM_STATUS.REVERSED);
    expect(back.amount).toBe(500);
    expect(typeof back.reverseTime).toBe('number');
  });

  it('status javobi berilgan holatni qaytaradi', () => {
    expect(statusOf(777, 'tx-1', UZUM_STATUS.CONFIRMED).status).toBe('CONFIRMED');
  });
});

describe('holatni o‘girish', () => {
  it('bizdagi holat Uzum tiliga mos tushadi', () => {
    expect(statusFor({ status: 'PAID' })).toBe(UZUM_STATUS.CONFIRMED);
    expect(statusFor({ status: 'CANCELLED' })).toBe(UZUM_STATUS.REVERSED);
    expect(statusFor({ status: 'PENDING' })).toBe(UZUM_STATUS.CREATED);
  });
});

describe('checkout havolasi', () => {
  it('namunadagi o‘rinlarni to‘ldiradi', () => {
    const url = checkoutUrl(
      'https://pay.example/uz?service=777&account={payment_id}&amount={amount}',
      'pay-1',
      9_900_000,
    );
    expect(url).toBe('https://pay.example/uz?service=777&account=pay-1&amount=9900000');
  });

  it('id ni URL uchun xavfsiz qiladi', () => {
    expect(checkoutUrl('https://x/{payment_id}', 'a b&c', 1)).toBe('https://x/a%20b%26c');
  });

  it('bir nechta o‘rinni ham to‘ldiradi', () => {
    expect(checkoutUrl('{amount}-{amount}', 'x', 5)).toBe('5-5');
  });
});
