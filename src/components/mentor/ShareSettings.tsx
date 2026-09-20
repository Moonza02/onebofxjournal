'use client';

import { useRef } from 'react';
import { updateSharing } from '@/actions/mentor';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import type { Dict } from '@/lib/i18n';

const ROWS = [
  { name: 'shareTrades', label: 'shareTrades', hint: 'shareTradesHint' },
  { name: 'shareAlerts', label: 'shareAlerts', hint: 'shareAlertsHint' },
  { name: 'shareJournal', label: 'shareJournal', hint: 'shareJournalHint' },
] as const;

function label(d: Dict, key: (typeof ROWS)[number]['label' | 'hint']): string {
  return d.mentor[key];
}

/** Nimani ulashish — o'quvchi nazoratida. O'zgarish darhol saqlanadi. */
export default function ShareSettings({
  id,
  values,
}: {
  id: string;
  values: { shareTrades: boolean; shareAlerts: boolean; shareJournal: boolean };
}) {
  const d = useD();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateSharing} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />

      {ROWS.map((row) => (
        <label
          key={row.name}
          className="flex cursor-pointer items-center gap-3 border-b border-line2 py-2.5 last:border-b-0"
        >
          <input
            type="checkbox"
            name={row.name}
            defaultChecked={values[row.name]}
            onChange={() => formRef.current?.requestSubmit()}
            className="peer sr-only"
          />
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border border-line bg-card2 text-transparent peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white">
            <Icon name="check" size={11} width={3} />
          </span>
          <span className="min-w-0 grow">
            <span className="block text-[12.5px] font-semibold text-txt2">
              {label(d, row.label)}
            </span>
            <span className="block text-[11px] text-txt4">{label(d, row.hint)}</span>
          </span>
        </label>
      ))}

      <noscript>
        <button
          type="submit"
          className="mt-2 inline-flex h-[32px] cursor-pointer items-center rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt2"
        >
          {d.common.save}
        </button>
      </noscript>
    </form>
  );
}
