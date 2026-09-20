'use client';

import { useActionState } from 'react';
import { startDemo, type DemoState } from '@/actions/demo';
import { Icon } from '@/components/ui/icons';

/** «Namunani ko'rish» tugmasi.
 *
 *  Matnlar prop bilan keladi, lug'at orqali emas: ochiq sahifa — birinchi
 *  ko'rinadigan sahifa, unga butun lug'atni yuklashning hojati yo'q.
 *
 *  Namuna hisob yaratish bir necha soniya oladi (ellikdan ortiq yozuv),
 *  shuning uchun bosilgandan keyin holat ko'rsatiladi.
 */
export default function DemoButton({
  label,
  busy,
  tone = 'quiet',
}: {
  label: string;
  busy: string;
  tone?: 'quiet' | 'loud';
}) {
  const [state, action, pending] = useActionState<DemoState, FormData>(
    async () => startDemo(),
    {},
  );

  const loud = 'border border-blued bg-blued text-white hover:bg-blueh';
  const quiet = 'border border-line bg-card2 text-txt2 hover:text-txt';

  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className={`flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          tone === 'loud' ? loud : quiet
        }`}
      >
        {pending ? null : <Icon name="grid" size={15} />}
        {pending ? busy : label}
      </button>

      {state.error ? (
        <p role="alert" className="max-w-[300px] text-[12px] font-semibold leading-relaxed text-loss">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
