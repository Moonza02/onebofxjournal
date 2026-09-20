import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ACCOUNT_FIELD,
  accountId,
  checkAuth,
  ERROR,
  errorBody,
  ms,
  REASON,
  resultBody,
  STATE,
  type RpcRequest,
} from '@/lib/payme';
import { logError } from '@/lib/log';
import {
  getPayment,
  getPaymentByTx,
  markCancelled,
  markPaid,
  PAYMENT_SELECT,
  type PaymentRow,
} from '@/lib/payments';

export const dynamic = 'force-dynamic';

/** Payme Merchant API.
 *
 *  Javob **har doim HTTP 200** — Payme boshqa statusni protokol
 *  xatosi (-32400) deb qabul qiladi. Shuning uchun bu yerda hech
 *  qachon `status: 4xx/5xx` qaytarilmaydi.
 *
 *  CreateTransaction va PerformTransaction takroriy chaqirilishi
 *  mumkin (javob yo'qolsa Payme aynan shu parametrlar bilan qayta
 *  yuboradi), shuning uchun ikkalasi ham idempotent.
 */

const ok = (result: unknown, id: number | null) => NextResponse.json(resultBody(result, id));
const fail = (code: number, id: number | null, data?: string) =>
  NextResponse.json(errorBody(code, id, data));

/** Tranzaksiya tugashiga berilgan vaqt — 12 soat.
 *  O'tgan bo'lsa Payme uni timeout bilan bekor qiladi.
 */
const TIMEOUT_MS = 12 * 60 * 60 * 1000;

function txView(payment: PaymentRow) {
  return {
    transaction: payment.id,
    state: payment.state,
    create_time: ms(payment.txCreatedAt),
    perform_time: ms(payment.paidAt),
    cancel_time: ms(payment.cancelledAt),
    reason: payment.cancelReason ?? null,
  };
}

export async function GET() {
  return NextResponse.json(errorBody(ERROR.NOT_POST));
}

export async function POST(request: Request) {
  if (!checkAuth(request.headers.get('authorization'), process.env.PAYME_LOGIN || 'Paycom', process.env.PAYME_KEY ?? '')) {
    return fail(ERROR.UNAUTHORIZED, null);
  }

  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return fail(ERROR.PARSE, null);
  }

  const id = typeof body.id === 'number' ? body.id : null;
  if (typeof body.method !== 'string' || typeof body.params !== 'object' || body.params === null) {
    return fail(ERROR.BAD_REQUEST, id);
  }

  const params = body.params as Record<string, unknown>;

  try {
    switch (body.method) {
      case 'CheckPerformTransaction':
        return await checkPerform(params, id);
      case 'CreateTransaction':
        return await create(params, id);
      case 'PerformTransaction':
        return await perform(params, id);
      case 'CancelTransaction':
        return await cancel(params, id);
      case 'CheckTransaction':
        return await check(params, id);
      case 'GetStatement':
        return await statement(params, id);
      default:
        return fail(ERROR.METHOD_NOT_FOUND, id);
    }
  } catch (error) {
    await logError('payme', error, { path: body.method ?? null });
    return fail(ERROR.INTERNAL, id);
  }
}

/* ------------------------------------------------------------------ metodlar */

/** To'lov mumkinmi: hisob bormi, summa to'g'rimi, hali to'lanmaganmi. */
async function checkPerform(params: Record<string, unknown>, id: number | null) {
  const paymentId = accountId(params);
  if (!paymentId) return fail(ERROR.ACCOUNT_NOT_FOUND, id, ACCOUNT_FIELD);

  const payment = await getPayment(paymentId);
  if (!payment || payment.provider !== 'PAYME') {
    return fail(ERROR.ACCOUNT_NOT_FOUND, id, ACCOUNT_FIELD);
  }
  if (payment.status === 'PAID') return fail(ERROR.ACCOUNT_ALREADY_PAID, id, ACCOUNT_FIELD);
  if (payment.status === 'CANCELLED') return fail(ERROR.ACCOUNT_NOT_FOUND, id, ACCOUNT_FIELD);
  if (params.amount !== payment.amount) return fail(ERROR.INVALID_AMOUNT, id);

  return ok({ allow: true }, id);
}

