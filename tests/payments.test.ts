import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ACTION,
  checkSign,
  ERROR as CLICK_ERROR,
  reply,
  signString,
  toSoum,
  toTiyin,
  checkoutUrl as clickCheckout,
} from '@/lib/click';
import {
  accountId,
  ACCOUNT_FIELD,
  checkAuth,
  checkoutUrl as paymeCheckout,
  ERROR as PAYME_ERROR,
  errorBody,
  ms,
  rpcError,
  STATE,
} from '@/lib/payme';

const SECRET = 'maxfiy-kalit';

function prepareBody(over: Record<string, string> = {}) {
  return {
    click_trans_id: '123456',
    service_id: '777',
    click_paydoc_id: '999',
    merchant_trans_id: 'pay_abc',
    amount: '99000.00',
    action: String(ACTION.PREPARE),
    error: '0',
    error_note: 'Success',
    sign_time: '2026-09-20 10:00:00',
    sign_string: '',
    ...over,
  };
}

function completeBody(over: Record<string, string> = {}) {
  return prepareBody({
    action: String(ACTION.COMPLETE),
    merchant_prepare_id: 'pay_abc',
    ...over,
  });
}

describe('Click imzosi', () => {
  it('Prepare uchun tartib hujjatdagidek', () => {
    const body = prepareBody();
    // click_trans_id + service_id + KALIT + merchant_trans_id + amount + action + sign_time
    const expected = createHash('md5')
      .update('123456' + '777' + SECRET + 'pay_abc' + '99000.00' + '0' + '2026-09-20 10:00:00')
      .digest('hex');

    expect(signString(body, SECRET)).toBe(expected);
  });

  it('Complete da merchant_prepare_id qo‘shiladi', () => {
    const body = completeBody();
    const expected = createHash('md5')
      .update(
        '123456' + '777' + SECRET + 'pay_abc' + 'pay_abc' + '99000.00' + '1' + '2026-09-20 10:00:00',
      )
      .digest('hex');

    expect(signString(body, SECRET)).toBe(expected);
  });

  it('Prepare va Complete imzolari bir xil emas', () => {
    expect(signString(prepareBody(), SECRET)).not.toBe(signString(completeBody(), SECRET));
  });

  it('to‘g‘ri imzo qabul qilinadi', () => {
    const body = prepareBody();
    body.sign_string = signString(body, SECRET);
    expect(checkSign(body, SECRET)).toBe(true);
  });

  it('katta harfdagi imzo ham qabul qilinadi', () => {
    const body = prepareBody();
    body.sign_string = signString(body, SECRET).toUpperCase();
    expect(checkSign(body, SECRET)).toBe(true);
  });

  it('summa o‘zgarsa imzo o‘tmaydi', () => {
    const body = prepareBody();
    body.sign_string = signString(body, SECRET);
    body.amount = '1.00';
    expect(checkSign(body, SECRET)).toBe(false);
  });

  it('boshqa kalit bilan imzo o‘tmaydi', () => {
    const body = prepareBody();
    body.sign_string = signString(body, SECRET);
    expect(checkSign(body, 'boshqa-kalit')).toBe(false);
  });

  it('kalit sozlanmagan bo‘lsa hech qanday imzo o‘tmaydi', () => {
    const body = prepareBody();
    body.sign_string = signString(body, '');
    expect(checkSign(body, '')).toBe(false);
  });

  it('imzo bo‘sh bo‘lsa rad etiladi', () => {
    expect(checkSign(prepareBody({ sign_string: '' }), SECRET)).toBe(false);
  });
});

describe('Click summa birligi', () => {
  it('so‘mni tiyinga o‘giradi', () => {
    expect(toTiyin('99000.00')).toBe(9_900_000);
    expect(toTiyin('1.50')).toBe(150);
  });

  it('kasr yaxlitlanadi, suzuvchi nuqta xatosi qolmaydi', () => {
    expect(toTiyin('0.29')).toBe(29);
    expect(toTiyin('1234.56')).toBe(123_456);
  });

  it('noto‘g‘ri qiymatda NaN qaytadi — tekshiruv shunda yiqiladi', () => {
    expect(Number.isNaN(toTiyin('abc'))).toBe(true);
  });

  it('tiyinni Click kutgan N.NN ko‘rinishiga qaytaradi', () => {
    expect(toSoum(9_900_000)).toBe('99000.00');
    expect(toSoum(150)).toBe('1.50');
  });

  it('o‘girish ikki tomonga ham mos', () => {
    expect(toTiyin(toSoum(98_604_000))).toBe(98_604_000);
  });
});

describe('Click javobi', () => {
  it('xato kodi bilan birga izoh ketadi', () => {
    const out = reply({ click_trans_id: '1' }, CLICK_ERROR.BAD_SIGN);
    expect(out.error).toBe(-1);
    expect(out.error_note).toBe('SIGN CHECK FAILED');
  });
});

describe('Click havolasi', () => {
  it('summa so‘mda, to‘lov raqami transaction_param da', () => {
    const url = new URL(
      clickCheckout({ serviceId: '777', merchantId: '42', paymentId: 'pay_abc', amount: 9_900_000 }),
    );
    expect(url.host).toBe('my.click.uz');
    expect(url.searchParams.get('amount')).toBe('99000.00');
    expect(url.searchParams.get('transaction_param')).toBe('pay_abc');
    expect(url.searchParams.get('service_id')).toBe('777');
  });
});

