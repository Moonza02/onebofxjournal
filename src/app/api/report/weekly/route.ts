import { NextResponse } from 'next/server';
import { getUser } from '@/lib/session';
import { getActiveAccount, getTrades } from '@/lib/account';
import { buildWeeklyReport } from '@/lib/report';
import { renderWeeklyPdf } from '@/lib/pdf';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Haftalik hisobotni PDF sifatida yuklab olish.
 *  `?w=1` — o'tgan hafta, `?w=0` yoki bo'sh — joriy hafta.
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse('Kirish talab qilinadi', { status: 401 });

  const { locale, d } = await getI18n(user.locale);

  const offset = Math.min(52, Math.max(0, Number(new URL(request.url).searchParams.get('w') ?? '1') || 0));

  const billing = await getBilling(user);
  if (!has(billing.plan, 'report')) {
    return new NextResponse(d.billing.notInPlan, { status: 402 });
  }

  const { account } = await getActiveAccount();
  const trades = await getTrades(account.id);

  const report = await buildWeeklyReport({
    userId: user.id,
    userName: user.name,
    account,
    trades,
    timeZone: user.timezone,
    offset,
    locale,
  });

  const pdf = await renderWeeklyPdf(report, d);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="onebo-fx-${report.label.replace(/\s|—/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
