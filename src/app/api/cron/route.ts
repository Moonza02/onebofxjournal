import { NextResponse } from 'next/server';
import { runSweep } from '@/lib/sweep';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Muddati kelgan ishlarni bajaradigan manzil.
 *
 *  Haqiqiy cron shu yerga sutkasiga bir marta kelishi kerak:
 *
 *      curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron
 *
 *  `CRON_SECRET` qo'yilmagan bo'lsa manzil **umuman ishlamaydi** —
 *  ochiq qolgan bo'lsa istalgan odam o'chirishni tezlashtira olmasligi
 *  kerak. Sozlanmagan holat 404 bilan javob beradi: manzil borligi ham
 *  bilinmasin.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!safeEqual(token, secret)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const result = await runSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await logError('cron', error, { path: '/api/cron' });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Uzunligi va mazmuni bo'yicha vaqt oshkor qilmaydigan solishtirish. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
