import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import Tabs, { journalTabs } from '@/components/ui/Tabs';
import { Card, CardTitle, Chip } from '@/components/ui/primitives';
import JournalEditor from '@/components/journal/JournalEditor';
import { getActiveAccount, getTrades } from '@/lib/account';
import {
  dayKey,
  getEntries,
  getEntry,
  HABITS,
  isValidKey,
  moodAverage,
  todayKey,
  writingStreak,
} from '@/lib/journal';
import { longDate, num, signedMoney, weekdaysLong } from '@/lib/format';
import { isClosed, netPnl } from '@/lib/stats';
import { dayKeyIn } from '@/lib/tz';
import { getI18n } from '@/lib/i18n/server';
import { fill, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function titleFor(key: string, locale: Locale, weekdays: string[]): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  const weekday = weekdays[(date.getUTCDay() + 6) % 7];
  const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return `${longDate(local, locale)}, ${weekday}`;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const { user, account } = await getActiveAccount();
  const { locale, d } = await getI18n(user.locale);
  const weekdays = weekdaysLong(locale);
  const timeZone = user.timezone;
  const selectedKey = isValidKey(sp.d) ? sp.d : todayKey(timeZone);
  const [entries, entry, trades] = await Promise.all([
    getEntries(user.id),
    getEntry(user.id, selectedKey),
    getTrades(account.id),
  ]);

  // Tanlangan kunning savdolari — yozuv tepasida ko'rsatiladi.
  const dayTrades = trades.filter(
    (t) => isClosed(t) && dayKeyIn(t.closedAt!, timeZone) === selectedKey,
  );
  const dayPnl = dayTrades.reduce((s, t) => s + netPnl(t), 0);

  const streak = writingStreak(entries, timeZone);
  const mood = moodAverage(entries.slice(0, 14));

  // Ro'yxatda yozuvlar + bugungi kun (yozuv bo'lmasa ham).
  const keys = new Set(entries.map((e) => dayKey(e.date)));
  const rail = [
    ...(keys.has(selectedKey) ? [] : [{ key: selectedKey, entry: null }]),
    ...entries.map((e) => ({ key: dayKey(e.date), entry: e })),
  ];

  return (
    <>
      <Topbar
        title={d.journal.title}
        sub={fill(d.journal.sub, { n: entries.length, streak })}
        cta={{ label: d.journal.today, href: `/journal?d=${todayKey(timeZone)}` }}
      />
      <Tabs tabs={journalTabs(d)} active="/journal" />

      <div className="flex min-h-0 grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="w-full shrink-0 xl:w-[258px]">
          <Card padding="p-4">
            <CardTitle
              right={
                mood !== null ? (
                  <Chip tone={mood >= 3.5 ? 'win' : 'amber'}>{num(mood, 1)} / 5</Chip>
                ) : null
              }
            >
              {d.journal.entries}
            </CardTitle>

            {rail.length === 0 ? (
              <p className="text-[12.5px] text-txt3">{d.journal.noEntries}</p>
            ) : (
              <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
                {rail.map((row) => {
                  const on = row.key === selectedKey;
                  const rowTrades = trades.filter(
                    (t) => isClosed(t) && dayKeyIn(t.closedAt!, timeZone) === row.key,
                  );
                  const rowPnl = rowTrades.reduce((s, t) => s + netPnl(t), 0);
                  const moodValue = row.entry
                    ? [row.entry.discipline, row.entry.patience, row.entry.focus].filter(
                        (v): v is number => typeof v === 'number',
                      )
                    : [];
                  const avg = moodValue.length
                    ? moodValue.reduce((a, b) => a + b, 0) / moodValue.length
                    : 0;

                  return (
                    <Link
                      key={row.key}
                      href={`/journal?d=${row.key}`}
                      className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
                        on ? 'border-blue bg-card2' : 'border-line2 hover:bg-card2/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`grow truncate text-[12.5px] font-bold ${on ? 'text-txt' : 'text-txt2'}`}
                        >
                          {titleFor(row.key, locale, weekdays).replace(/^(\d+ \w+) \d{4}, /, '$1, ')}
                        </span>
                        {rowTrades.length > 0 ? (
                          <span
                            className={`tnum font-mono text-[11.5px] font-bold ${
                              rowPnl >= 0 ? 'text-win' : 'text-loss'
                            }`}
                          >
                            {signedMoney(rowPnl, 0)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`h-[5px] w-[5px] rounded-full ${
                              i < Math.round(avg) ? 'bg-blue' : 'bg-[#1B212B]'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-[10.5px] text-txt3">
                          {row.entry ? d.journal.mood : d.journal.noEntry}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 grow flex-col">
          <JournalEditor
            dateKey={selectedKey}
            title={titleFor(selectedKey, locale, weekdays)}
            entry={entry}
            habits={[...HABITS]}
            dayPnl={dayTrades.length ? signedMoney(dayPnl) : '—'}
            tradeCount={dayTrades.length}
          />
        </div>
      </div>
    </>
  );
}
