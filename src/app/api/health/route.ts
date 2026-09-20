import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redisPing } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Sog'liq tekshiruvi.
 *
 *  Docker, yuk taqsimlagich va monitoring shu manzilga qaraydi.
 *  Qoida: **baza yiqilsa 503**, chunki bazasiz ilovadan foyda yo'q.
 *  Redis esa ixtiyoriy — u yo'q bo'lsa chegara xotirada ishlayveradi,
 *  shuning uchun javob baribir 200, faqat holat `degraded` bo'ladi.
 *
 *  Javobda hech qanday maxfiy ma'lumot yo'q: na sozlama, na versiya,
 *  na xato matni — bu manzil ochiq turadi.
 */
export async function GET() {
  const started = Date.now();

  const database = await check(async () => {
    await db.$queryRaw`SELECT 1`;
  });

  const redis = await redisPing();

  const status = !database ? 'down' : redis === 'error' ? 'degraded' : 'ok';

  return NextResponse.json(
    {
      status,
      database: database ? 'up' : 'down',
      // "off" — Redis sozlanmagan, bu xato emas.
      redis,
      ms: Date.now() - started,
    },
    {
      status: database ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

async function check(probe: () => Promise<unknown>): Promise<boolean> {
  try {
    await probe();
    return true;
  } catch {
    return false;
  }
}
