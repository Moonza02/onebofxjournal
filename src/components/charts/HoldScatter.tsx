import { duration, num } from '@/lib/format';
import type { HoldPoint } from '@/lib/analytics';

/** Ushlash vaqti va natija. Gorizontal o'q logarifmik —
 *  aks holda uzoq ushlangan bitta savdo qolgan hammasini chapga siqib qo'yadi.
 */
import { getDict } from '@/lib/i18n/server';

export default async function HoldScatter({
  points,
  width = 700,
  height = 260,
}: {
  points: HoldPoint[];
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  if (points.length === 0) {
    return <div className="py-8 text-center text-[12.5px] text-txt3">{d.charts.noData}</div>;
  }

  const pad = { l: 34, r: 10, t: 14, b: 32 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const scaleX = (minutes: number) => Math.log10(1 + Math.max(0, minutes));
  const maxX = Math.max(...points.map((p) => scaleX(p.minutes)), 1);
  const maxR = Math.max(2, ...points.map((p) => Math.abs(p.r)));

  const x = (minutes: number) => pad.l + (iw * scaleX(minutes)) / maxX;
  const y = (r: number) => pad.t + ih / 2 - (r / maxR) * (ih / 2);

  // O'rtacha chiziq — vaqt oynalari bo'yicha.
  const bins = 6;
  const trend: [number, number][] = [];
  for (let i = 0; i < bins; i += 1) {
    const from = (maxX * i) / bins;
    const to = (maxX * (i + 1)) / bins;
    const inBin = points.filter((p) => scaleX(p.minutes) >= from && scaleX(p.minutes) < to);
    if (inBin.length < 2) continue;
    const avgR = inBin.reduce((s, p) => s + p.r, 0) / inBin.length;
    trend.push([pad.l + (iw * (from + to)) / 2 / maxX, y(avgR)]);
  }

  const ticks = [5, 30, 120, 360, 1440].filter((m) => scaleX(m) <= maxX);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.holdTitle}
      className="block"
    >
      {[-1, 0, 1].map((level) => {
        const yy = y(level * maxR * 0.5);
        return (
          <g key={level}>
            <line
              x1={pad.l}
              y1={yy}
              x2={pad.l + iw}
              y2={yy}
              stroke={level === 0 ? '#1D232D' : '#141A22'}
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={yy + 3.5}
              fill="#828C9E"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9.5"
              textAnchor="end"
            >
              {num(level * maxR * 0.5, 1)}R
            </text>
          </g>
        );
      })}

      {points.map((p) => (
        <circle
          key={p.id}
          cx={x(p.minutes)}
          cy={y(p.r)}
          r="4"
          fill={p.r >= 0 ? '#1FD08A' : '#FF5F72'}
          fillOpacity="0.75"
          stroke="#0E1116"
          strokeWidth="1.5"
        >
          <title>{`${p.symbol} · ${duration(p.minutes * 60000)} · ${num(p.r, 2)}R`}</title>
        </circle>
      ))}

      {trend.length >= 2 ? (
        <path
          d={`M ${trend.map(([tx, ty]) => `${tx.toFixed(1)} ${ty.toFixed(1)}`).join(' L ')}`}
          fill="none"
          stroke="#3B81FC"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
      ) : null}

      {ticks.map((m) => (
        <text
          key={m}
          x={x(m)}
          y={height - 10}
          fill="#828C9E"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="9.5"
          textAnchor="middle"
        >
          {duration(m * 60000)}
        </text>
      ))}
    </svg>
  );
}
