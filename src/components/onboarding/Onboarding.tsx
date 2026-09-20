import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import type { Dict } from '@/lib/i18n';
import type { OnboardingState } from '@/lib/onboarding';

export default function Onboarding({ d, state }: { d: Dict; state: OnboardingState }) {
  const steps: {
    done: boolean;
    title: string;
    body: string;
    cta: string;
    href: string;
    alt?: { label: string; href: string };
  }[] = [
    {
      done: state.accountReady,
      title: d.onboarding.step1Title,
      body: d.onboarding.step1Body,
      cta: d.onboarding.step1Cta,
      href: '/accounts',
    },
    {
      done: state.hasTrade,
      title: d.onboarding.step2Title,
      body: d.onboarding.step2Body,
      cta: d.onboarding.step2Cta,
      href: '/trades/new',
      // Tayyor tarixi bor treyder 200 ta savdoni qo'lda yozmasligi kerak.
      alt: { label: d.onboarding.step2Import, href: '/trades/import' },
    },
    {
      done: state.hasJournal,
      title: d.onboarding.step3Title,
      body: d.onboarding.step3Body,
      cta: d.onboarding.step3Cta,
      href: '/journal',
    },
  ];

  return (
    <Card className="border-blue/25">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-blue-soft text-blue">
          <Icon name="target" size={18} />
        </span>
        <div className="min-w-0 grow">
          <h2 className="font-display text-[16px] font-semibold text-txt">
            {d.onboarding.title}
          </h2>
          <p className="text-[12px] text-txt3">{d.onboarding.sub}</p>
        </div>
        <span className="tnum font-mono text-[12.5px] font-bold text-txt3">
          {steps.filter((s) => s.done).length} / {steps.length}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`flex flex-col rounded-[13px] border p-4 ${
              step.done ? 'border-win/30 bg-win-soft' : 'border-line bg-card2'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                  step.done ? 'bg-win text-white' : 'border border-line bg-card text-txt3'
                }`}
              >
                {step.done ? <Icon name="check" size={11} width={3} /> : i + 1}
              </span>
              <span
                className={`text-[13px] font-bold ${step.done ? 'text-win' : 'text-txt'}`}
              >
                {step.title}
              </span>
            </div>

            <p className="mt-2.5 grow text-[12px] leading-relaxed text-txt3">{step.body}</p>

            {step.done ? (
              <span className="mt-3 text-[11.5px] font-bold text-win">{d.onboarding.done}</span>
            ) : (
              <>
                <Link
                  href={step.href}
                  className="mt-3 inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] border border-blued bg-blued px-3 text-[12px] font-bold text-white transition-colors hover:bg-blueh"
                >
                  {step.cta}
                  <Icon name="chev" size={13} width={2.4} />
                </Link>
                {step.alt ? (
                  <Link
                    href={step.alt.href}
                    className="mt-2 text-[11px] leading-relaxed text-txt4 underline decoration-line underline-offset-2 transition-colors hover:text-txt3"
                  >
                    {step.alt.label}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3.5 text-[11.5px] leading-relaxed text-txt4">
        {d.onboarding.playbookNote}
      </p>
    </Card>
  );
}
