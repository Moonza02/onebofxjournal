import Link from 'next/link';
import { Icon, type IconName } from './icons';

/* ---------------------------------------------------------------- Card */

export function Card({
  children,
  className = '',
  padding = 'p-[18px]',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section className={`rounded-[14px] border border-line bg-card ${padding} ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <h2 className="grow font-display text-[14.5px] font-semibold text-txt">{children}</h2>
      {right}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold tracking-[0.1em] text-txt3">{children}</div>
  );
}

/* ---------------------------------------------------------------- Chip */

type ChipTone = 'win' | 'loss' | 'amber' | 'blue' | 'neutral';

const CHIP_TONES: Record<ChipTone, string> = {
  win: 'bg-win-soft text-win',
  loss: 'bg-loss-soft text-loss',
  amber: 'bg-amber-soft text-amber',
  blue: 'bg-blue-soft text-bluel',
  neutral: 'bg-[#151A22] text-txt2',
};

export function Chip({
  children,
  tone = 'neutral',
  icon,
  className = '',
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[7px] px-2 py-[3px] font-mono text-[11.5px] font-bold ${CHIP_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={11} width={2.4} /> : null}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- KPI */

export function Kpi({
  label,
  value,
  sub,
  tone = 'plain',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'plain' | 'win' | 'loss' | 'amber';
}) {
  const valueTone =
    tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : tone === 'amber' ? 'text-amber' : 'text-txt';
  const subTone =
    tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : tone === 'amber' ? 'text-amber' : 'text-txt3';

  return (
    // Telefonda ikkitadan joylashadi. `basis-0` yolg'iz yetmaydi: karta
    // qisqarsa ham ichidagi raqam qisqarmaydi (Intl mingliklarni
    // uzilmas bo'shliq bilan ajratadi), va qator ekrandan chiqib ketadi.
    <div className="min-w-0 grow basis-[calc(50%-6px)] rounded-[13px] border border-line bg-card px-4 pb-3.5 pt-[15px] sm:basis-0">
      <SectionLabel>{label}</SectionLabel>
      <div
        className={`tnum mt-2.5 break-words font-mono text-[21px] font-semibold tracking-[-0.02em] sm:text-2xl ${valueTone}`}
      >
        {value}
      </div>
      {sub ? <div className={`mt-[5px] text-[11.5px] font-semibold ${subTone}`}>{sub}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */

type BtnKind = 'primary' | 'ghost' | 'danger';

const BTN_KINDS: Record<BtnKind, string> = {
  primary: 'bg-blued text-white border-blued hover:bg-blueh',
  ghost: 'bg-card2 text-txt2 border-line hover:text-txt hover:border-[#2A3240]',
  danger: 'bg-loss-soft text-loss border-loss/35 hover:bg-loss/20',
};

const BTN_BASE =
  'inline-flex h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[9px] border px-3.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55';

export function Btn({
  children,
  kind = 'ghost',
  icon,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; icon?: IconName }) {
  return (
    <button className={`${BTN_BASE} ${BTN_KINDS[kind]} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

export function BtnLink({
  children,
  href,
  kind = 'ghost',
  icon,
  className = '',
}: {
  children: React.ReactNode;
  href: string;
  kind?: BtnKind;
  icon?: IconName;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BTN_BASE} ${BTN_KINDS[kind]} ${className}`}>
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- Form */

const INPUT =
  'box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 text-[13.5px] text-txt outline-none transition-colors focus:border-blue';

export function Field({
  label,
  hint,
  mono = true,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; mono?: boolean }) {
  return (
    <label className={`flex min-w-0 grow basis-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{label}</span>
      <input className={`${INPUT} ${mono ? 'font-mono tnum' : ''}`} {...rest} />
      {hint ? <span className="text-[10.5px] text-txt4">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <label className={`flex min-w-0 grow basis-0 flex-col gap-1.5 ${className}`}>
      {label ? (
        <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{label}</span>
      ) : null}
      <select className={`${INPUT} appearance-none`} {...rest}>
        {children}
      </select>
      {hint ? <span className="text-[10.5px] text-txt4">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{label}</span>
      ) : null}
      <textarea
        className="box-border w-full resize-none rounded-[11px] border border-line bg-card2 px-3.5 py-3 text-[13px] leading-relaxed text-txt outline-none transition-colors focus:border-blue"
        {...rest}
      />
    </label>
  );
}

/* ---------------------------------------------------------------- Rows */

export function KeyValue({
  label,
  value,
  tone = 'plain',
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'plain' | 'win' | 'loss' | 'amber' | 'muted';
  mono?: boolean;
}) {
  const t =
    tone === 'win'
      ? 'text-win'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'amber'
          ? 'text-amber'
          : tone === 'muted'
            ? 'text-txt2'
            : 'text-txt';
  return (
    <div className="flex items-center gap-2.5 border-b border-line2 py-2 last:border-b-0">
      <span className="grow text-xs text-txt3">{label}</span>
      <span className={`${mono ? 'font-mono tnum' : ''} text-[12.5px] font-semibold ${t}`}>{value}</span>
    </div>
  );
}

export function RuleRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-[7px]">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
          passed ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss'
        }`}
      >
        <Icon name={passed ? 'check' : 'x'} size={12} width={2.6} />
      </span>
      <span className={`grow text-[12.5px] font-medium ${passed ? 'text-txt2' : 'text-txt'}`}>
        {label}
      </span>
    </div>
  );
}

export function Meter({
  label,
  value,
  max = 5,
  tone = 'blue',
}: {
  label: string;
  value: number;
  max?: number;
  tone?: 'blue' | 'win' | 'loss' | 'amber';
}) {
  const fill =
    tone === 'win' ? 'bg-win' : tone === 'loss' ? 'bg-loss' : tone === 'amber' ? 'bg-amber' : 'bg-blue';
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[84px] shrink-0 text-xs text-txt3">{label}</span>
      <span className="flex grow gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-5 rounded-[3px] ${i < value ? fill : 'bg-[#1B212B]'}`}
          />
        ))}
      </span>
      <span className="font-mono text-[11.5px] font-bold text-txt2">
        {value}/{max}
      </span>
    </div>
  );
}

/** Foiz polosasi — kunlik limit, drawdown, maqsad uchun. */
export function Bar({
  value,
  tone = 'blue',
  height = 8,
}: {
  value: number;
  tone?: 'blue' | 'win' | 'loss' | 'amber';
  height?: number;
}) {
  const fill =
    tone === 'win' ? 'bg-win' : tone === 'loss' ? 'bg-loss' : tone === 'amber' ? 'bg-amber' : 'bg-blue';
  return (
    <div
      className="overflow-hidden rounded-[5px] bg-[#151A22]"
      style={{ height }}
      role="presentation"
    >
      <div
        className={`rounded-[5px] ${fill}`}
        style={{ height, width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Empty */

export function Empty({
  icon = 'list',
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-line px-6 py-14 text-center">
      <span className="text-[#4A5464]">
        <Icon name={icon} size={26} width={1.5} />
      </span>
      <div className="text-[13.5px] font-bold text-txt2">{title}</div>
      {hint ? <div className="max-w-[420px] text-[12px] leading-relaxed text-txt3">{hint}</div> : null}
      {action}
    </div>
  );
}
