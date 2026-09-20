import { createHash } from 'node:crypto';

/** Click SHOP-API protokoli.
 *
 *  Click ikkita manzilimizga POST qiladi: Prepare va Complete. Har
 *  so'rovda MD5 imzo keladi, biz uni maxfiy kalit bilan qayta yig'ib
 *  solishtiramiz.
 *
 *  Hujjat: https://docs.click.uz/en/click-api-request/
 *
 *  Payme dan farqli o'laroq Click summani **so'mda** yuboradi. Shuning
 *  uchun bu yerda tiyinga o'girish alohida funksiya — ikkalasini
 *  aralashtirib yuborish eng oson qilinadigan xato.
 */

export const ACTION = { PREPARE: 0, COMPLETE: 1 } as const;

export const ERROR = {
  OK: 0,
  BAD_SIGN: -1,
  BAD_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_CONFIRMED: -4,
  /** Foydalanuvchi yoki buyurtma topilmadi. */
  NOT_FOUND: -5,
  /** Tranzaksiya topilmadi (merchant_prepare_id bo'yicha). */
  TRANSACTION_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  BAD_REQUEST: -8,
  CANCELLED: -9,
} as const;

export const ERROR_NOTE: Record<number, string> = {
  [ERROR.OK]: 'Success',
  [ERROR.BAD_SIGN]: 'SIGN CHECK FAILED',
  [ERROR.BAD_AMOUNT]: 'Incorrect parameter amount',
  [ERROR.ACTION_NOT_FOUND]: 'Action not found',
  [ERROR.ALREADY_CONFIRMED]: 'Already paid',
  [ERROR.NOT_FOUND]: 'User does not exist',
  [ERROR.TRANSACTION_NOT_FOUND]: 'Transaction does not exist',
  [ERROR.UPDATE_FAILED]: 'Failed to update user',
  [ERROR.BAD_REQUEST]: 'Error in request from click',
  [ERROR.CANCELLED]: 'Transaction cancelled',
};

export type ClickRequest = {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
};

/** So'rovni `application/x-www-form-urlencoded` yoki JSON dan o'qiydi.
 *  Click hujjatida Content-Type aniq yozilmagan, shuning uchun ikkalasi
 *  ham qabul qilinadi.
 */
export async function readRequest(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';

  if (type.includes('application/json')) {
    const body = (await request.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) out[k] = v === null || v === undefined ? '' : String(v);
    return out;
  }

  const form = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) out[k] = String(v);
  return out;
}

/** Imzo: qiymatlar ajratgichsiz ulanadi va MD5 olinadi.
 *
 *  Prepare:  click_trans_id + service_id + KALIT + merchant_trans_id + amount + action + sign_time
 *  Complete: ... + merchant_trans_id + merchant_prepare_id + amount + action + sign_time
 *
 *  `amount` Click yuborgan ko'rinishida qoladi — qayta formatlansa
 *  ("1000.00" → "1000") imzo mos kelmaydi.
 */
export function signString(body: Record<string, string>, secretKey: string): string {
  const isComplete = body.action === String(ACTION.COMPLETE);

  const parts = [
    body.click_trans_id ?? '',
    body.service_id ?? '',
    secretKey,
    body.merchant_trans_id ?? '',
    ...(isComplete ? [body.merchant_prepare_id ?? ''] : []),
    body.amount ?? '',
    body.action ?? '',
    body.sign_time ?? '',
  ];

  return createHash('md5').update(parts.join(''), 'utf8').digest('hex');
}

export function checkSign(body: Record<string, string>, secretKey: string): boolean {
  if (!secretKey) return false;
  const expected = signString(body, secretKey);
  const given = (body.sign_string ?? '').toLowerCase();
  if (given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** Click so'mda yuboradi ("99000.00"), biz tiyinda saqlaymiz. */
export function toTiyin(amount: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

/** Tiyindan Click kutadigan `N.NN` ko'rinishiga. */
export function toSoum(tiyin: number): string {
  return (tiyin / 100).toFixed(2);
}

export function reply(body: Record<string, unknown>, error: number) {
  return { ...body, error, error_note: ERROR_NOTE[error] ?? 'Unknown error' };
}

/** To'lov sahifasiga havola.
 *  Hujjat: https://docs.click.uz/en/mobile-integration/
 */
export function checkoutUrl(options: {
  serviceId: string;
  merchantId: string;
  paymentId: string;
  /** Tiyinda — bu yerda so'mga o'giriladi. */
  amount: number;
  returnUrl?: string;
}): string {
  const params = new URLSearchParams({
    service_id: options.serviceId,
    merchant_id: options.merchantId,
    amount: toSoum(options.amount),
    transaction_param: options.paymentId,
  });
  if (options.returnUrl) params.set('return_url', options.returnUrl);

  return `https://my.click.uz/services/pay/?${params.toString()}`;
}
