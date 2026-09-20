import { num } from '@/lib/format';
import type { HourRow } from '@/lib/analytics';

/** Soat bo'yicha savdolar: ustun balandligi — savdolar soni,
 *  qizil qismi — stoplar ulushi. Ikkisi butunni tashkil qilgani uchun
 *  bu yerda stacked ustun o'rinli.
 */
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export default async function HourChart({
  rows,
  width = 700,
  height = 210,
}: {
  rows: HourRow[];
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  if (rows.length === 0) {
    return <div className="py-8 text-center text-[12.5px] text-txt3">{d.charts.noData}</div>;
  }

  const pad = { l: 8, r: 8, t: 18, b: 30 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const gap = rows.length > 12 ? 5 : 10;
  const bw = (iw - gap * (rows.length - 1)) / rows.length;
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.hourTitle}
      className="block"
    >
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke="#1D232D" strokeWidth="1" />

      {rows.map((row, i) => {
        const x = pad.l + i * (bw + gap);
        if (row.count === 0) {
          return (
            <text
              key={row.hour}
              x={x + bw / 2}
              y={height - 9}
              fill="#4A5464"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9.5"
              textAnchor="middle"
            >
              {String(row.hour).padStart(2, '0')}
            </text>
          );
        }

        const total = Math.max(3, (ih * row.count) / max);
        const lossH = (total * row.losses) / row.count;
        const beH = (total * row.breakeven) / row.count;
        const winH = total - lossH - beH;
        const top = pad.t + ih - total;

        return (
          <g key={row.hour}>
            <title>
              {fill(d.charts.hourCell, {
                hour: String(row.hour).padStart(2, '0'),
                n: row.count,
                losses: row.losses,
                share: num(row.stopShare, 0),
                avgR: num(row.avgR, 2),
              })}
            </title>

            {/* Stoplar tepada — ko'z avval shu qismga tushadi. */}
            <rect x={x} y={top} width={bw} height={lossH} rx="3" fill="#FF5F72" />
            {beH > 0 ? (
              <rect x={x} y={top + lossH} width={bw} height={beH} fill="#3C4553" />
            ) : null}
            <rect
              x={x}
              y={top + lossH + beH}
              width={bw}
              height={Math.max(0, winH)}
              rx="3"
              fill="#1FD08A"
            />

            <text
              x={x + bw / 2}
              y={top - 5}
              fill={row.stopShare >= 60 ? '#FF5F72' : '#828C9E'}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9.5"
              fontWeight="600"
              textAnchor="middle"
            >
              {row.count}
            </text>

            <text
              x={x + bw / 2}
              y={height - 9}
              fill="#828C9E"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9.5"
              textAnchor="middle"
            >
              {String(row.hour).padStart(2, '0')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
