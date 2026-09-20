'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icons';
import { logout } from '@/actions/auth';
import { useD } from '@/components/i18n/Provider';
import LocaleSwitch from '@/components/i18n/LocaleSwitch';
import type { Dict, Locale } from '@/lib/i18n';

type Item = { icon: IconName; key: keyof Dict['nav']; href: string };

/** Yorliqlar lug'atdan olinadi — bu yerda faqat kalit va manzil. */
const GROUPS: { title: keyof Dict['nav']; items: Item[] }[] = [
  {
    title: 'groupMain',
    items: [
      { icon: 'grid', key: 'dashboard', href: '/panel' },
      { icon: 'list', key: 'trades', href: '/trades' },
      { icon: 'cal', key: 'calendar', href: '/calendar' },
      { icon: 'pen', key: 'journal', href: '/journal' },
    ],
  },
  {
    title: 'groupAnalysis',
    items: [
      { icon: 'chart', key: 'analytics', href: '/analytics' },
      { icon: 'book', key: 'playbook', href: '/playbook' },
      { icon: 'calc', key: 'risk', href: '/risk' },
      { icon: 'shield', key: 'alerts', href: '/alerts' },
      { icon: 'mail', key: 'report', href: '/hisobot' },
      { icon: 'user', key: 'mentor', href: '/mentor' },
    ],
  },
  {
    title: 'groupSettings',
    items: [
      { icon: 'wallet', key: 'accounts', href: '/accounts' },
      { icon: 'lock', key: 'billing', href: '/tarif' },
      { icon: 'sliders', key: 'settings', href: '/sozlamalar' },
    ],
  },
];

export const NAV_ITEMS = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Yon paneldagi son — hozircha faqat o'qilmagan mentor izohlari. */
function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blued px-1.5 font-mono text-[10.5px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function Sidebar({
  userName,
  accountName,
  accountSub,
  badges = {},
  locale,
  isAdmin = false,
}: {
  userName: string;
  accountName: string;
  accountSub: string;
  /** Marshrut bo'yicha sonlar, masalan { '/mentor': 3 }. */
  badges?: Record<string, number>;
  locale: Locale;
  /** Xodim paneli havolasi faqat xodimga ko'rinadi. */
  isAdmin?: boolean;
}) {
  const d = useD();
  const pathname = usePathname();
  const initials = userName.slice(0, 2).toUpperCase();

  const groups = isAdmin
    ? GROUPS.map((group) =>
        group.title === 'groupSettings'
          ? {
              ...group,
              items: [
                ...group.items,
                { icon: 'shield' as const, key: 'admin' as const, href: '/admin' },
              ],
            }
          : group,
      )
    : GROUPS;

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-line2 bg-panel lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-[18px] pt-[22px]">
        <Image
          src="/logo-onebofx.png"
          alt="ONEBO FX"
          width={100}
          height={28}
          priority
          className="h-7 w-[100px] object-contain"
        />
      </div>

      <nav className="flex grow flex-col gap-4 overflow-y-auto px-3 py-1">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-[0.13em] text-[#5D6675]">
              {d.nav[group.title]}
            </div>
            {group.items.map((item) => {
              const on = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] font-semibold transition-colors ${
                    on ? 'bg-card2 text-txt' : 'text-txt2 hover:bg-card2/60 hover:text-txt'
                  }`}
                >
                  <span className={on ? 'text-blue' : 'text-[#6E7889]'}>
                    <Icon name={item.icon} size={18} />
                  </span>
                  {d.nav[item.key]}
                  {badges[item.href] ? <Badge count={badges[item.href]} /> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-line2 p-3">
        <div className="mb-2 flex justify-center">
          <LocaleSwitch current={locale} />
        </div>
        <div className="flex items-center gap-2.5 rounded-[11px] bg-card2 p-2.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-blued font-display text-[13px] font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 grow">
            <div className="truncate text-[12.5px] font-bold text-txt">{accountName}</div>
            <div className="truncate text-[11px] text-txt3">{accountSub}</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label={d.nav.logout}
              title={d.nav.logout}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#5D6675] transition-colors hover:text-loss"
            >
              <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Kichik ekranlar uchun gorizontal navigatsiya. */
export function MobileNav({ badges = {} }: { badges?: Record<string, number> }) {
  const d = useD();
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto border-b border-line2 bg-panel px-4 py-2.5 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold ${
              on ? 'bg-card2 text-txt' : 'text-txt2'
            }`}
          >
            <span className={on ? 'text-blue' : 'text-[#6E7889]'}>
              <Icon name={item.icon} size={16} />
            </span>
            {d.nav[item.key]}
            {badges[item.href] ? <Badge count={badges[item.href]} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
