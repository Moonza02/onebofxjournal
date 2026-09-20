/** Uzum Bank merchant protokoli.
 *
 *  Uzum bizga beshta POST chaqiradi — `check`, `create`, `confirm`,
 *  `reverse`, `status` — va har birini Basic auth bilan imzolaydi.
 *  Payme'dan farqi: bu JSON-RPC emas, oddiy JSON; har metodning o'z
 *  yo'li bor va javob shakli ham har xil.
 *
 *  ⚠️ MANBA HAQIDA. developer.uzumbank.uz shu ishlash muhitidan
 *  ochilmadi (ulanish timeout). Shuning uchun protokol ikkita mustaqil
 *  ochiq manbadan qayta tiklandi va ular bir-biriga mos tushdi:
 *
 *    - github.com/bek-shoyatbek/payme-uzum-click-integration-example
 *    - pkg.go.dev/github.com/tergeoo/payment-providers-go/uzum
 *
 *  Ikkalasi ham bir xil aytadi: beshta metod, Basic auth, `serviceId`,
 *  `transId`, summa **tiyinda**, holatlar `OK / CREATED / CONFIRMED /
 *  REVERSED / FAILED`, xato kodlari 10001…10009 va 99999.
 *
 *  Ikki kod ma'nosida esa manbalar QARAMA-QARSHI:
 *
 *    | kod  | Go paketi          | misol repo                  |
 *    | 10007| hisob topilmadi    | to'lov allaqachon qayta ishlangan |
 *    | 10008| allaqachon bajarilgan | qo'shimcha maydon topilmadi |
 *
 *  Quyida Go paketidagi o'qish olingan. Rasmiy hujjat qo'lga tushganda
 *  faqat shu bitta blokni tekshirish kifoya — qolgan kod tegmaydi.
 */

export const UZUM_STATUS = {
  OK: 'OK',
  FAILED: 'FAILED',
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  REVERSED: 'REVERSED',
} as const;

export type UzumStatus = (typeof UZUM_STATUS)[keyof typeof UZUM_STATUS];

/** ⚠️ 10007 va 10008 — yuqoridagi izohga qarang. */
export const UZUM_ERROR = {
  /** Basic auth o'tmadi. */
  ACCESS_DENIED: 10001,
  JSON_PARSE: 10002,
  UNKNOWN_OPERATION: 10003,
  MISSING_PARAMS: 10005,
  INVALID_SERVICE_ID: 10006,
  ACCOUNT_NOT_FOUND: 10007,
  ALREADY_PROCESSED: 10008,
  PAYMENT_CANCELLED: 10009,
  INTERNAL: 99999,
} as const;

export type UzumErrorCode = (typeof UZUM_ERROR)[keyof typeof UZUM_ERROR];

/** Chekdagi hisob maydoni — Payme'dagi kabi to'lov yozuvining id si. */
export const ACCOUNT_FIELD = 'payment_id';

export const METHODS = ['check', 'create', 'confirm', 'reverse', 'status'] as const;
export type UzumMethod = (typeof METHODS)[number];

export function isMethod(value: string): value is UzumMethod {
  return (METHODS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ so'rov */

export type UzumRequest = {
  serviceId?: unknown;
  timestamp?: unknown;
  transId?: unknown;
  amount?: unknown;
  params?: Record<string, unknown>;
};

/** `params.payment_id` — bizning to'lov yozuvimiz. */
export function accountId(body: UzumRequest): string | null {
  const value = body.params?.[ACCOUNT_FIELD];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function transId(body: UzumRequest): string | null {
  return typeof body.transId === 'string' && body.transId.length > 0 ? body.transId : null;
}

/** Summa tiyinda keladi. Butun va musbat bo'lmasa — yaroqsiz. */
export function amount(body: UzumRequest): number | null {
  const value = body.amount;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

export function sameService(body: UzumRequest, serviceId: string | undefined): boolean {
  if (!serviceId) return false;
  return String(body.serviceId ?? '') === String(serviceId);
}

/* -------------------------------------------------------------------- auth */

/** Basic auth. Parol vaqt bo'yicha teng solishtiriladi — kalitni
 *  belgima-belgi topishga yo'l qo'ymaslik uchun.
 */
export function checkAuth(
  header: string | null,
  username: string | undefined,
  password: string | undefined,
): boolean {
  if (!username || !password) return false;
  if (!header || !header.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separator = decoded.indexOf(':');
  if (separator < 0) return false;

  return decoded.slice(0, separator) === username && safeEqual(decoded.slice(separator + 1), password);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------ javob */

const now = () => Date.now();

export type UzumResponse = Record<string, unknown>;

export function failed(
  serviceId: unknown,
  errorCode: UzumErrorCode,
  extra: UzumResponse = {},
): UzumResponse {
  return {
    serviceId,
    timestamp: now(),
    status: UZUM_STATUS.FAILED,
    errorCode,
    ...extra,
  };
}

/** `check` — hisob bormi. Javobda hisobning o'zi qaytariladi. */
export function checkOk(serviceId: unknown, paymentId: string): UzumResponse {
  return {
    serviceId,
    timestamp: now(),
    status: UZUM_STATUS.OK,
    data: { account: { value: paymentId } },
  };
}

/** `create` — tranzaksiya ochildi. */
export function created(serviceId: unknown, tx: string, sum: number): UzumResponse {
  const at = now();
  return {
    serviceId,
    timestamp: at,
    status: UZUM_STATUS.CREATED,
    transTime: at,
    transId: tx,
    amount: sum,
  };
}

/** `confirm` — pul yechildi, tarif ochiladi. */
export function confirmed(serviceId: unknown, tx: string): UzumResponse {
  const at = now();
  return {
    serviceId,
    transId: tx,
    status: UZUM_STATUS.CONFIRMED,
    confirmTime: at,
    timestamp: at,
  };
}

/** `reverse` — bekor qilindi yoki qaytarildi. */
export function reversed(serviceId: unknown, tx: string, sum: number): UzumResponse {
  const at = now();
  return {
    serviceId,
    transId: tx,
    status: UZUM_STATUS.REVERSED,
    reverseTime: at,
    timestamp: at,
    amount: sum,
  };
}

/** `status` — hozirgi holat. */
export function statusOf(serviceId: unknown, tx: string, status: UzumStatus): UzumResponse {
  return { serviceId, transId: tx, status, timestamp: now() };
}

/** Bizdagi holatni Uzum tilidagi holatga o'giradi. */
export function statusFor(payment: { status: string }): UzumStatus {
  if (payment.status === 'PAID') return UZUM_STATUS.CONFIRMED;
  if (payment.status === 'CANCELLED') return UZUM_STATUS.REVERSED;
  return UZUM_STATUS.CREATED;
}

/* --------------------------------------------------------------- checkout */

/** To'lov sahifasiga havola.
 *
 *  Payme va Click da havola shakli hujjatda aniq yozilgan, Uzum da esa
 *  u kassa sozlamasiga bog'liq va rasmiy hujjat bu yerdan ochilmadi.
 *  Shuning uchun shakl kodga qotirilmaydi: `.env` dagi namunaga
 *  `{payment_id}` va `{amount}` qo'yiladi, ular shu yerda almashtiriladi.
 *
 *  Masalan:
 *    UZUM_CHECKOUT_URL="https://.../pay?service=123&account={payment_id}&amount={amount}"
 */
export function checkoutUrl(template: string, paymentId: string, amountTiyin: number): string {
  return template
    .replaceAll('{payment_id}', encodeURIComponent(paymentId))
    .replaceAll('{amount}', String(amountTiyin));
}
