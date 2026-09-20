'use client';

import { useMemo, useState } from 'react';
import { num, shortDate } from '@/lib/format';
import { useD } from '@/components/i18n/Provider';
import { fill, type Locale } from '@/lib/i18n';

export type EquityPoint = { at: string; balance: number };

/** Kapital egri chizig'i — bitta o'lchov, shuning uchun legenda kerak emas.
 *  Kursor bilan yurganda kesishma chiziq va qiymat ko'rsatiladi.
 */
export default function EquityCurve({
  points,
  startingBalance,
  locale,
  width = 1116,
  height = 218,
}: {
  points: EquityPoint[];
  startingBalance: number;
  locale: Locale;
  width?: number;
  height?: number;
}) {
  const d = useD();
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(
    () => [{ at: '', balance: startingBalance }, ...points],
    [points, startingBalance],
  );

  const pad = { l: 6, r: 62, t: 14, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const values = series.map((p) => p.balance);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    hi = lo + Math.max(1, Math.abs(lo) * 0.01);
  }
  const span = hi - lo;
  lo -= span * 0.16;
  hi += span * 0.06;

  const x = (i: number) => pad.l + (series.length > 1 ? (iw * i) / (series.length - 1) : iw / 2);
  const y = (v: number) => pad.t + ih * (1 - (v - lo) / (hi - lo));

  const pts = series.map((p, i) => [x(i), y(p.balance)] as const);
  const line = 'M ' + pts.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join(' L ');
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${pad.t + ih} L ${pts[0][0].toFixed(1)} ${pad.t + ih} Z`;

  const gridRows = [0, 1, 2, 3, 4].map((i) => ({
    y: pad.t + (ih * i) / 4,
    value: hi - ((hi - lo) * i) / 4,
  }));

  // X o'qidagi yorliqlar — boshi, o'rtasi, oxiri.
  const ticks = series.length > 1
    ? [0, Math.round((series.length - 1) / 2), series.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((i) => ({
          i,
          label: series[i].at ? shortDate(new Date(series[i].at), locale) : d.charts.start,
        }))
    : [];

  const active = hover !== null ? series[hover] : null;

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    const ratio = (px - pad.l) / iw;
    const idx = Math.round(ratio * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, idx)));
  }

  const tipX = active && hover !== null ? Math.min(Math.max(x(hover) - 78, 2), width - 160) : 0;
  const tipY = active && hover !== null ? Math.max(y(active.balance) - 62, 4) : 0;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.equityAria}
      className="block"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B81FC" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#3B81FC" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridRows.map((row) => (
        <g key={row.y}>
          <line x1={pad.l} y1={row.y} x2={pad.l + iw} y2={row.y} stroke="#181D26" strokeWidth="1" />
          <text
            x={pad.l + iw + 10}
            y={row.y + 3.5}
            fill="#828C9E"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
          >
            ${num(Math.round(row.value / 100) * 100, 0)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#eqfill)" />
      <path d={line} fill="none" stroke="#3B81FC" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {ticks.map((t) => (
        <text
          key={t.i}
          x={x(t.i)}
          y={height - 8}
          fill="#828C9E"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="10"
          textAnchor="middle"
        >
          {t.label}
        </text>
      ))}

      {active && hover !== null ? (
        <g>
          <line
            x1={x(hover)}
            y1={pad.t}
            x2={x(hover)}
            y2={pad.t + ih}
            stroke="#2A3342"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle cx={x(hover)} cy={y(active.balance)} r="5.5" fill="#3B81FC" stroke="#0E1116" strokeWidth="2.5" />
          <rect x={tipX} y={tipY} width="156" height="50" rx="9" fill="#151A23" stroke="#252C39" />
          <text x={tipX + 12} y={tipY + 19} fill="#828C9E" fontFamily="Manrope, sans-serif" fontSize="10.5">
            {active.at
              ? `${shortDate(new Date(active.at), locale)} · ${fill(d.charts.tradeNo, { n: hover ?? 0 })}`
              : d.charts.startBalance}
          </text>
          <text
            x={tipX + 12}
            y={tipY + 38}
            fill="#F1F4F9"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="14"
            fontWeight="600"
          >
            ${num(active.balance, 2)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
