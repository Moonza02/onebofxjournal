import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Kpi } from '@/components/ui/primitives';
import AdminTabs from '@/components/admin/AdminTabs';
import { adminStats, requireAdmin } from '@/lib/admin';
import { runSweep } from '@/lib/sweep';
import { logError } from '@/lib/log';
import { sum } from '@/lib/billing';
import { monthTitle } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Xodim paneli — umumiy ko'rinish.
 *
 *  Bu yerda faqat sanoq bor: shaxsiy savdo yoki kundalik yozuvi
 *  ko'rsatilmaydi. Xodim biznesni ko'radi, foydalanuvchining ichki
 *  ma'lumotini emas.
 */
export default async function AdminOverviewPage() {
  const user = await requireAdmin();
  const { locale, d } = await getI18n(user.locale);

  // Sahifa ochilganda muddati kelgan ishlar bajariladi: o'chirish
  // so'ralgan hisoblar, eskirgan namunalar, kalitlar va xato yozuvlari.
  // Bu cron o'rnini bosmaydi (`/api/cron` bor), lekin uni qo'ymagan
  // o'rnatmada ham tozalash to'xtab qolmaydi.
  // Tozalash yordamchi ish — u yiqilsa panel ochilmay qolmasligi kerak.
  try {
    await runSweep();
  } catch (error) {
    await logError('admin.sweep', error, { userId: user.id });
  }

  const stats = await adminStats();
  const money = (tiyin: number) => sum(tiyin, d.billing.currency);

  return (
    <>
      <Topbar title={d.admin.title} sub={d.admin.sub} cta={null} />
      <AdminTabs d={d} active="/admin" />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        {/* ------------------------------------------------- foydalanuvchilar */}
        <div className="flex flex-wrap gap-3">
          <Kpi label={d.admin.usersTotal} value={String(stats.users.total)} />
          <Kpi label={d.admin.usersNew7} value={String(stats.users.new7)} />
          <Kpi label={d.admin.usersNew30} value={String(stats.users.new30)} />
          <Kpi label={d.admin.usersTrial} value={String(stats.users.trial)} tone="amber" />
          <Kpi label={d.admin.usersPaid} value={String(stats.users.paid)} tone="win" />
          <Kpi label={d.admin.usersDemo} value={String(stats.users.demo)} />
        </div>

        <div className="grid gap-3.5 lg:grid-cols-3">
          {/* --------------------------------------------------------- tushum */}
          <Card className="lg:col-span-2">
            <CardTitle>{d.admin.revenue}</CardTitle>

            <div className="flex flex-wrap gap-3">
              <Kpi label={d.admin.revenueTotal} value={money(stats.revenue.total)} tone="win" />
              <Kpi label={d.admin.revenueMonth} value={money(stats.revenue.month)} />
              <Kpi
                label={d.admin.revenuePending}
                value={money(stats.revenue.pending)}
                tone="amber"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-txt3">
                {d.admin.revenueByMonth}
              </div>

              {stats.revenue.byMonth.every((m) => m.amount === 0) ? (
                <p className="text-[12.5px] text-txt3">{d.admin.noRevenue}</p>
              ) : (
                <div className="flex flex-col">
                  {stats.revenue.byMonth.map((row) => {
                    const max = Math.max(...stats.revenue.byMonth.map((m) => m.amount), 1);
                    const [year, month] = row.label.split('-').map(Number);
                    return (
                      <div
                        key={row.label}
                        className="flex items-center gap-3 border-b border-line2 py-2 last:border-b-0"
                      >
                        <span className="w-[110px] shrink-0 text-[12px] text-txt3">
                          {monthTitle(year, month - 1, locale)}
                        </span>
                        <span className="h-2 min-w-0 grow overflow-hidden rounded-full bg-card2">
                          <span
                            className="block h-full rounded-full bg-blue"
                            style={{ width: `${(row.amount / max) * 100}%` }}
                          />
                        </span>
                        <span className="tnum w-[130px] shrink-0 text-right font-mono text-[12px] text-txt2">
                          {money(row.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* ---------------------------------------------------- tarif kesimi */}
          <Card>
            <CardTitle>{d.admin.plansTitle}</CardTitle>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-line pb-2 text-[10.5px] font-bold tracking-[0.08em] text-txt3">
                <span className="grow">{d.admin.colPlan}</span>
                <span className="w-16 text-right">{d.admin.colCount}</span>
              </div>
              {stats.users.byPlan.map((row) => (
                <div
                  key={row.plan}
                  className="flex items-center gap-2 border-b border-line2 py-2.5 last:border-b-0"
                >
                  <span className="grow text-[12.5px] text-txt2">{d.plans[row.plan].name}</span>
                  <span className="tnum w-16 text-right font-mono text-[12.5px] text-txt">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------- faollik */}
        <Card>
          <CardTitle>{d.admin.activity}</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Kpi label={d.admin.tradesTotal} value={String(stats.activity.trades)} />
            <Kpi label={d.admin.trades7} value={String(stats.activity.trades7)} />
            <Kpi label={d.admin.journalTotal} value={String(stats.activity.journal)} />
            <Kpi label={d.admin.mentorships} value={String(stats.activity.mentorships)} />
            <Kpi
              label={d.admin.errors24}
              value={String(stats.errors.last24)}
              tone={stats.errors.last24 > 0 ? 'loss' : 'plain'}
            />
            <Kpi
              label={d.admin.errors7}
              value={String(stats.errors.last7)}
              tone={stats.errors.last7 > 0 ? 'amber' : 'plain'}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
