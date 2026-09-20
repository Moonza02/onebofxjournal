import { num } from '@/lib/format';

/** Noldan yuqori va past ustunlar — hafta kunlari bo'yicha sof natija. */
import { getDict } from '@/lib/i18n/server';

export default async function VBars({
  rows,
  width = 330,
  height = 172,
}: {
  rows: { label: string; value: number }[];
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  const pad = { t: 22, b: 34 };
  const inner = height - pad.t - pad.b;
  const mid = pad.t + inner / 2;
  const half = inner / 2;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const gap = 14;
  const bw = (width - gap * (rows.length - 1)) / rows.length;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.weekdayTitle}
      className="block"
    >
      <line x1="0" y1={mid} x2={width} y2={mid} stroke="#1D232D" strokeWidth="1" />
      {rows.map((row, i) => {
        const x = i * (bw + gap);
        const bh = row.value === 0 ? 0 : Math.max(3, (half * Math.abs(row.value)) / max);
        const positive = row.value >= 0;
        const y = positive ? mid - bh : mid;
        const color = positive ? '#1FD08A' : '#FF5F72';
        return (
          <g key={row.label}>
            {bh > 0 ? (
              <rect x={x} y={y} width={bw} height={bh} rx="4" fill={color}>
                <title>{`${row.label}: ${positive ? '+' : '−'}$${num(Math.abs(row.value), 0)}`}</title>
              </rect>
            ) : null}
            {row.value !== 0 ? (
              <text
                x={x + bw / 2}
                y={positive ? y - 6 : y + bh + 13}
                fill={color}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {positive ? '+' : '−'}
                {num(Math.abs(row.value), 0)}
              </text>
            ) : null}
            <text
              x={x + bw / 2}
              y={height - 8}
              fill="#828C9E"
              fontFamily="Manrope, sans-serif"
              fontSize="10.5"
              fontWeight="600"
              textAnchor="middle"
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
