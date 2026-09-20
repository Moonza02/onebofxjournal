import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Btn, BtnLink, Card, CardTitle, Chip, Empty, Kpi } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icons';
import RDistribution from '@/components/charts/RDistribution';
import TradesTable from '@/components/trades/TradesTable';
import { getActiveAccount, getSetups, getTrades } from '@/lib/account';
import { money, num, signedMoney } from '@/lib/format';
import { rDistribution, summarize } from '@/lib/stats';
import { archiveSetup } from '@/actions/setups';
import { getDict } from '@/lib/i18n/server';
import { fill, type Dict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** A / B / C reyting — statistika beradi, odam emas.
 *  20 savdodan kam bo'lsa reyting berilmaydi: kichik namuna tasodifni
 *  mahorat qilib ko'rsatadi.
 */
function rate(
  count: number,
  expectancy: number,
  profitFactor: number | null,
  winRate: number,
  d: Dict,
) {
  if (count < 20) return { grade: '?', tone: 'neutral' as const, note: d.playbook.noSample };

  const normExpectancy = Math.min(1, Math.max(0, expectancy / 200));
  const normPf = Math.min(1, Math.max(0, ((profitFactor ?? 3) - 0.8) / 2.2));
  const normWr = Math.min(1, Math.max(0, winRate / 100));
  const normN = Math.min(1, count / 60);

  const score = 0.45 * normExpectancy + 0.3 * normPf + 0.15 * normWr + 0.1 * normN;

  if (score >= 0.7) return { grade: 'A', tone: 'win' as const, note: d.playbook.gradeA };
  if (score >= 0.45) return { grade: 'B', tone: 'blue' as const, note: d.playbook.gradeB };
  return { grade: 'C', tone: 'amber' as const, note: d.playbook.gradeC };
}

function RuleList({ title, items, icon, color }: { title: string; items: string[]; icon: IconName; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0 grow basis-0">
      <div className="mb-2 flex items-center gap-2">
        <span className={color}>
          <Icon name={icon} size={15} />
        </span>
        <span className="text-xs font-bold tracking-[0.06em] text-txt">{title}</span>
      </div>
      {items.map((item) => (
        <div key={item} className="flex gap-2.5 py-1.5">
          <span className={`mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${color.replace('text-', 'bg-')}`} />
          <span className="text-[12.5px] leading-relaxed text-txt2">{item}</span>
        </div>
      ))}
    </div>
  );
}

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const sp = await searchParams;
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  const [setups, trades] = await Promise.all([
    getSetups(user.id),
    getTrades(account.id),
  ]);

  if (setups.length === 0) {
    return (
      <>
        <Topbar title={d.playbook.title} sub={d.playbook.subLibrary} cta={null} />
        <div className="p-5 sm:p-[22px] sm:px-[26px]">
          <Empty
            icon="book"
            title={d.playbook.emptyTitle}
            hint={d.playbook.emptyHint}
            action={
              <BtnLink href="/playbook/new" kind="primary" icon="plus">
                {d.playbook.emptyAction}
              </BtnLink>
            }
          />
        </div>
      </>
    );
  }

  const selected = setups.find((s) => s.id === sp.s) ?? setups[0];
  const setupTrades = trades.filter((t) => t.setup?.id === selected.id);
  const summary = summarize(setupTrades, 0);
  const grade = rate(summary.count, summary.expectancy, summary.profitFactor, summary.winRate, d);

  return (
    <>
      <Topbar
        title={d.playbook.title}
        sub={fill(d.playbook.sub, { n: setups.length })}
        cta={{ label: d.playbook.newSetup, href: '/playbook/new' }}
      />

      <div className="flex min-h-0 grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="w-full shrink-0 xl:w-[268px]">
          <Card padding="p-4">
            <CardTitle
              right={
                <span className="text-[11.5px] text-txt3">
                  {fill(d.dashboard.countPieces, { n: setups.length })}
                </span>
              }
            >
              {d.playbook.setups}
            </CardTitle>
            <div className="mb-2.5">
              <BtnLink href="/playbook/new" icon="plus" className="w-full">
                {d.playbook.newSetup}
              </BtnLink>
            </div>
            <div className="flex flex-col gap-1.5">
              {setups.map((s) => {
                const st = summarize(
                  trades.filter((t) => t.setup?.id === s.id),
                  0,
                );
                const on = s.id === selected.id;
                return (
                  <Link
                    key={s.id}
                    href={`/playbook?s=${s.id}`}
                    className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
                      on ? 'border-blue bg-card2' : 'border-line2 hover:bg-card2/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`grow truncate text-[13px] font-bold ${on ? 'text-txt' : 'text-txt2'}`}>
                        {s.name}
                      </span>
                      <span
                        className={`tnum font-mono text-xs font-bold ${
                          st.netPnl >= 0 ? 'text-win' : 'text-loss'
                        }`}
                      >
                        {st.count ? signedMoney(st.netPnl, 0) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone="neutral" className="text-[10px]">
                        {fill(d.dashboard.countTrades, { n: st.count })}
                      </Chip>
                      {st.count > 0 ? (
                        <Chip tone="neutral" className="text-[10px]">
                          {num(st.winRate, 0)}%
                        </Chip>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 grow flex-col gap-3.5">
          <Card>
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-blue-soft text-blue">
                <Icon name="target" size={24} />
              </span>
              <div className="min-w-0 grow">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-display text-[22px] font-semibold text-txt">{selected.name}</h2>
                  <Chip tone={grade.tone}>
                    {grade.grade === '?'
                      ? d.playbook.noGrade
                      : fill(d.playbook.gradeSuffix, { grade: grade.grade })}
                  </Chip>
                  <Chip tone={selected.status === 'ACTIVE' ? 'win' : 'neutral'}>
                    {selected.status === 'ACTIVE'
                      ? d.playbook.statusActive
                      : selected.status === 'TESTING'
                        ? d.playbook.statusTesting
                        : d.playbook.statusArchived}
                  </Chip>
                </div>
                {selected.description ? (
                  <p className="mt-2 max-w-[640px] text-[12.5px] leading-relaxed text-txt2">
                    {selected.description}
                  </p>
                ) : null}
                <p className="mt-2 text-[11.5px] text-txt3">{grade.note}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <BtnLink href={`/playbook/${selected.id}/edit`} icon="pen">
                  {d.common.edit}
                </BtnLink>
                {selected.status !== 'ARCHIVED' ? (
                  <form action={archiveSetup}>
                    <input type="hidden" name="id" value={selected.id} />
                    <Btn type="submit" kind="ghost">
                      {d.playbook.archive}
                    </Btn>
                  </form>
                ) : null}
              </div>
            </div>
          </Card>

          <Card padding="p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
                {d.playbook.scope}
              </span>
              <span className="mx-1 h-4 w-px bg-line2" />
              <div className="flex flex-wrap gap-1.5">
                {selected.timeframes.map((tf) => (
                  <Chip key={tf} tone="neutral">
                    {tf}
                  </Chip>
                ))}
                {selected.sessions.map((s) => (
                  <Chip key={s} tone="neutral">
                    {s}
                  </Chip>
                ))}
                {selected.timeframes.length === 0 && selected.sessions.length === 0 ? (
                  <span className="text-[12px] text-txt3">{d.playbook.unset}</span>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Kpi
              label={d.kpi.netPnl}
              value={summary.count ? signedMoney(summary.netPnl) : '—'}
              sub={fill(d.dashboard.countTrades, { n: summary.count })}
              tone={summary.netPnl >= 0 ? 'win' : 'loss'}
            />
            <Kpi
              label={d.kpi.winRate}
              value={summary.count ? `${num(summary.winRate, 0)}%` : '—'}
              sub={`${summary.wins} / ${summary.wins + summary.losses}`}
            />
            <Kpi
              label={d.kpi.profitFactor}
              value={
                summary.count === 0 ? '—' : summary.profitFactor === null ? '∞' : num(summary.profitFactor, 2)
              }
              sub={d.dashboard.pfTarget}
            />
            <Kpi
              label={d.kpi.avgR}
              value={summary.count ? `${summary.avgR >= 0 ? '+' : '−'}${num(Math.abs(summary.avgR), 2)}R` : '—'}
              sub={fill(d.playbook.totalR, { r: num(summary.totalR, 1) })}
            />
            <Kpi
              label={d.kpi.expectancy}
              value={summary.count ? signedMoney(summary.expectancy) : '—'}
              sub={d.playbook.perTrade}
            />
          </div>

          <Card>
            <CardTitle>{d.playbook.rules}</CardTitle>
            <div className="flex flex-col gap-6 lg:flex-row">
              <RuleList title={d.playbook.entry} items={selected.entryRules} icon="up" color="text-blue" />
              <RuleList title={d.playbook.exit} items={selected.exitRules} icon="target" color="text-win" />
              <RuleList title={d.playbook.riskRules} items={selected.riskRules} icon="shield" color="text-amber" />
            </div>
            {selected.entryRules.length === 0 &&
            selected.exitRules.length === 0 &&
            selected.riskRules.length === 0 ? (
              <p className="text-[12.5px] text-txt3">{d.playbook.noRules}</p>
            ) : null}
          </Card>

          <div className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
            <Card className="flex min-w-0 grow flex-col">
              <CardTitle
                right={
                  <Link
                    href={`/trades?setup=${encodeURIComponent(selected.name)}`}
                    className="text-xs font-bold text-blue hover:text-bluel"
                  >
                    {d.dashboard.viewAll}
                  </Link>
                }
              >
                {d.playbook.setupTrades}
              </CardTitle>
              <TradesTable trades={setupTrades.slice(0, 8)} columns={['time', 'symbol', 'dir', 'session', 'r', 'pnl']} />
            </Card>

            <div className="w-full shrink-0 xl:w-[356px]">
              <Card>
                <CardTitle>{d.playbook.rDistribution}</CardTitle>
                {summary.count > 0 ? (
                  <RDistribution buckets={rDistribution(setupTrades)} width={316} height={172} />
                ) : (
                  <p className="py-6 text-center text-[12.5px] text-txt3">{d.playbook.noClosed}</p>
                )}
                {summary.count > 0 ? (
                  <div className="mt-3 flex items-center justify-between border-t border-line2 pt-3 text-xs text-txt3">
                    <span>{d.playbook.avgRisk}</span>
                    <span className="font-mono font-semibold text-txt2">
                      {money(
                        setupTrades.reduce(
                          (s, t) => s + (Math.abs(t.entryPrice - t.stopPrice) / t.pipSize) * t.pipValuePerLot * t.volume,
                          0,
                        ) / Math.max(setupTrades.length, 1),
                        0,
                      )}
                    </span>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
