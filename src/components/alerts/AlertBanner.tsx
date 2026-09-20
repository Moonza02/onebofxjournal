import { Icon, type IconName } from '@/components/ui/icons';
import { stopForToday } from '@/actions/alerts';
import type { Alert, Severity } from '@/lib/alerts';
import { getDict } from '@/lib/i18n/server';

const TONE: Record<Severity, { box: string; icon: string; title: string }> = {
  info: { box: 'bg-blue-soft border-blue/25', icon: 'text-blue', title: 'text-txt' },
  warn: { box: 'bg-amber-soft border-amber/25', icon: 'text-amber', title: 'text-txt' },
  serious: { box: 'bg-loss-soft border-loss/30', icon: 'text-loss', title: 'text-txt' },
};

const ICON: Record<Alert['kind'], IconName> = {
  DAILY_LIMIT_NEAR: 'shield',
  DAILY_LIMIT_HIT: 'shield',
  LOSS_STREAK: 'down',
  REVENGE_TRADE: 'brain',
  DRAWDOWN_NEAR: 'shield',
  CORRELATION: 'link',
  RISK_TOO_BIG: 'calc',
};

/** Ogohlantirishlar. Hech narsani bloklamaydi — faqat ko'rsatadi. */
export default async function AlertBanner({
  alerts,
  showStopButton = false,
}: {
  alerts: Alert[];
  showStopButton?: boolean;
}) {
  if (alerts.length === 0) return null;
  const d = await getDict();

  const serious = alerts.some((a) => a.severity === 'serious');

  return (
    <div className="flex flex-col gap-2.5">
      {alerts.map((alert) => {
        const tone = TONE[alert.severity];
        return (
          <div
            key={`${alert.kind}-${alert.title}`}
            role="status"
            className={`flex gap-3 rounded-[13px] border p-3.5 ${tone.box}`}
          >
            <span className={`mt-px shrink-0 ${tone.icon}`}>
              <Icon name={ICON[alert.kind]} size={18} />
            </span>
            <div className="min-w-0 grow">
              <div className={`text-[13px] font-bold ${tone.title}`}>{alert.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-txt2">{alert.message}</p>
              {alert.advice ? (
                <p className="mt-1.5 text-[12px] leading-relaxed text-txt3">{alert.advice}</p>
              ) : null}
            </div>
          </div>
        );
      })}

      {showStopButton && serious ? (
        <form action={stopForToday}>
          <button
            type="submit"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border border-line bg-card2 px-3.5 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            <Icon name="check" size={15} />
            {d.alerts.stopToday}
          </button>
        </form>
      ) : null}
    </div>
  );
}
