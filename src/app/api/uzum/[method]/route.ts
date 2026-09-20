import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  accountId,
  amount as readAmount,
  checkAuth,
  checkOk,
  confirmed,
  created,
  failed,
  isMethod,
  reversed,
  sameService,
  statusFor,
  statusOf,
  transId as readTransId,
  UZUM_ERROR,
  type UzumRequest,
} from '@/lib/uzum';
import { getPayment, getPaymentByTx, markCancelled, markPaid } from '@/lib/payments';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Uzum Bank merchant endpointlari: `/api/uzum/<metod>`.
 *
 *  Protokol tafsilotlari va manba haqidagi ogohlantirish `lib/uzum.ts`
 *  da. Bu yerda faqat baza bilan ishlash.
 *
 *  `create` va `confirm` idempotent: javob yo'qolsa Uzum aynan shu
 *  parametrlar bilan qayta yuboradi, ikkinchi marta ham o'sha javob
 *  qaytishi kerak.
 */

const serviceId = () => process.env.UZUM_SERVICE_ID;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ method: string }> },
) {
  const { method } = await params;

  if (!isMethod(method)) {
    return NextResponse.json(failed(null, UZUM_ERROR.UNKNOWN_OPERATION));
  }

  if (
    !checkAuth(
      request.headers.get('authorization'),
      process.env.UZUM_USERNAME,
      process.env.UZUM_PASSWORD,
    )
  ) {
    return NextResponse.json(failed(null, UZUM_ERROR.ACCESS_DENIED));
  }

  let body: UzumRequest;
  try {
    body = (await request.json()) as UzumRequest;
  } catch {
    return NextResponse.json(failed(null, UZUM_ERROR.JSON_PARSE));
  }

  const service = body.serviceId ?? null;

  if (!sameService(body, serviceId())) {
    return NextResponse.json(failed(service, UZUM_ERROR.INVALID_SERVICE_ID));
  }

  try {
    switch (method) {
      case 'check':
        return await check(body, service);
      case 'create':
        return await create(body, service);
      case 'confirm':
        return await confirm(body, service);
      case 'reverse':
        return await reverse(body, service);
      case 'status':
        return await status(body, service);
    }
  } catch (error) {
    await logError('uzum', error, { path: method });
    return NextResponse.json(failed(service, UZUM_ERROR.INTERNAL));
  }
}

/* ------------------------------------------------------------------ check */

/** Bunday hisob bormi va unga to'lash mumkinmi. */
async function check(body: UzumRequest, service: unknown) {
  const id = accountId(body);
  if (!id) return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));

  const payment = await getPayment(id);
  if (!payment || payment.provider !== 'UZUM') {
    return NextResponse.json(failed(service, UZUM_ERROR.ACCOUNT_NOT_FOUND));
  }
  if (payment.status === 'PAID') {
    return NextResponse.json(failed(service, UZUM_ERROR.ALREADY_PROCESSED));
  }
  if (payment.status === 'CANCELLED') {
    return NextResponse.json(failed(service, UZUM_ERROR.PAYMENT_CANCELLED));
  }

  return NextResponse.json(checkOk(service, payment.id));
}

/* ----------------------------------------------------------------- create */

async function create(body: UzumRequest, service: unknown) {
  const id = accountId(body);
  const tx = readTransId(body);
  const sum = readAmount(body);

  if (!id || !tx || sum === null) {
    return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));
  }

  // Takroriy chaqiruv — o'sha javob qaytadi, yangi yozuv ochilmaydi.
  const existing = await getPaymentByTx('UZUM', tx);
  if (existing) {
    if (existing.status === 'CANCELLED') {
      return NextResponse.json(failed(service, UZUM_ERROR.PAYMENT_CANCELLED));
    }
    return NextResponse.json(created(service, tx, existing.amount));
  }

  const payment = await getPayment(id);
  if (!payment || payment.provider !== 'UZUM') {
    return NextResponse.json(failed(service, UZUM_ERROR.ACCOUNT_NOT_FOUND));
  }
  if (payment.status === 'PAID' || payment.providerTxId) {
    return NextResponse.json(failed(service, UZUM_ERROR.ALREADY_PROCESSED));
  }
  if (payment.status === 'CANCELLED') {
    return NextResponse.json(failed(service, UZUM_ERROR.PAYMENT_CANCELLED));
  }

  // Summani biz hisoblaganimiz bilan solishtiramiz — kelgan raqamga
  // ishonilmaydi.
  if (payment.amount !== sum) {
    return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));
  }

  const updated = await db.payment.updateMany({
    where: { id: payment.id, providerTxId: null, status: 'PENDING' },
    data: { providerTxId: tx, txCreatedAt: new Date() },
  });

  // Ikki so'rov bir vaqtda kelgan bo'lsa — g'olibi bitta.
  if (updated.count === 0) {
    const again = await getPaymentByTx('UZUM', tx);
    if (again) return NextResponse.json(created(service, tx, again.amount));
    return NextResponse.json(failed(service, UZUM_ERROR.ALREADY_PROCESSED));
  }

  return NextResponse.json(created(service, tx, payment.amount));
}

/* ---------------------------------------------------------------- confirm */

async function confirm(body: UzumRequest, service: unknown) {
  const tx = readTransId(body);
  if (!tx) return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));

  const payment = await getPaymentByTx('UZUM', tx);
  if (!payment) return NextResponse.json(failed(service, UZUM_ERROR.ACCOUNT_NOT_FOUND));

  if (payment.status === 'CANCELLED') {
    return NextResponse.json(failed(service, UZUM_ERROR.PAYMENT_CANCELLED));
  }

  // Ikkinchi marta kelsa ham tarif ikki marta uzaymaydi: markPaid
  // to'langan yozuvga tegmaydi.
  if (payment.status !== 'PAID') await markPaid(payment.id);

  return NextResponse.json(confirmed(service, tx));
}

/* ---------------------------------------------------------------- reverse */

async function reverse(body: UzumRequest, service: unknown) {
  const tx = readTransId(body);
  if (!tx) return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));

  const payment = await getPaymentByTx('UZUM', tx);
  if (!payment) return NextResponse.json(failed(service, UZUM_ERROR.ACCOUNT_NOT_FOUND));

  if (payment.status !== 'CANCELLED') await markCancelled(payment.id);

  return NextResponse.json(reversed(service, tx, payment.amount));
}

/* ----------------------------------------------------------------- status */

async function status(body: UzumRequest, service: unknown) {
  const tx = readTransId(body);
  if (!tx) return NextResponse.json(failed(service, UZUM_ERROR.MISSING_PARAMS));

  const payment = await getPaymentByTx('UZUM', tx);
  if (!payment) return NextResponse.json(failed(service, UZUM_ERROR.ACCOUNT_NOT_FOUND));

  return NextResponse.json(statusOf(service, tx, statusFor(payment)));
}

/** Uzum faqat POST yuboradi. */
export async function GET() {
  return NextResponse.json(failed(null, UZUM_ERROR.UNKNOWN_OPERATION));
}
