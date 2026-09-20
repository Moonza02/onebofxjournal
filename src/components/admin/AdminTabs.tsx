import Link from 'next/link';
import type { Dict } from '@/lib/i18n';

/** Xodim panelining bo'limlari. */
export default function AdminTabs({ d, active }: { d: Dict; active: string }) {
  const tabs = [
    { href: '/admin', label: d.admin.navOverview },
    { href: '/admin/tolovlar', label: d.admin.navPayments },
    { href: '/admin/xatolar', label: d.admin.navErrors },
  ];

  return (
    <div className="flex gap-1.5 border-b border-line2 bg-panel px-5 py-2.5 sm:px-[26px]">
      {tabs.map((tab) => {
        const on = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-[9px] px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
              on ? 'bg-blue-soft text-txt' : 'text-txt3 hover:text-txt2'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
