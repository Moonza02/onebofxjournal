'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useD } from '@/components/i18n/Provider';

const TABS = [
  { href: '/analytics', key: 'tabTime' },
  { href: '/analytics/simulyator', key: 'tabSimulator' },
  { href: '/analytics/monte', key: 'tabMonte' },
  { href: '/analytics/solishtirish', key: 'tabCompare' },
] as const;

export default function AnalyticsTabs() {
  const d = useD();
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-line2 bg-panel px-5 py-2.5 sm:px-[26px]">
      {TABS.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={`flex h-9 shrink-0 items-center rounded-[9px] px-3.5 text-[12.5px] font-bold transition-colors ${
              on ? 'bg-card2 text-txt' : 'text-txt2 hover:text-txt'
            }`}
          >
            {d.analytics[tab.key]}
          </Link>
        );
      })}
    </div>
  );
}
