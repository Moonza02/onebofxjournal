import Link from 'next/link';
import { Empty } from '@/components/ui/primitives';
import { signedMoney } from '@/lib/format';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

/** Filtr tugmasi — holat URL da turadi, shuning uchun havola. */
export function Toggle({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-8 shrink-0 items-center rounded-lg border px-3 text-[12px] font-semibold transition-colors ${
        active ? 'border-blue bg-blue-soft text-txt' : 'border-line bg-card2 text-txt2 hover:text-txt'
      }`}
    >
      {label}
    </Link>
  );
}

export function Delta({ value }: { value: number }) {
  return (
    <span className={`tnum font-mono text-[13px] font-bold ${value >= 0 ? 'text-win' : 'text-loss'}`}>
      {signedMoney(value)}
    </span>
  );
}

/** Ma'lumot yetarli emasligini bir joyda aytadi — har sahifada takrorlanmasin. */
export async function NotEnough({ count, need = 5 }: { count: number; need?: number }) {
  const d = await getDict();
  return (
    <div className="p-5 sm:p-[22px] sm:px-[26px]">
      <Empty
        icon="chart"
        title={d.analytics.notEnoughTitle}
        hint={fill(d.analytics.notEnoughHint, { count, need })}
      />
    </div>
  );
}

/** URL parametrlarini yangilaydigan havola tuzadi. */
export function buildQuery(base: string, search: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function toggleInList(current: string | undefined, value: string): string {
  const list = (current ?? '').split(',').filter(Boolean);
  const index = list.indexOf(value);
  if (index === -1) list.push(value);
  else list.splice(index, 1);
  return list.join(',');
}
