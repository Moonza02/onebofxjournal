import { num } from '@/lib/format';

/** Oddiy ustunli taqsimot — bitta o'lchov, bitta rang. */
export default function Histogram({
  bars,
  total,
  tone = 'blue',
  unit,
}: {
  bars: { label: string; count: number }[];
  total: number;
  tone?: 'blue' | 'loss' | 'amber';
  unit: string;
}) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  const fill = tone === 'loss' ? 'bg-loss' : tone === 'amber' ? 'bg-amber' : 'bg-blue';

  return (
    <div className="flex flex-col gap-2.5">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <div className="w-[72px] shrink-0 text-right font-mono text-[11.5px] text-txt2">
            {bar.label}
          </div>
          <div className="h-[9px] grow overflow-hidden rounded-[5px] bg-[#151A22]">
            <div
              className={`h-[9px] rounded-[5px] ${fill}`}
              style={{ width: `${(bar.count / max) * 100}%` }}
            />
          </div>
          <div className="w-[86px] shrink-0 text-right font-mono text-[11.5px] text-txt3">
            {num((bar.count / Math.max(total, 1)) * 100, 0)}% · {bar.count} {unit}
          </div>
        </div>
      ))}
    </div>
  );
}
