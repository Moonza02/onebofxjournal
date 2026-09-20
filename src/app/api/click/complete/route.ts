import { NextResponse } from 'next/server';
import { ACTION, checkSign, ERROR, readRequest, reply, toTiyin } from '@/lib/click';
import { getPayment, markCancelled, markPaid } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/** Click — Complete (action = 1).
 *
 *  Kelgan `error` manfiy bo'lsa pul yechilmagan: to'lovni bekor
 *  qilamiz va -9 qaytaramiz (hujjatdagi talab).
 */
export async function POST(request: Request) {
  const body = await readRequest(request);

  const base = {
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: body.merchant_prepare_id ?? null,
  };

  if (!checkSign(body, process.env.CLICK_SECRET_KEY ?? '')) {
    return NextResponse.json(reply(base, ERROR.BAD_SIGN));
  }
  if (body.action !== String(ACTION.COMPLETE)) {
    return NextResponse.json(reply(base, ERROR.ACTION_NOT_FOUND));
  }
  if (body.service_id !== (process.env.CLICK_SERVICE_ID ?? '')) {
    return NextResponse.json(reply(base, ERROR.NOT_FOUND));
  }

  const payment = await getPayment(body.merchant_trans_id ?? '');
  if (!payment || payment.provider !== 'CLICK') {
    return NextResponse.json(reply(base, ERROR.NOT_FOUND));
  }
  // Prepare o'tmagan bo'lsa tranzaksiya yo'q.
  if (!payment.providerTxId) {
    return NextResponse.json(reply(base, ERROR.TRANSACTION_NOT_FOUND));
  }
  if (payment.status === 'CANCELLED') {
    return NextResponse.json(reply(base, ERROR.CANCELLED));
  }
  if (payment.status === 'PAID') {
    return NextResponse.json(reply(base, ERROR.ALREADY_CONFIRMED));
  }

  // Click tomonda xato — pul yechilmagan.
  if (Number(body.error ?? '0') < 0) {
    await markCancelled(payment.id, Number(body.error));
    return NextResponse.json(reply(base, ERROR.CANCELLED));
  }

  if (toTiyin(body.amount) !== payment.amount) {
    return NextResponse.json(reply(base, ERROR.BAD_AMOUNT));
  }

  await markPaid(payment.id);

  return NextResponse.json(reply(base, ERROR.OK));
}