describe('Payme autentifikatsiyasi', () => {
  const header = (value: string) => `Basic ${Buffer.from(value).toString('base64')}`;

  it('to‘g‘ri login va kalit o‘tadi', () => {
    expect(checkAuth(header('Paycom:kalit'), 'Paycom', 'kalit')).toBe(true);
  });

  it('noto‘g‘ri kalit o‘tmaydi', () => {
    expect(checkAuth(header('Paycom:boshqa'), 'Paycom', 'kalit')).toBe(false);
  });

  it('noto‘g‘ri login o‘tmaydi', () => {
    expect(checkAuth(header('boshqa:kalit'), 'Paycom', 'kalit')).toBe(false);
  });

  it('kalit ichida ikki nuqta bo‘lsa ham to‘g‘ri ajratiladi', () => {
    expect(checkAuth(header('Paycom:a:b:c'), 'Paycom', 'a:b:c')).toBe(true);
  });

  it('Basic bo‘lmagan yoki bo‘sh sarlavha o‘tmaydi', () => {
    expect(checkAuth(null, 'Paycom', 'kalit')).toBe(false);
    expect(checkAuth('Bearer token', 'Paycom', 'kalit')).toBe(false);
    expect(checkAuth(header('Paycom'), 'Paycom', 'kalit')).toBe(false);
  });

  it('kalit sozlanmagan bo‘lsa hech kim kira olmaydi', () => {
    expect(checkAuth(header('Paycom:'), 'Paycom', '')).toBe(false);
  });
});

describe('Payme chek maydoni', () => {
  it('account ichidan to‘lov raqamini oladi', () => {
    expect(accountId({ account: { [ACCOUNT_FIELD]: 'pay_abc' } })).toBe('pay_abc');
  });

  it('maydon yo‘q yoki bo‘sh bo‘lsa null', () => {
    expect(accountId({ account: {} })).toBeNull();
    expect(accountId({ account: { [ACCOUNT_FIELD]: '' } })).toBeNull();
    expect(accountId({})).toBeNull();
    expect(accountId(undefined)).toBeNull();
  });

  it('account son bo‘lsa qabul qilinmaydi', () => {
    expect(accountId({ account: { [ACCOUNT_FIELD]: 123 } })).toBeNull();
  });
});

describe('Payme xato javobi', () => {
  it('xabar uch tilda bo‘ladi', () => {
    const error = rpcError(PAYME_ERROR.INVALID_AMOUNT);
    expect(error.code).toBe(-31001);
    expect(error.message.uz).toBeTruthy();
    expect(error.message.ru).toBeTruthy();
    expect(error.message.en).toBeTruthy();
  });

  it('hisob xatosida qaysi maydon ekani ko‘rsatiladi', () => {
    const body = errorBody(PAYME_ERROR.ACCOUNT_NOT_FOUND, 7, ACCOUNT_FIELD);
    expect(body.error.data).toBe(ACCOUNT_FIELD);
    expect(body.id).toBe(7);
  });

  it('hisob xatolari hujjatdagi oraliqda', () => {
    expect(PAYME_ERROR.ACCOUNT_NOT_FOUND).toBeLessThanOrEqual(-31050);
    expect(PAYME_ERROR.ACCOUNT_ALREADY_PAID).toBeGreaterThanOrEqual(-31099);
  });
});

describe('Payme holatlari', () => {
  it('holat qiymatlari protokoldagidek', () => {
    expect(STATE.CREATED).toBe(1);
    expect(STATE.PERFORMED).toBe(2);
    expect(STATE.CANCELLED).toBe(-1);
    expect(STATE.CANCELLED_AFTER).toBe(-2);
  });

  it('vaqt millisekundda, bo‘lmasa nol', () => {
    expect(ms(new Date(1_700_000_000_000))).toBe(1_700_000_000_000);
    expect(ms(null)).toBe(0);
  });
});

describe('Payme havolasi', () => {
  it('parametrlar base64 ichida, summa tiyinda', () => {
    const url = paymeCheckout({
      merchantId: 'm123',
      paymentId: 'pay_abc',
      amount: 9_900_000,
    });

    const decoded = Buffer.from(url.split('/').pop()!, 'base64').toString('utf8');
    expect(decoded).toContain('m=m123');
    expect(decoded).toContain(`ac.${ACCOUNT_FIELD}=pay_abc`);
    expect(decoded).toContain('a=9900000');
    expect(url.startsWith('https://checkout.paycom.uz/')).toBe(true);
  });

  it('qaytish havolasi berilsa qo‘shiladi', () => {
    const url = paymeCheckout({
      merchantId: 'm123',
      paymentId: 'p',
      amount: 100,
      returnUrl: 'https://onebo.fx/tarif',
    });
    const decoded = Buffer.from(url.split('/').pop()!, 'base64').toString('utf8');
    expect(decoded).toContain('c=https://onebo.fx/tarif');
  });
});
