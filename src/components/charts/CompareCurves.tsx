import { num } from '@/lib/format';

/** Ikki kapital egri chizig'i yonma-yon. Ikkita seriya bo'lgani uchun
 *  legenda majburiy — rang yolg'iz o'zi ma'no tashimasligi kerak.
 */
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export default async function CompareCurves({
  a,
  b,
  labelA,
  labelB,
  width = 700,
  height = 220,
}: {
  a: number[];
  b: number[];
  labelA: string;
  labelB: string;
  width?: number;
  height?: number;
}) {
  const d = await getDict();

  if (a.length < 2 && b.length < 2) {
    return <div className="py-8 text-center text-[12.5px] text-txt3">Solishtirish uchun ma’lumot yetarli emas</div>;
  }

  const pad = { l: 6, r: 62, t: 14, b: 24 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const all = [...a, ...b];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || 1;
  lo -= span * 0.08;
  hi += span * 0.08;

  const maxLen = Math.max(a.length, b.length) - 1;
  const x = (i: number) => pad.l + (maxLen > 0 ? (iw * i) / maxLen : iw / 2);
  const y = (v: number) => pad.t + ih * (1 - (v - lo) / (hi - lo));

  const line = (values: number[]) =>
    values.length < 2
      ? ''
      : `M ${values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' L ')}`;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-2 text-[11.5px] text-txt2">
          <span className="h-[3px] w-5 rounded-full bg-[#5D6675]" />
          {labelA}
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-txt2">
          <span className="h-[3px] w-5 rounded-full bg-blue" />
          {labelB}
        </span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={fill(d.charts.compareAria, { a: labelA, b: labelB })}
        className="block"
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const yy = pad.t + (ih * i) / 4;
          const value = hi - ((hi - lo) * i) / 4;
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

        <path d={line(a)} fill="none" stroke="#5D6675" strokeWidth="2" strokeLinecap="round" />
        <path d={line(b)} fill="none" stroke="#3B81FC" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
