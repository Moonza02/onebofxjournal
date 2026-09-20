import { signedMoney } from '@/lib/format';

/** Gorizontal ustunlar — setup yoki sessiya kesimidagi sof P&L. */
import { getDict } from '@/lib/i18n/server';

export default async function HBars({
  rows,
  labelWidth = 120,
  valueWidth = 72,
}: {
  rows: { key: string; netPnl: number }[];
  labelWidth?: number;
  valueWidth?: number;
}) {
  const d = await getDict();

  if (rows.length === 0) {
    return <div className="py-4 text-center text-[12px] text-txt3">{d.charts.noData}</div>;
  }
  const max = Math.max(...rows.map((r) => Math.abs(r.netPnl)), 1);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <div
            className="shrink-0 truncate text-xs font-semibold text-txt2"
            style={{ width: labelWidth }}
            title={row.key}
          >
            {row.key}
          </div>
          <div className="h-[9px] grow overflow-hidden rounded-[5px] bg-[#151A22]">
            <div
              className={`h-[9px] rounded-[5px] ${row.netPnl >= 0 ? 'bg-win' : 'bg-loss'}`}
              style={{ width: `${(Math.abs(row.netPnl) / max) * 100}%` }}
            />
          </div>
          <div
            className={`tnum shrink-0 text-right font-mono text-xs font-semibold ${
              row.netPnl >= 0 ? 'text-win' : 'text-loss'
            }`}
            style={{ width: valueWidth }}
          >
            {signedMoney(row.netPnl, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}
