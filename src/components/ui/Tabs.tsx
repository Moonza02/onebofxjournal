import Link from 'next/link';
import type { Dict } from '@/lib/i18n';

export type Tab = { href: string; label: string };

/** Sahifa ichidagi bo'limlar. Har bo'lim alohida marshrut —
 *  shunda bitta sahifaga hamma narsa tiqilmaydi va har biri
 *  o'z ma'lumotini alohida yuklaydi.
 */
export default function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-line2 bg-panel px-5 py-2.5 sm:px-[26px]">
      {tabs.map((tab) => {
        const on = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={`flex h-9 shrink-0 items-center rounded-[9px] px-3.5 text-[12.5px] font-bold transition-colors ${
              on ? 'bg-card2 text-txt' : 'text-txt2 hover:text-txt'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function journalTabs(d: Dict): Tab[] {
  return [
    { href: '/journal', label: d.journal.tabJournal },
    { href: '/journal/suhbat', label: d.journal.tabChat },
  ];
}
