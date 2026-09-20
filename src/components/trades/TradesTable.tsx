import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { Chip, Empty } from '@/components/ui/primitives';
import { clock, rText, shortDate, signedMoney, num } from '@/lib/format';
import { isClosed, netPnl, rMultiple, type TradeLike } from '@/lib/stats';
import { getI18n } from '@/lib/i18n/server';
import { sessionLabel } from '@/lib/i18n/labels';
import type { Dict } from '@/lib/i18n';

export function DirChip({ direction }: { direction: 'LONG' | 'SHORT' }) {
  // Long/Short — treyderlar orasida xalqaro atama, tarjima qilinmaydi.
  const long = direction === 'LONG';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[7px] px-[7px] py-[3px] font-mono text-[10.5px] font-bold ${
        long ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss'
      }`}
    >
      <Icon name={long ? 'up' : 'down'} size={11} width={2.6} />
      {long ? 'Long' : 'Short'}
    </span>
  );
}

export function Money({ value, size = 'text-[12.5px]' }: { value: number; size?: string }) {
  return (
    <span className={`tnum font-mono font-bold ${size} ${value >= 0 ? 'text-win' : 'text-loss'}`}>
      {signedMoney(value)}
    </span>
  );
}

export function RCell({ value, size = 'text-[12.5px]' }: { value: number; size?: string }) {
  return (
    <span className={`tnum font-mono font-bold ${size} ${value >= 0 ? 'text-win' : 'text-loss'}`}>
      {rText(value)}
    </span>
  );
}

type Column = 'time' | 'symbol' | 'dir' | 'setup' | 'volume' | 'entry' | 'exit' | 'session' | 'r' | 'pnl';

function headings(d: Dict): Record<Column, string> {
  return {
    time: d.trades.colTime,
    symbol: d.trades.colSymbol,
    dir: d.trades.colDirection,
    setup: d.trades.colSetup,
    volume: d.units.lot.toUpperCase(),
    entry: d.trades.colEntry,
    exit: d.trades.colExit,
    session: d.trades.colSession,
    r: d.trades.colR,
    pnl: d.trades.colPnl,
  };
}

const WIDTH: Partial<Record<Column, string>> = {
  time: 'w-[78px]',
  symbol: 'w-[84px]',
  dir: 'w-[74px]',
  volume: 'w-[54px]',
  entry: 'w-[82px]',
  exit: 'w-[82px]',
  session: 'w-[68px]',
  r: 'w-[54px]',
  pnl: 'w-[88px]',
};

const RIGHT: Column[] = ['volume', 'entry', 'exit', 'r', 'pnl'];

export default async function TradesTable({
  trades,
  columns = ['time', 'symbol', 'dir', 'setup', 'session', 'r', 'pnl'],
  decimals = 5,
}: {
  trades: TradeLike[];
  columns?: Column[];
  decimals?: number;
}) {
  const { locale, d } = await getI18n();
  const HEAD = headings(d);

  if (trades.length === 0) {
    return (
      <Empty
        title={d.trades.empty}
        hint={d.trades.emptyHint}
        action={
          <Link
            href="/trades/import"
            className="mt-1 inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-line bg-card2 px-3.5 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {d.import.navCta}
          </Link>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex items-center gap-2.5 border-b border-line px-1 pb-2.5">
          {columns.map((c) => (
            <div
              key={c}
              className={`text-[10.5px] font-bold tracking-[0.08em] text-txt3 ${
                WIDTH[c] ? `${WIDTH[c]} shrink-0` : 'min-w-0 grow'
              } ${RIGHT.includes(c) ? 'text-right' : ''}`}
            >
              {HEAD[c]}
            </div>
          ))}
        </div>

        {trades.map((t) => {
          const closed = isClosed(t);
          const pnl = netPnl(t);
          const r = rMultiple(t);

          return (
            <Link
              key={t.id}
              href={`/trades/${t.id}`}
              className="flex items-center gap-2.5 border-b border-line2 px-1 py-[11px] transition-colors last:border-b-0 hover:bg-card2/50"
            >
              {columns.map((c) => (
                <div
                  key={c}
                  className={`min-w-0 ${WIDTH[c] ? `${WIDTH[c]} shrink-0` : 'grow'} ${
                    RIGHT.includes(c) ? 'text-right' : ''
                  }`}
                >
                  {c === 'time' ? (
                    <>
                      <span className="font-mono text-[12.5px] font-semibold text-txt">
                        {shortDate(t.openedAt, locale)}
                      </span>{' '}
                      <span className="font-mono text-[11px] text-txt3">{clock(t.openedAt)}</span>
                    </>
                  ) : null}
                  {c === 'symbol' ? (
                    <span className="font-mono text-[12.5px] font-bold text-txt">{t.symbol}</span>
                  ) : null}
                  {c === 'dir' ? <DirChip direction={t.direction} /> : null}
                  {c === 'setup' ? (
                    <span className="truncate text-[12.5px] font-medium text-txt2">
                      {t.setup?.name ?? '—'}
                    </span>
                  ) : null}
                  {c === 'volume' ? (
                    <span className="tnum font-mono text-[12.5px] text-txt2">{num(t.volume, 2)}</span>
                  ) : null}
                  {c === 'entry' ? (
                    <span className="tnum font-mono text-[12.5px] text-txt2">
                      {num(t.entryPrice, decimals)}
                    </span>
                  ) : null}
                  {c === 'exit' ? (
                    <span className="tnum font-mono text-[12.5px] text-txt2">
                      {t.exitPrice === null ? '—' : num(t.exitPrice, decimals)}
                    </span>
                  ) : null}
                  {c === 'session' ? (
                    <Chip tone="neutral" className="text-[10.5px]">
                      {t.session ? sessionLabel(t.session, d) : '—'}
                    </Chip>
                  ) : null}
                  {c === 'r' ? (
                    closed ? (
                      <RCell value={r} />
                    ) : (
                      <span className="font-mono text-[12px] text-amber">{d.trades.open}</span>
                    )
                  ) : null}
                  {c === 'pnl' ? (
                    closed ? (
                      <Money value={pnl} />
                    ) : (
                      <span className="font-mono text-[12px] text-txt3">—</span>
                    )
                  ) : null}
                </div>
              ))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