async function create(params: Record<string, unknown>, id: number | null) {
  const txId = String(params.id ?? '');
  if (!txId) return fail(ERROR.BAD_REQUEST, id);

  // Takroriy so'rov: shu tranzaksiya allaqachon yaratilgan bo'lsa,
  // yangisini ochmay, borini qaytaramiz.
  const existing = await getPaymentByTx('PAYME', txId);
  if (existing) {
    if (existing.state !== STATE.CREATED) return fail(ERROR.BAD_STATE, id);
    return ok(
      { transaction: existing.id, state: existing.state, create_time: ms(existing.txCreatedAt) },
      id,
    );
  }

  const paymentId = accountId(params);
  if (!paymentId) return fail(ERROR.ACCOUNT_NOT_FOUND, id, ACCOUNT_FIELD);

  const payment = await getPayment(paymentId);
  if (!payment || payment.provider !== 'PAYME') {
    return fail(ERROR.ACCOUNT_NOT_FOUND, id, ACCOUNT_FIELD);
  }
  if (payment.status === 'PAID') return fail(ERROR.ACCOUNT_ALREADY_PAID, id, ACCOUNT_FIELD);
  if (payment.status === 'CANCELLED') return fail(ERROR.BAD_STATE, id);
  if (params.amount !== payment.amount) return fail(ERROR.INVALID_AMOUNT, id);

  // Bitta to'lovga ikkita tranzaksiya ochilmasin.
  if (payment.providerTxId && payment.providerTxId !== txId) return fail(ERROR.BAD_STATE, id);

  const time = typeof params.time === 'number' ? new Date(params.time) : new Date();

  const updated: PaymentRow = await db.payment.update({
    where: { id: payment.id },
    data: { providerTxId: txId, state: STATE.CREATED, txCreatedAt: time },
    select: PAYMENT_SELECT,
  });

  return ok(
    { transaction: updated.id, state: updated.state, create_time: ms(updated.txCreatedAt) },
    id,
  );
}

async function perform(params: Record<string, unknown>, id: number | null) {
  const payment = await getPaymentByTx('PAYME', String(params.id ?? ''));
  if (!payment) return fail(ERROR.TRANSACTION_NOT_FOUND, id);

  // Allaqachon bajarilgan — o'sha javobni qaytaramiz.
  if (payment.state === STATE.PERFORMED) {
    return ok(
      { transaction: payment.id, state: payment.state, perform_time: ms(payment.paidAt) },
      id,
    );
  }

  if (payment.state !== STATE.CREATED) return fail(ERROR.BAD_STATE, id);

  // Muddati o'tgan tranzaksiyani bajarmaymiz.
  if (payment.txCreatedAt && Date.now() - payment.txCreatedAt.getTime() > TIMEOUT_MS) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        state: STATE.CANCELLED,
        status: 'CANCELLED',
        cancelReason: REASON.TIMEOUT,
        cancelledAt: new Date(),
      },
    });
    return fail(ERROR.BAD_STATE, id);
  }

  const now = new Date();
  await markPaid(payment.id, now);
  await db.payment.update({ where: { id: payment.id }, data: { state: STATE.PERFORMED } });

  return ok({ transaction: payment.id, state: STATE.PERFORMED, perform_time: now.getTime() }, id);
}

async function cancel(params: Record<string, unknown>, id: number | null) {
  const payment = await getPaymentByTx('PAYME', String(params.id ?? ''));
  if (!payment) return fail(ERROR.TRANSACTION_NOT_FOUND, id);

  const reason = typeof params.reason === 'number' ? params.reason : REASON.UNKNOWN;

  if (payment.state === STATE.CANCELLED || payment.state === STATE.CANCELLED_AFTER) {
    return ok(
      { transaction: payment.id, state: payment.state, cancel_time: ms(payment.cancelledAt) },
      id,
    );
  }

  const now = new Date();
  const nextState = payment.state === STATE.PERFORMED ? STATE.CANCELLED_AFTER : STATE.CANCELLED;

  await markCancelled(payment.id, reason, now);
  await db.payment.update({ where: { id: payment.id }, data: { state: nextState } });

  return ok({ transaction: payment.id, state: nextState, cancel_time: now.getTime() }, id);
}

async function check(params: Record<string, unknown>, id: number | null) {
  const payment = await getPaymentByTx('PAYME', String(params.id ?? ''));
  if (!payment) return fail(ERROR.TRANSACTION_NOT_FOUND, id);
  return ok(txView(payment), id);
}

/** Berilgan oraliqda **yaratilgan** tranzaksiyalar, vaqt bo'yicha o'sish
 *  tartibida. Chegaralar ikkalasi ham kiradi.
 */
async function statement(params: Record<string, unknown>, id: number | null) {
  const from = typeof params.from === 'number' ? params.from : 0;
  const to = typeof params.to === 'number' ? params.to : Date.now();

  const rows: PaymentRow[] = await db.payment.findMany({
    where: {
      provider: 'PAYME',
      providerTxId: { not: null },
      txCreatedAt: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { txCreatedAt: 'asc' },
    select: PAYMENT_SELECT,
  });

  return ok(
    {
      transactions: rows.map((payment) => ({
        id: payment.providerTxId,
        time: ms(payment.txCreatedAt),
        amount: payment.amount,
        account: { [ACCOUNT_FIELD]: payment.id },
        ...txView(payment),
      })),
    },
    id,
  );
}
