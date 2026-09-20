import Link from 'next/link';
import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, Empty, KeyValue, Kpi } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import NoteThread, { type ThreadNote } from '@/components/mentor/NoteThread';
import ShareSettings from '@/components/mentor/ShareSettings';
import EndLink from '@/components/mentor/EndLink';
import { requireUser } from '@/lib/session';
import {
  counterpart,
  getMentorship,
  getNotes,
  getStudentView,
  markNotesRead,
  roleIn,
} from '@/lib/mentor';
import { clock, longDate, num, pct, shortDate, signedMoney } from '@/lib/format';
import { isClosed, rMultiple, summarize, netPnl } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function MentorshipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trade?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);
  const link = await getMentorship(id, user.id);
  if (!link || link.status === 'ENDED') notFound();

  const role = roleIn(link, user.id);
  if (!role) notFound();

  // Sahifa ochilishi izohlarni o'qilgan deb belgilaydi.
  await markNotesRead(link.id, user.id);

  const other = counterpart(link, user.id);
  const [notes, view] = await Promise.all([
    getNotes(link.id, user.id),
    role === 'MENTOR' ? getStudentView(link, user.id) : Promise.resolve(null),
  ]);

  const thread: ThreadNote[] = notes.map((n) => ({
    id: n.id,
    authorId: n.authorId,
    authorName: n.author.name,
    body: n.body,
    createdAt: `${shortDate(n.createdAt, locale)}, ${clock(n.createdAt)}`,
    mine: n.authorId === user.id,
    trade: n.trade
      ? {
          symbol: n.trade.symbol,
          direction: n.trade.direction === 'LONG' ? 'long' : 'short',
          when: shortDate(n.trade.openedAt, locale),
        }
      : null,
  }));

  const selected = view?.trades.find((t) => t.id === sp.trade) ?? null;
  const attachTrade = selected
    ? {
        id: selected.id,
        label: `${selected.symbol} ${selected.direction === 'LONG' ? 'long' : 'short'} · ${shortDate(
          selected.openedAt,
        )}`,
      }
    : null;

  const summary =
    view && view.account ? summarize(view.trades, view.account.startingBalance) : null;

  return (
    <>
      <Topbar
        title={other?.name ?? d.mentor.linkTitle}
        sub={fill(
          role === 'MENTOR' ? d.mentor.detailStudentSub : d.mentor.detailMentorSub,
          { date: link.acceptedAt ? longDate(link.acceptedAt, locale) : '—' },
        )}
        actions={
          <Link
            href="/mentor"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border border-line bg-card2 px-3 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {d.mentor.allLinks}
          </Link>
        }
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="flex min-w-0 grow flex-col gap-3.5">
          {role === 'MENTOR' && summary && view?.account ? (
            <div className="flex flex-wrap gap-3">
              <Kpi
                label={d.kpi.netPnl}
                value={signedMoney(summary.netPnl)}
                sub={`${d.kpi.balance.toLowerCase()} ${signedMoney(summary.balance, 0).replace('+', '')}`}
                tone={summary.netPnl > 0 ? 'win' : summary.netPnl < 0 ? 'loss' : 'plain'}
              />
              <Kpi
                label={d.kpi.winRate}
                value={`${num(summary.winRate, 0)}%`}
                sub={fill(d.dashboard.countTrades, { n: summary.count })}
              />
              <Kpi
                label={d.kpi.totalR}
                value={`${summary.totalR >= 0 ? '+' : '−'}${num(Math.abs(summary.totalR), 2)}R`}
                sub={
                  summary.profitFactor === null
                    ? 'profit factor ∞'
                    : `profit factor ${num(summary.profitFactor, 2)}`
                }
                tone={summary.totalR >= 0 ? 'win' : 'loss'}
              />
              <Kpi
                label={d.kpi.compliance}
                value={pct(summary.ruleCompliance, 0)}
                sub={
                  link.shareAlerts
                    ? fill(d.mentor.ignoredAlerts, { n: view.ignoredAlerts })
                    : d.mentor.alertsHidden
                }
                tone={summary.ruleCompliance >= 90 ? 'win' : 'amber'}
              />
            </div>
          ) : null}

          {role === 'MENTOR' && view && view.hidden.length > 0 ? (
            <Card padding="p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-px shrink-0 text-txt3">
                  <Icon name="lock" size={15} />
                </span>
                <p className="text-[12px] leading-relaxed text-txt3">
                  {d.mentor.hiddenNote}{' '}
                  <span className="font-semibold text-txt2">
                    {view.hidden.map((k) => d.mentor[k as 'hiddenTrades']).join(', ')}
                  </span>
                  {d.mentor.hiddenNote2}
                </p>
              </div>
            </Card>
          ) : null}

          {role === 'MENTOR' && view && link.shareTrades ? (
            <Card className="flex flex-col">
              <CardTitle
                right={
                  <Chip tone="neutral">
                    {fill(d.dashboard.countTrades, { n: view.trades.length })}
                  </Chip>
                }
              >
                {d.mentor.recentTrades}
              </CardTitle>

              {view.trades.length === 0 ? (
                <p className="text-[12.5px] text-txt3">{d.mentor.noTrades}</p>
              ) : (
                <div className="-mx-1 max-h-[460px] overflow-auto px-1">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left">
                        {[
                          d.trades.colTime,
                          d.trades.colSymbol,
                          d.trades.colSetup,
                          d.trades.colR,
                          d.trades.colPnl,
                          '',
                        ].map((h, i) => (
                          <th
                            key={h + i}
                            className={`sticky top-0 z-10 bg-card pb-2 text-[10.5px] font-bold tracking-[0.08em] text-txt3 ${
                              i >= 3 ? 'text-right' : ''
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {view.trades.slice(0, 60).map((t) => {
                        const open = !isClosed(t);
                        const r = open ? 0 : rMultiple(t);
                        const pnl = open ? 0 : netPnl(t);
                        const on = sp.trade === t.id;

                        return (
                          <tr
                            key={t.id}
                            className={`border-t border-line2 ${on ? 'bg-blue-soft' : ''}`}
                          >
                            <td className="py-2 font-mono text-[11.5px] text-txt3">
                              {shortDate(t.openedAt, locale)}
                            </td>
                            <td className="py-2 text-[12.5px] font-semibold text-txt">
                              {t.symbol}
                              <span
                                className={`ml-1.5 font-mono text-[10.5px] ${
                                  t.direction === 'LONG' ? 'text-win' : 'text-loss'
                                }`}
                              >
                                {t.direction === 'LONG' ? 'L' : 'S'}
                              </span>
                              {t.ruleCompliant ? null : (
                                <span className="ml-1.5 text-[10.5px] text-amber">•</span>
                              )}
                            </td>
                            <td className="py-2 text-[12px] text-txt2">{t.setup?.name ?? '—'}</td>
                            <td
                              className={`py-2 text-right font-mono text-[12px] font-bold ${
                                open ? 'text-txt3' : r >= 0 ? 'text-win' : 'text-loss'
                              }`}
                            >
                              {open ? d.trades.open : `${r >= 0 ? '+' : '−'}${num(Math.abs(r), 2)}R`}
                            </td>
                            <td
                              className={`py-2 text-right font-mono text-[12px] font-bold ${
                                open ? 'text-txt3' : pnl >= 0 ? 'text-win' : 'text-loss'
                              }`}
                            >
                              {open ? '—' : signedMoney(pnl, 0)}
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <Link
                                href={on ? `/mentor/${link.id}` : `/mentor/${link.id}?trade=${t.id}`}
                                className={`inline-flex h-[26px] items-center rounded-[7px] border px-2 text-[11px] font-bold transition-colors ${
                                  on
                                    ? 'border-blue bg-blue text-white'
                                    : 'border-line bg-card2 text-txt3 hover:text-txt2'
                                }`}
                              >
                                {on ? d.mentor.selected : d.mentor.noteButton}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}

          {role === 'MENTOR' && view && link.shareJournal && view.journal.length > 0 ? (
            <Card>
              <CardTitle>{d.mentor.fromJournal}</CardTitle>
              <div className="flex flex-col gap-3">
                {view.journal.map((entry) => (
                  <div key={entry.date.toISOString()} className="border-b border-line2 pb-3 last:border-b-0 last:pb-0">
                    <div className="mb-1.5 text-[11.5px] font-bold text-txt3">
                      {shortDate(entry.date, locale)}
                    </div>
                    {entry.review ? (
                      <p className="mb-1.5 text-[12.5px] leading-relaxed text-txt2">{entry.review}</p>
                    ) : null}
                    {entry.lessons.map((lesson, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                        <span className="text-[12px] leading-relaxed text-txt2">{lesson}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {role === 'MENTOR' && view && !link.shareTrades ? (
            <Empty
              icon="lock"
              title={d.mentor.lockedTradesTitle}
              hint={d.mentor.lockedTradesHint}
            />
          ) : null}

          <Card className="flex flex-col">
            <CardTitle>{d.mentor.notes}</CardTitle>
            <NoteThread
              mentorshipId={link.id}
              notes={thread}
              attachTrade={attachTrade}
              placeholder={
                role === 'MENTOR'
                  ? d.mentor.placeholderMentor
                  : d.mentor.placeholderStudent
              }
            />
          </Card>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[300px]">
          {role === 'STUDENT' ? (
            <Card>
              <CardTitle>{d.mentor.shareTitle}</CardTitle>
              <ShareSettings
                id={link.id}
                values={{
                  shareTrades: link.shareTrades,
                  shareAlerts: link.shareAlerts,
                  shareJournal: link.shareJournal,
                }}
              />
              <p className="mt-3 border-t border-line2 pt-3 text-[11px] leading-relaxed text-txt4">
                {d.mentor.shareNote}
              </p>
            </Card>
          ) : null}

          <Card>
            <CardTitle>{d.mentor.linkTitle}</CardTitle>
            <KeyValue
              label={role === 'MENTOR' ? d.mentor.student : d.mentor.mentorWord}
              value={other?.name ?? '—'}
              mono={false}
            />
            <KeyValue label={d.mentor.email} value={other?.email ?? '—'} mono={false} />
            <KeyValue
              label={d.mentor.started}
              value={link.acceptedAt ? shortDate(link.acceptedAt, locale) : '—'}
            />
            <KeyValue
              label={d.mentor.noteCount}
              value={fill(d.dashboard.countPieces, { n: notes.length })}
            />
          </Card>

          {role === 'MENTOR' && view?.account ? (
            <Card>
              <CardTitle>{d.mentor.accountTitle}</CardTitle>
              <KeyValue label={d.mentor.accountName} value={view.account.name} mono={false} />
              <KeyValue label={d.mentor.dailyLimit} value={pct(view.account.dailyLossPct, 1)} />
              <KeyValue label={d.mentor.totalLimit} value={pct(view.account.maxDrawdownPct, 1)} />
              <KeyValue label={d.mentor.tradeRisk} value={pct(view.account.riskPerTradePct, 1)} />
            </Card>
          ) : null}

          <Card>
            <EndLink id={link.id} who={other?.name ?? d.mentor.otherParty} />
          </Card>
        </div>
      </div>
    </>
  );
}
