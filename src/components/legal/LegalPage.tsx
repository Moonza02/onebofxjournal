import Image from 'next/image';
import Link from 'next/link';
import { legalParty, LEGAL_UPDATED } from '@/lib/legal';
import { fill, type Dict, type Locale } from '@/lib/i18n';
import { longDate } from '@/lib/format';
import LocaleSwitch from '@/components/i18n/LocaleSwitch';

export type LegalSection = { title: string; body: string[] };

/** Huquqiy hujjatlar uchun umumiy sahifa.
 *
 *  Matn bo'limlar ro'yxati sifatida keladi — shunda ikkala hujjat bir
 *  xil ko'rinadi va yangi bo'lim qo'shish oson.
 */
export default function LegalPage({
  d,
  locale,
  title,
  intro,
  sections,
}: {
  d: Dict;
  locale: Locale;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  const party = legalParty();

  const rows = [
    { label: d.legal.partyCompany, value: party.company },
    { label: d.legal.partyStir, value: party.stir },
    { label: d.legal.partyAddress, value: party.address },
    { label: d.legal.partyEmail, value: party.email },
    { label: d.legal.partyPhone, value: party.phone },
    { label: d.legal.partySite, value: party.site },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line2">
        <div className="mx-auto flex w-full max-w-[820px] items-center gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/">
            <Image
              src="/logo-onebofx.png"
              alt="ONEBO FX"
              width={104}
              height={29}
              className="h-[29px] w-[104px] object-contain"
            />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <LocaleSwitch current={locale} />
            <Link
              href="/"
              className="text-[12.5px] font-semibold text-txt3 transition-colors hover:text-txt2"
            >
              {d.legal.backHome}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-txt sm:text-[38px]">
          {title}
        </h1>

        <p className="mt-2.5 font-mono text-[11.5px] text-txt4">
          {fill(d.legal.updated, { date: longDate(new Date(LEGAL_UPDATED), locale) })}
        </p>

        <p className="mt-6 text-[14px] leading-relaxed text-txt2">{intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[16px] font-bold text-txt">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-[13.5px] leading-relaxed text-txt2">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ----------------------------------------------------- rekvizitlar */}
        <section className="mt-12 rounded-[15px] border border-line bg-card p-5">
          <h2 className="text-[15px] font-bold text-txt">{d.legal.partyTitle}</h2>

          {!party.complete ? (
            <p className="mt-3 rounded-[10px] border border-amber/30 bg-amber-soft px-3 py-2.5 text-[12px] leading-relaxed text-amber">
              {d.legal.partyMissing}
            </p>
          ) : null}

          <dl className="mt-4 flex flex-col">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line2 py-2.5 last:border-b-0"
              >
                <dt className="w-[110px] shrink-0 text-[12px] text-txt3">{row.label}</dt>
                <dd className="min-w-0 text-[12.5px] font-semibold text-txt2">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap gap-5">
          <Link
            href="/oferta"
            className="text-[12.5px] font-semibold text-txt3 transition-colors hover:text-txt2"
          >
            {d.legal.offerLink}
          </Link>
          <Link
            href="/maxfiylik"
            className="text-[12.5px] font-semibold text-txt3 transition-colors hover:text-txt2"
          >
            {d.legal.privacyLink}
          </Link>
        </div>
      </main>
    </div>
  );
}
