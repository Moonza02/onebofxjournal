/** Payme Merchant API protokoli.
 *
 *  Payme bizga JSON-RPC 2.0 bilan murojaat qiladi; biz bitta endpoint
 *  ochamiz. Javob **har doim HTTP 200** bo'lishi kerak — xato RPC
 *  javobining ichida beriladi.
 *
 *  Hujjat: https://developer.help.paycom.uz/protokol-merchant-api/
 *
 *  Bu faylda faqat protokol: turlar, xato kodlari, holat mashinasi va
 *  javob yig'uvchilar. Baza bilan ishlash `payments.ts` da.
 */

/** Tranzaksiya holati (Payme "State"). */
export const STATE = {
  CREATED: 1,
  PERFORMED: 2,
  /** Yaratilgan holatdan bekor qilingan. */
  CANCELLED: -1,
  /** Bajarilgandan keyin bekor qilingan (qaytarish). */
  CANCELLED_AFTER: -2,
} as const;

/** Bekor qilish sabablari. */
export const REASON = {
  RECEIVER_NOT_FOUND: 1,
  DEBIT_ERROR: 2,
  EXECUTION_ERROR: 3,
  TIMEOUT: 4,
  REFUND: 5,
  UNKNOWN: 10,
} as const;

export const ERROR = {
  /** So'rov POST emas. */
  NOT_POST: -32300,
  PARSE: -32700,
  BAD_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  /** Autentifikatsiya o'tmadi. */
  UNAUTHORIZED: -32504,
  INTERNAL: -32400,

  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  /** Xizmat ko'rsatilgan — bekor qilib bo'lmaydi. */
  CANNOT_CANCEL: -31007,
  /** Holat bunga yo'l qo'ymaydi. */
  BAD_STATE: -31008,
  /** Hisob ma'lumoti noto'g'ri (-31050…-31099 oralig'i biznesniki). */
  ACCOUNT_NOT_FOUND: -31050,
  ACCOUNT_ALREADY_PAID: -31051,
} as const;

export type Localized = { ru: string; uz: string; en: string };

export type RpcError = { code: number; message: Localized; data?: string };

export type RpcRequest = { method?: string; params?: Record<string, unknown>; id?: number };

const MESSAGES: Record<number, Localized> = {
  [ERROR.NOT_POST]: {
    ru: 'Требуется метод POST',
    uz: 'POST metodi talab qilinadi',
    en: 'POST method required',
  },
  [ERROR.PARSE]: {
    ru: 'Ошибка разбора JSON',
    uz: 'JSON o‘qib bo‘lmadi',
    en: 'JSON parse error',
  },
  [ERROR.BAD_REQUEST]: {
    ru: 'Неверный формат запроса',
    uz: 'So‘rov formati noto‘g‘ri',
    en: 'Invalid request',
  },
  [ERROR.METHOD_NOT_FOUND]: {
    ru: 'Метод не найден',
    uz: 'Metod topilmadi',
    en: 'Method not found',
  },
  [ERROR.UNAUTHORIZED]: {
    ru: 'Недостаточно привилегий',
    uz: 'Ruxsat yetarli emas',
    en: 'Insufficient privileges',
  },
  [ERROR.INTERNAL]: {
    ru: 'Внутренняя ошибка сервиса',
    uz: 'Ichki xatolik',
    en: 'Internal error',
  },
  [ERROR.INVALID_AMOUNT]: {
    ru: 'Неверная сумма',
    uz: 'Summa noto‘g‘ri',
    en: 'Invalid amount',
  },
  [ERROR.TRANSACTION_NOT_FOUND]: {
    ru: 'Транзакция не найдена',
    uz: 'Tranzaksiya topilmadi',
    en: 'Transaction not found',
  },
  [ERROR.CANNOT_CANCEL]: {
    ru: 'Заказ выполнен, отмена невозможна',
    uz: 'Xizmat ko‘rsatilgan, bekor qilib bo‘lmaydi',
    en: 'Order completed, cannot cancel',
  },
  [ERROR.BAD_STATE]: {
    ru: 'Операция недоступна в текущем состоянии',
    uz: 'Hozirgi holatda bu amal mumkin emas',
    en: 'Operation not allowed in current state',
  },
  [ERROR.ACCOUNT_NOT_FOUND]: {
    ru: 'Счёт не найден',
    uz: 'To‘lov topilmadi',
    en: 'Payment not found',
  },
  [ERROR.ACCOUNT_ALREADY_PAID]: {
    ru: 'Счёт уже оплачен',
    uz: 'To‘lov allaqachon amalga oshirilgan',
    en: 'Already paid',
  },
};

export function rpcError(code: number, data?: string): RpcError {
  return {
    code,
    message: MESSAGES[code] ?? MESSAGES[ERROR.INTERNAL],
    ...(data ? { data } : {}),
  };
}

export function errorBody(code: number, id: number | null = null, data?: string) {
  return { error: rpcError(code, data), id };
}

export function resultBody(result: unknown, id: number | null = null) {
  return { result, id };
}

/* ------------------------------------------------------------------ auth */

/** `Authorization: Basic base64(login:key)`.
 *
 *  Login Payme tomonidan beriladi va amalda `Paycom` bo'ladi (rasmiy
 *  PHP shablonida shunday); shuning uchun u sozlanadigan qilib
 *  qoldirilgan — kassangizda boshqacha bo'lsa .env dan o'zgartiriladi.
 */
export function checkAuth(header: string | null, login: string, key: string): boolean {
  if (!header || !header.startsWith('Basic ')) return false;
  if (!key) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separator = decoded.indexOf(':');
  if (separator < 0) return false;

  return decoded.slice(0, separator) === login && safeEqual(decoded.slice(separator + 1), key);
}

/** Vaqt bo'yicha teng solishtirish — kalitni belgima-belgi topishga yo'l qo'ymaydi. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------ account */

/** Chekdagi hisob maydonining nomi — checkout havolasida `ac.payment_id`. */
export const ACCOUNT_FIELD = 'payment_id';

export function accountId(params: Record<string, unknown> | undefined): string | null {
  const account = params?.account;
  if (!account || typeof account !== 'object') return null;
  const value = (account as Record<string, unknown>)[ACCOUNT_FIELD];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Payme vaqt birligi — millisekund (13 xonali). */
export function ms(date: Date | null): number {
  return date ? date.getTime() : 0;
}

/* ------------------------------------------------------------------ checkout */

/** To'lov sahifasiga havola.
 *
 *  Parametrlar `kalit=qiymat` ko'rinishida, nuqtali vergul bilan
 *  ajratiladi va base64 ga o'giriladi.
 *  Hujjat: https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get/
 */
export function checkoutUrl(options: {
  merchantId: string;
  paymentId: string;
  /** Tiyinda. */
  amount: number;
  returnUrl?: string;
  lang?: 'uz' | 'ru' | 'en';
  host?: string;
}): string {
  const parts = [
    `m=${options.merchantId}`,
    `ac.${ACCOUNT_FIELD}=${options.paymentId}`,
    `a=${options.amount}`,
    `l=${options.lang ?? 'uz'}`,
  ];
  if (options.returnUrl) parts.push(`c=${options.returnUrl}`);

  const host = options.host ?? 'https://checkout.paycom.uz';
  return `${host}/${Buffer.from(parts.join(';'), 'utf8').toString('base64')}`;
}
