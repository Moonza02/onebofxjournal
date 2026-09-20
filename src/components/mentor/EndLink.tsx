'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { endMentorship } from '@/actions/mentor';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';

function Confirm() {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[9px] border border-loss/35 bg-loss-soft px-3 text-[12px] font-bold text-loss transition-colors hover:bg-loss/20 disabled:opacity-55"
    >
      {pending ? d.mentor.ending : d.mentor.endYes}
    </button>
  );
}

/** Aloqani to'xtatish. Yozishmalar o'chmaydi — aloqa arxivga o'tadi. */
export default function EndLink({ id, who }: { id: string; who: string }) {
  const d = useD();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt3 transition-colors hover:text-txt2"
      >
        <Icon name="logout" size={13} />
        {d.mentor.endLink}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[12px] leading-relaxed text-txt2">
        {fill(d.mentor.endConfirm, { who })}
      </p>
      <div className="flex gap-2">
        <form action={endMentorship}>
          <input type="hidden" name="id" value={id} />
          <Confirm />
        </form>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt2 transition-colors hover:text-txt"
        >
          {d.common.cancel}
        </button>
      </div>
    </div>
  );
}
