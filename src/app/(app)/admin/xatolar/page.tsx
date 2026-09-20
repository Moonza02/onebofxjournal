import Topbar from '@/components/ui/Topbar';
import { Card, Chip, Empty } from '@/components/ui/primitives';
import AdminTabs from '@/components/admin/AdminTabs';
import { recentErrors, requireAdmin } from '@/lib/admin';
import { clock, shortDate } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Oxirgi xatolar. Serverga kirmasdan nimadir buzilganini ko'rish uchun. */
export default async function AdminErrorsPage() {
  const user = await requireAdmin();
  const { locale, d } = await getI18n(user.locale);
  const rows = await recentErrors();

  return (
    <>
      <Topbar title={d.admin.errorsTitle} sub={d.admin.errorsNote} cta={null} />
      <AdminTabs d={d} active="/admin/xatolar" />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        {rows.length === 0 ? (
          <Empty icon="check" title={d.admin.noErrors} hint={d.admin.errorsNote} />
        ) : (
          <Card padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr>
                    {[d.admin.colWhen, d.admin.colScope, d.admin.colMessage, d.admin.colUser].map(
                      (head) => (
                        <th
                          key={head}
                          className="border-b border-line px-4 py-3 text-[10.5px] font-bold tracking-[0.08em] text-txt3"
                        >
                          {head}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="border-b border-line2 px-4 py-3 font-mono text-[11.5px] text-txt3">
                        {shortDate(row.createdAt, locale)}
                        <br />
                        {clock(row.createdAt)}
                      </td>
                      <td className="border-b border-line2 px-4 py-3">
                        <Chip tone="loss">{row.scope}</Chip>
                      </td>
                      <td className="border-b border-line2 px-4 py-3">
                        <div className="max-w-[520px] break-words text-[12.5px] text-txt2">
                          {row.message}
                        </div>
                        {row.path ? (
                          <div className="mt-1 break-all font-mono text-[11px] text-txt4">
                            {row.path}
                          </div>
                        ) : null}
                        {row.stack ? (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer text-[11px] font-bold text-txt3">
                              {d.admin.showStack}
                            </summary>
                            <pre className="mt-1.5 max-w-[520px] overflow-x-auto whitespace-pre-wrap break-words rounded-[8px] bg-card2 p-2.5 font-mono text-[10.5px] leading-relaxed text-txt3">
                              {row.stack}
                            </pre>
                          </details>
                        ) : null}
                      </td>
                      <td className="border-b border-line2 px-4 py-3 font-mono text-[11px] text-txt4">
                        {row.userId ?? '—'}
                        {row.digest ? <div className="mt-1">{row.digest}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
