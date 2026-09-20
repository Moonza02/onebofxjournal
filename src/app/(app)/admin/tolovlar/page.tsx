import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import AdminTabs from '@/components/admin/AdminTabs';
import { Card, CardTitle, Chip, Empty } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { confirmManual, rejectManual } from '@/actions/billing';
import { requireUser } from '@/lib/session';
import { db } from '@/lib/db';
import { sum } from '@/lib/billing';
import { clock, shortDate } from '@/lib/format';
import type { Plan } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  plan: Plan;
  months: number;
  amount: number;
  reference: string;
  createdAt: Date;
  user: { name: string; email: string };
};

/** Qo'lda to'lovlarni tasdiqlash. Faqat xodim ko'radi —
 *  boshqalarga sahifa umuman yo'q (404), borligi ham bilinmaydi.
 */
export default async function AdminPaymentsPage() {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);
  const me = await db.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  if (!me?.isAdmin) notFound();

  const rows: Row[] = await db.payment.findMany({
    where: { provider: 'MANUAL', status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      plan: true,
      months: true,
      amount: true,
      reference: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <>
      <Topbar title={d.billing.adminTitle} sub={fill(d.billing.adminSub, { n: rows.length })} />
      <AdminTabs d={d} active="/admin/tolovlar" />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        {rows.length === 0 ? (
          <Empty
            icon="check"
            title={d.billing.adminEmpty}
            hint={d.billing.adminEmptyHint}
          />
        ) : (
          <Card>
            <CardTitle right={<Chip tone="amber">{rows.length}</Chip>}>{d.billing.adminPending}</CardTitle>
            <div className="flex flex-col gap-2.5">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line2 px-3.5 py-3"
                >
                  <div className="min-w-[160px] grow">
                    <div className="text-[13px] font-bold text-txt">{row.user.name}</div>
                    <div className="text-[11.5px] text-txt3">{row.user.email}</div>
                  </div>

                  <div className="min-w-[120px]">
                    <div className="text-[12.5px] font-semibold text-txt2">
                      {d.plans[row.plan].name} · {fill(d.billing.monthsShort, { n: row.months })}
                    </div>
                    <div className="tnum font-mono text-[12px] font-bold text-txt">
                      {sum(row.amount, d.billing.currency)}
                    </div>
                  </div>

                  <div className="min-w-[150px] grow">
                    <div className="text-[10.5px] font-bold tracking-[0.06em] text-txt3">
                      {d.billing.adminCheck}
                    </div>
                    <div className="truncate font-mono text-[12px] text-txt2">
                      {row.reference || d.billing.adminNoCheck}
                    </div>
                  </div>

                  <div className="text-[11px] text-txt4">
                    {shortDate(row.createdAt, locale)}, {clock(row.createdAt)}
                    <div className="font-mono">{row.id.slice(-10).toUpperCase()}</div>
                  </div>

                  <div className="flex gap-2">
                    <form action={confirmManual}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[9px] border border-win/35 bg-win-soft px-3 text-[12px] font-bold text-win transition-colors hover:bg-win/20"
                      >
                        <Icon name="check" size={13} width={2.6} />
                        {d.billing.adminConfirm}
                      </button>
                    </form>
                    <form action={rejectManual}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt3 transition-colors hover:text-loss"
                      >
                        <Icon name="x" size={12} width={2.4} />
                        {d.billing.adminReject}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
