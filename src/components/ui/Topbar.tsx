import Link from 'next/link';
import { Icon } from './icons';

export default function Topbar({
  title,
  sub,
  actions,
  cta,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  cta?: { label: string; href: string } | null;
}) {
  return (
    <div className="flex h-[66px] shrink-0 items-center gap-4 border-b border-line2 bg-panel px-5 sm:px-[26px]">
      <div className="min-w-0 grow">
        <h1 className="truncate font-display text-[19px] font-semibold tracking-[-0.01em] text-txt">
          {title}
        </h1>
        {sub ? <p className="mt-px truncate text-[11.5px] text-txt3">{sub}</p> : null}
      </div>

      {actions}

      {cta ? (
        <Link
          href={cta.href}
          className="flex h-9 shrink-0 items-center gap-[7px] rounded-[9px] bg-blued px-[15px] text-[13px] font-bold text-white transition-colors hover:bg-blueh"
        >
          <Icon name="plus" size={16} width={2.2} />
          <span className="hidden sm:inline">{cta.label}</span>
        </Link>
      ) : null}
    </div>
  );
}
