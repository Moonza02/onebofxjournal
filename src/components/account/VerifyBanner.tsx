'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import type { VerifyState } from '@/actions/verify';

/** Pochta tasdiqlanmaganda turadigan lenta.
 *
 *  Yumshoq ohangda: ilova to'liq ishlayveradi, faqat xat jo'natish
 *  kutib turadi. Ishni to'xtatadigan to'siq emas — eslatma.
 */
export default function VerifyBanner({
  action,
}: {
  action: (prev: VerifyState, formData: FormData) => Promise<VerifyState>;
}) {
  const d = useD();
  const [state, formAction] = useActionState<VerifyState, FormData>(action, {});

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-blue/25 bg-blue-soft px-5 py-2.5 sm:px-[26px]">
      <span className="flex items-center gap-2 text-[12px] font-bold text-bluel">
        <Icon name="mail" size={14} />
        {d.verify.bannerTitle}
      </span>

      <span className="min-w-0 text-[12px] leading-relaxed text-bluel/90">
        {state.already
          ? d.verify.alreadyBody
          : state.sent
            ? d.verify.bannerSent
            : state.error || d.verify.bannerBody}
      </span>

      {state.already ? null : (
        <span className="ml-auto flex shrink-0 items-center gap-2.5">
          {/* Kodni kiritadigan joy shu yerdan ochiladi. Bu havola
              boshida yo'q edi va kod kelgani bilan uni hech qayerga
              yozib bo'lmasdi. */}
          <Link
            href="/tasdiqlash"
            className="rounded-[8px] border border-blue/40 px-2.5 py-1 text-[11.5px] font-bold text-bluel transition-colors hover:bg-blue/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {d.verify.bannerEnter}
          </Link>

          {state.sent ? null : (
            <form action={formAction}>
              <Resend label={d.verify.bannerCta} sending={d.verify.bannerSending} />
            </form>
          )}
        </span>
      )}
    </div>
  );
}

function Resend({ label, sending }: { label: string; sending: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[8px] border border-blue/40 px-2.5 py-1 text-[11.5px] font-bold text-bluel transition-colors hover:bg-blue/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60"
    >
      {pending ? sending : label}
    </button>
  );
}
