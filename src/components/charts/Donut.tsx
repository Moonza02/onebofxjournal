import { num } from '@/lib/format';

/** Bitta foizni ko'rsatadigan halqa — win rate uchun. */
export default function Donut({
  value,
  caption,
  size = 128,
  color = '#3B81FC',
}: {
  value: number;
  caption: string;
  size?: number;
  color?: string;
}) {
  const r = size / 2 - 9;
  const circumference = 2 * Math.PI * r;
  const filled = (circumference * Math.min(100, Math.max(0, value))) / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${caption}: ${num(value, 0)}%`}
      className="block shrink-0"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#171C25" strokeWidth="11" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 2}
        fill="#F1F4F9"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="23"
        fontWeight="600"
        textAnchor="middle"
      >
        {num(value, 0)}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 19}
        fill="#828C9E"
        fontFamily="Manrope, sans-serif"
        fontSize="10.5"
        textAnchor="middle"
      >
        {caption}
      </text>
    </svg>
  );
}
