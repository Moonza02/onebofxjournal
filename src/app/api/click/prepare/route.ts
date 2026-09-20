import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTION, checkSign, ERROR, readRequest, reply, toTiyin } from '@/lib/click';
import { getPayment } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/** Click — Prepare (action = 0).
 *
 *  Click to'lovni boshlashdan oldin buyurtma bor-yo'qligini so'raydi.
 *  Javobdagi `merchant_prepare_id` keyin Complete da qaytib keladi va
 *  imzoga ham kiradi.
 */
export async function POST(request: Request) {
  const body = await readRequest(request);

  const base = {
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_prepare_id: body.merchant_trans_id,
  };

  if (!checkSign(body, process.env.CLICK_SECRET_KEY ?? '')) {
    return NextResponse.json(reply(base, ERROR.BAD_SIGN));
  }
  if (body.action !== String(ACTION.PREPARE)) {
    return NextResponse.json(reply(base, ERROR.ACTION_NOT_FOUND));
  }
  if (body.service_id !== (process.env.CLICK_SERVICE_ID ?? '')) {
    return NextResponse.json(reply(base, ERROR.NOT_FOUND));
  }

  const payment = await getPayment(body.merchant_trans_id ?? '');
  if (!payment || payment.provider !== 'CLICK') {
    return NextResponse.json(reply(base, ERROR.NOT_FOUND));
  }
  if (payment.status === 'PAID') {
    return NextResponse.json(reply(base, ERROR.ALREADY_CONFIRMED));
  }
  if (payment.status === 'CANCELLED') {
    return NextResponse.json(reply(base, ERROR.CANCELLED));
  }
  if (toTiyin(body.amount) !== payment.amount) {
    return NextResponse.json(reply(base, ERROR.BAD_AMOUNT));
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { providerTxId: body.click_trans_id, txCreatedAt: new Date() },
  });

  return NextResponse.json(reply(base, ERROR.OK));
}
