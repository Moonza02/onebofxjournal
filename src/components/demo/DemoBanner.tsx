import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { fill, type Dict } from '@/lib/i18n';

/** Namuna hisobda doimiy turadigan lenta.
 *
 *  Yopib bo'lmaydi va ataylab: mehmon bu ma'lumot o'ylab topilganini
 *  har ekranda ko'rib tursin, uni haqiqiy natija deb o'ylamasin.
 */
export default function DemoBanner({
  d,
  expiresAt,
}: {
  d: Dict;
  expiresAt: Date | null;
}) {
  const hours = expiresAt
    ? Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)))
    : 24;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber/30 bg-amber-soft px-5 py-2.5 sm:px-[26px]">
      <span className="flex items-center gap-2 text-[12px] font-bold text-amber">
        <Icon name="shield" size={14} />
        {d.demo.bannerTitle}
      </span>

      <span className="min-w-0 text-[12px] leading-relaxed text-amber/90">
        {fill(d.demo.bannerBody, { hours })}
      </span>

      <Link
        href="/register"
        className="ml-auto shrink-0 rounded-[8px] border border-amber/40 px-2.5 py-1 text-[11.5px] font-bold text-amber transition-colors hover:bg-amber/15"
      >
        {d.demo.bannerCta}
      </Link>
    </div>
  );
}
