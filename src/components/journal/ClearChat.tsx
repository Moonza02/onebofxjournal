'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { clearCoachChat } from '@/actions/coach';
import { Card } from '@/components/ui/primitives';
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
      <Icon name="trash" size={13} />
      {pending ? d.coach.clearing : d.coach.clearYes}
    </button>
  );
}

/** Suhbatni tozalash — tasdiqsiz o'chirilmaydi.
 *  Brauzer dialogidan foydalanmaymiz: u sahifani bloklaydi.
 */
export default function ClearChat({ count }: { count: number }) {
  const d = useD();
  const [asking, setAsking] = useState(false);

  return (
    <Card padding="p-4">
      {asking ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-[12px] leading-relaxed text-txt2">
            {fill(d.coach.clearConfirm, { n: count })}
          </p>
          <div className="flex gap-2">
            <form action={clearCoachChat}>
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
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt3 transition-colors hover:text-txt2"
        >
          <Icon name="trash" size={13} />
          {d.coach.clear}
        </button>
      )}
    </Card>
  );
}
