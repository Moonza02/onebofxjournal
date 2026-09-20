import { num } from '@/lib/format';

/** Monte-Carlo yelpig'ichi: o'rta chiziq va 5–95 protsentil oralig'i.
 *  1000 ta chiziqni chizish o'rniga oraliq ko'rsatiladi — o'qish osonroq.
 */
import { getDict } from '@/lib/i18n/server';

export default async function FanChart({
  bands,
  startingBalance,
  width = 700,
  height = 230,
}: {
  bands: { p5: number[]; p50: number[]; p95: number[] };
  startingBalance: number;
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  const pad = { l: 6, r: 62, t: 14, b: 24 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = bands.p50.length - 1;

  const all = [...bands.p5, ...bands.p95, startingBalance];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || 1;
  lo -= span * 0.08;
  hi += span * 0.08;

  const x = (i: number) => pad.l + (n > 0 ? (iw * i) / n : iw / 2);
  const y = (v: number) => pad.t + ih * (1 - (v - lo) / (hi - lo));

  const line = (values: number[]) =>
    `M ${values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' L ')}`;

  const area = `${line(bands.p95)} L ${x(n).toFixed(1)} ${y(bands.p5[n]).toFixed(1)} ${bands.p5
    .slice()
    .reverse()
    .map((v, i) => `L ${x(n - i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ')} Z`;

  const gridValues = [0, 1, 2, 3, 4].map((i) => hi - ((hi - lo) * i) / 4);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={d.charts.fanTitle}
      className="block"
    >
      {gridValues.map((value, i) => {
        const yy = pad.t + (ih * i) / 4;
        return (
          <g key={i}>
            <line x1={pad.l} y1={yy} x2={pad.l + iw} y2={yy} stroke="#181D26" strokeWidth="1" />
            <text
              x={pad.l + iw + 10}
              y={yy + 3.5}
              fill="#828C9E"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
            >
              ${num(Math.round(value / 100) * 100, 0)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="#3B81FC" fillOpacity="0.14" />
      <path d={line(bands.p95)} fill="none" stroke="#3B81FC" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d={line(bands.p5)} fill="none" stroke="#3B81FC" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d={line(bands.p50)} fill="none" stroke="#3B81FC" strokeWidth="2.5" strokeLinecap="round" />

      <line
        x1={pad.l}
        y1={y(startingBalance)}
        x2={pad.l + iw}
        y2={y(startingBalance)}
        stroke="#3C4553"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      <text
        x={pad.l + 4}
        y={pad.t + 12}
        fill="#828C9E"
        fontFamily="Manrope, sans-serif"
        fontSize="10.5"
      >
        {d.charts.midPath}
      </text>
    </svg>
  );
}
