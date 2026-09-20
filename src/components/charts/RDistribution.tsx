/** R-multiple taqsimoti. Bitta o'lchov, qutblik bo'yicha rang:
 *  zarar qizil, foyda yashil, breakeven neytral kulrang.
 */
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export default async function RDistribution({
  buckets,
  width = 700,
  height = 186,
}: {
  buckets: { label: string; count: number; sign: number }[];
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  const pad = { l: 8, r: 8, t: 10, b: 24 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const gap = 12;
  const bw = (iw - gap * (buckets.length - 1)) / buckets.length;
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.rAria}
      className="block"
    >
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke="#1D232D" strokeWidth="1" />
      {buckets.map((b, i) => {
        const bx = pad.l + i * (bw + gap);
        const bh = b.count === 0 ? 0 : Math.max(3, (ih * b.count) / max);
        const color = b.sign < 0 ? '#FF5F72' : b.sign > 0 ? '#1FD08A' : '#3C4553';
        return (
          <g key={b.label}>
            {bh > 0 ? (
              <rect x={bx} y={pad.t + ih - bh} width={bw} height={bh} rx="4" fill={color}>
                <title>{fill(d.charts.bucketTrades, { label: b.label, n: b.count })}</title>
              </rect>
            ) : null}
            {b.count > 0 ? (
              <text
                x={bx + bw / 2}
                y={pad.t + ih - bh - 6}
                fill="#A3ACBC"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="10.5"
                fontWeight="600"
                textAnchor="middle"
              >
                {b.count}
              </text>
            ) : null}
            <text
              x={bx + bw / 2}
              y={height - 7}
              fill="#828C9E"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              textAnchor="middle"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
