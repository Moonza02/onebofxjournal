import { num, weekdaysShort } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import type { MatrixCell } from '@/lib/analytics';

/** Hafta kuni × soat. Katak rangi — o'rtacha R.
 *  Noldan ikki tomonga: yashil foyda, qizil zarar, neytral o'rta.
 */
function cellColor(cell: MatrixCell): string {
  if (cell.count === 0) return '#0D1015';
  const strength = Math.min(0.45, 0.12 + Math.min(1, Math.abs(cell.avgR) / 2) * 0.33);
  if (Math.abs(cell.avgR) < 0.1) return '#141922';
  const rgb = cell.avgR > 0 ? '31,208,138' : '255,95,114';
  return `rgba(${rgb},${strength.toFixed(3)})`;
}

export default async function HourHeatmap({
  matrix,
  hours,
}: {
  matrix: MatrixCell[][];
  hours: number[];
}) {
  const { locale, d } = await getI18n();
  const weekdays = weekdaysShort(locale);

  if (hours.length === 0) {
    return <div className="py-8 text-center text-[12.5px] text-txt3">{d.charts.noData}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: hours.length * 40 + 44 }}>
        <div className="flex gap-1 pl-[44px]">
          {hours.map((hour) => (
            <div
              key={hour}
              className="w-9 shrink-0 text-center font-mono text-[10px] text-txt3"
            >
              {String(hour).padStart(2, '0')}
            </div>
          ))}
        </div>

        <div className="mt-1 flex flex-col gap-1">
          {matrix.map((row, weekday) => (
            <div key={weekday} className="flex items-center gap-1">
              <div className="w-10 shrink-0 text-[11px] font-semibold text-txt3">
                {weekdays[weekday]}
              </div>
              {row.map((cell) => (
                <div
                  key={cell.hour}
                  title={
                    cell.count
                      ? fill(d.charts.cellTrades, {
                          day: weekdays[weekday],
                          hour: String(cell.hour).padStart(2, '0'),
                          text: fill(d.charts.cellText, {
                            n: cell.count,
                            avgR: num(cell.avgR, 2),
                          }),
                        })
                      : fill(d.charts.cellNoTrades, {
                          day: weekdays[weekday],
                          hour: String(cell.hour).padStart(2, '0'),
                        })
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line2"
                  style={{ background: cellColor(cell) }}
                >
                  {cell.count > 0 ? (
                    <span
                      className={`font-mono text-[10px] font-semibold ${
                        Math.abs(cell.avgR) < 0.1
                          ? 'text-txt3'
                          : cell.avgR > 0
                            ? 'text-win'
                            : 'text-loss'
                      }`}
                    >
                      {num(cell.avgR, 1)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 pl-[44px]">
          <span className="text-[11px] text-txt3">Zarar</span>
          <span className="h-2.5 w-5 rounded-[3px] bg-[rgba(255,95,114,0.45)]" />
          <span className="h-2.5 w-5 rounded-[3px] bg-[rgba(255,95,114,0.2)]" />
          <span className="h-2.5 w-5 rounded-[3px] bg-[#141922]" />
          <span className="h-2.5 w-5 rounded-[3px] bg-[rgba(31,208,138,0.2)]" />
          <span className="h-2.5 w-5 rounded-[3px] bg-[rgba(31,208,138,0.45)]" />
          <span className="text-[11px] text-txt3">Foyda · katakdagi raqam — o‘rtacha R</span>
        </div>
      </div>
    </div>
  );
}
