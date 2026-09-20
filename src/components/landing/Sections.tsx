import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icons';
import { PLAN_ORDER, PLANS, sum, TRIAL_DAYS } from '@/lib/billing';
import { fill, type Dict } from '@/lib/i18n';

/* ---------------------------------------------------------------- umumiy */

export function Section({
  id,
  title,
  sub,
  children,
}: {
  id?: string;
  title?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line2 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto w-full max-w-[1120px]">
        {title ? (
          <div className="mb-10 max-w-[620px]">
            <h2 className="font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-txt sm:text-[34px]">
              {title}
            </h2>
            {sub ? <p className="mt-3 text-[14px] leading-relaxed text-txt3">{sub}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- muammo */

export function Problems({ d }: { d: Dict }) {
  const rows = [
    { title: d.landing.problem1Title, body: d.landing.problem1Body },
    { title: d.landing.problem2Title, body: d.landing.problem2Body },
    { title: d.landing.problem3Title, body: d.landing.problem3Body },
  ];

  return (
    <Section title={d.landing.problemTitle} sub={d.landing.problemSub}>
      <div className="grid gap-3.5 md:grid-cols-3">
        {rows.map((row, i) => (
          <div key={row.title} className="rounded-[15px] border border-line bg-card p-5">
            <span className="font-mono text-[12px] font-bold text-txt4">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-2.5 text-[15px] font-bold text-txt">{row.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-txt3">{row.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- imkoniyatlar */

export function Features({ d }: { d: Dict }) {
  const cards: { icon: IconName; title: string; body: string }[] = [
    { icon: 'list', title: d.landing.f1Title, body: d.landing.f1Body },
    { icon: 'check', title: d.landing.f2Title, body: d.landing.f2Body },
    { icon: 'chart', title: d.landing.f3Title, body: d.landing.f3Body },
    { icon: 'calc', title: d.landing.f4Title, body: d.landing.f4Body },
    { icon: 'shield', title: d.landing.f5Title, body: d.landing.f5Body },
    { icon: 'brain', title: d.landing.f6Title, body: d.landing.f6Body },
    { icon: 'mail', title: d.landing.f7Title, body: d.landing.f7Body },
    { icon: 'user', title: d.landing.f8Title, body: d.landing.f8Body },
  ];

  return (
    <Section id="imkoniyatlar" title={d.landing.featuresTitle} sub={d.landing.featuresSub}>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[15px] border border-line bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-blue-soft text-blue">
              <Icon name={card.icon} size={17} />
            </span>
            <h3 className="mt-3.5 text-[14px] font-bold text-txt">{card.title}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-txt3">{card.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- nima yo'q */

export function Honest({ d }: { d: Dict }) {
  const lines = [d.landing.h1, d.landing.h2, d.landing.h3, d.landing.h4];

  return (
    <Section title={d.landing.honestTitle} sub={d.landing.honestSub}>
      <div className="grid gap-3 sm:grid-cols-2">
        {lines.map((line) => (
          <div
            key={line}
            className="flex items-start gap-3 rounded-[13px] border border-line bg-card2 px-4 py-3.5"
          >
            <span className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-loss-soft text-loss">
              <Icon name="x" size={12} width={2.8} />
            </span>
            <span className="text-[13px] leading-relaxed text-txt2">{line}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ qanday ishlaydi */

export function How({ d }: { d: Dict }) {
  const steps = [
    { title: d.landing.how1Title, body: d.landing.how1Body },
    { title: d.landing.how2Title, body: d.landing.how2Body },
    { title: d.landing.how3Title, body: d.landing.how3Body },
  ];

  return (
    <Section title={d.landing.howTitle}>
      <div className="grid gap-3.5 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue/40 bg-blue-soft font-mono text-[13px] font-bold text-bluel">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-bold text-txt">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-txt3">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- tarif */

export function Pricing({ d }: { d: Dict }) {
  return (
    <Section id="tarif" title={d.landing.pricingTitle} sub={d.landing.pricingSub}>
      <div className="grid gap-3.5 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const spec = PLANS[key];
          const plan = d.plans[key];
          const popular = key === 'PRO';

          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-[15px] border p-5 ${
                popular ? 'border-blue bg-card' : 'border-line bg-card'
              }`}
            >
              {popular ? (
                <span className="absolute -top-2.5 left-5 rounded-[7px] bg-blued px-2 py-[3px] text-[10.5px] font-bold text-white">
                  {d.landing.pricingPopular}
                </span>
              ) : null}

              <h3 className="text-[16px] font-bold text-txt">{plan.name}</h3>
              <p className="mt-1 text-[12px] text-txt3">{plan.tagline}</p>

              <div className="mt-4 flex items-end gap-1.5">
                <span className="tnum font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-txt">
                  {spec.monthly === 0 ? d.landing.pricingFree : sum(spec.monthly, d.billing.currency)}
                </span>
                {spec.monthly > 0 ? (
                  <span className="pb-[3px] text-[12px] text-txt3">{d.billing.perMonth}</span>
                ) : null}
              </div>

              <ul className="mt-5 flex grow flex-col gap-2">
                {plan.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-[3px] shrink-0 text-blue">
                      <Icon name="check" size={12} width={3} />
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-txt2">{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-6 flex h-11 items-center justify-center rounded-[11px] text-[13px] font-bold transition-colors ${
                  popular
                    ? 'bg-blued text-white hover:bg-blueh'
                    : 'border border-line bg-card2 text-txt2 hover:text-txt'
                }`}
              >
                {d.landing.pricingCta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[12.5px] leading-relaxed text-txt3">
        {fill(d.landing.trialNote, { days: TRIAL_DAYS })} {d.landing.pricingNote}
      </p>
    </Section>
  );
}

/* --------------------------------------------------------------- savollar */

export function Faq({ d }: { d: Dict }) {
  const rows = [
    { q: d.landing.q1, a: d.landing.a1 },
    { q: d.landing.q2, a: d.landing.a2 },
    { q: d.landing.q3, a: d.landing.a3 },
    { q: d.landing.q4, a: d.landing.a4 },
    { q: d.landing.q5, a: d.landing.a5 },
  ];

  return (
    <Section id="savollar" title={d.landing.faqTitle}>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          // <details> — ochilish uchun JavaScript kerak emas.
          <details
            key={row.q}
            className="group rounded-[13px] border border-line bg-card px-4 py-3.5 open:bg-card2"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 text-[14px] font-bold text-txt marker:hidden">
              <span className="min-w-0 grow">{row.q}</span>
              <span className="shrink-0 text-txt3 transition-transform group-open:rotate-180">
                <Icon name="chevd" size={15} />
              </span>
            </summary>
            <p className="mt-3 max-w-[760px] text-[13px] leading-relaxed text-txt2">{row.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
