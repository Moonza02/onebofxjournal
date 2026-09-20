import type { Dict } from '@/lib/i18n';

/** Qahramon bo'limidagi panel ko'rinishi.
 *
 *  Bu skrinshot emas — ilovaning o'z ranglari va shriftlari bilan
 *  chizilgan namuna. Shuning uchun raqamlar ham shartli: haqiqiy
 *  natija ko'rsatilmaydi va va'da qilinmaydi.
 */
export default function Mock({ d }: { d: Dict }) {
  const bars = [38, 64, 22, 78, 52, 90, 46, 70, 58, 84, 30, 66];

  return (
    <div
      aria-hidden
      className="pointer-events-none select-none rounded-[18px] border border-line bg-panel p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-5"
    >
      <div className="flex items-center gap-2.5 border-b border-line2 pb-3.5">
        <span className="h-2 w-2 rounded-full bg-win" />
        <span className="text-[12px] font-bold text-txt2">{d.landing.mockAccount}</span>
        <span className="ml-auto font-mono text-[12px] font-semibold text-txt">$10 180</span>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        {[
          { label: d.landing.mockToday, value: '+$180', tone: 'text-win' },
          { label: d.kpi.winRate, value: '54%', tone: 'text-txt' },
          { label: d.landing.mockRule, value: '72%', tone: 'text-amber' },
        ].map((cell) => (
          <div key={cell.label} className="rounded-[11px] border border-line bg-card2 px-3 py-2.5">
            <div className="truncate text-[9.5px] font-bold tracking-[0.07em] text-txt3">
              {cell.label}
            </div>
            <div className={`mt-1 font-mono text-[16px] font-semibold ${cell.tone}`}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex h-[104px] items-end gap-[5px] rounded-[11px] border border-line bg-card2 px-3 py-3">
        {bars.map((height, i) => (
          <div
            key={i}
            className={`min-w-0 grow rounded-[3px] ${i % 5 === 2 ? 'bg-loss/70' : 'bg-blue/75'}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-[11px] border border-amber/30 bg-amber-soft px-3 py-2.5">
        <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
        <span className="text-[11.5px] leading-relaxed text-amber">{d.landing.mockAlert}</span>
      </div>
    </div>
  );
}
