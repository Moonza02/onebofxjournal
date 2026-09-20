import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import LocaleSwitch from '@/components/i18n/LocaleSwitch';
import Mock from '@/components/landing/Mock';
import DemoButton from '@/components/landing/DemoButton';
import { Faq, Features, Honest, How, Pricing, Problems } from '@/components/landing/Sections';

export const dynamic = 'force-dynamic';

/** Ochiq sahifa.
 *
 *  Kirgan foydalanuvchi bu yerda ushlanib qolmaydi — to'g'ridan-to'g'ri
 *  panelga o'tadi. Sahifada hech qanday va'da yo'q: nima borligi va
 *  nima **yo'qligi** aniq yozilgan.
 */
export default async function LandingPage() {
  if (await getUser()) redirect('/panel');

  const { locale, d } = await getI18n();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-bg">
      {/* ------------------------------------------------------------ menyu */}
      <header className="sticky top-0 z-20 border-b border-line2 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1120px] items-center gap-4 px-5 py-3.5 sm:px-8">
          <Image
            src="/logo-onebofx.png"
            alt="ONEBO FX"
            width={118}
            height={33}
            priority
            className="h-[33px] w-[118px] object-contain"
          />

          <nav className="ml-6 hidden items-center gap-6 lg:flex">
            {[
              { href: '#imkoniyatlar', label: d.landing.navFeatures },
              { href: '#tarif', label: d.landing.navPricing },
              { href: '#savollar', label: d.landing.navFaq },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] font-semibold text-txt3 transition-colors hover:text-txt"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <LocaleSwitch current={locale} />

            <Link
              href="/login"
              className="hidden h-[34px] items-center rounded-[9px] border border-line bg-card2 px-3.5 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt sm:flex"
            >
              {d.landing.navSignIn}
            </Link>
            <Link
              href="/register"
              className="flex h-[34px] items-center rounded-[9px] bg-blued px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh"
            >
              {d.landing.navStart}
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- qahramon */}
      <section className="px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 lg:grid-cols-[1fr_460px]">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-blue/35 bg-blue-soft px-3 py-1 text-[11.5px] font-bold text-bluel">
              {d.landing.heroBadge}
            </span>

            <h1 className="mt-5 max-w-[620px] font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] text-txt sm:text-[54px]">
              {d.landing.heroTitle} <span className="text-blue">{d.landing.heroAccent}</span>
              {d.landing.heroTitleEnd}
            </h1>

            <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-txt2">
              {d.landing.heroSub}
            </p>

            <div className="mt-8 flex flex-wrap items-start gap-3">
              <Link
                href="/register"
                className="flex h-12 items-center rounded-xl bg-blued px-6 text-[14px] font-bold text-white transition-colors hover:bg-blueh"
              >
                {d.landing.heroCta}
              </Link>
              <DemoButton label={d.demo.ctaButton} busy={d.demo.opening} />
            </div>

            <p className="mt-3.5 max-w-[460px] text-[12.5px] leading-relaxed text-txt3">
              {d.landing.heroNote} {d.demo.ctaNote}
            </p>
          </div>

          <div className="min-w-0">
            <Mock d={d} />
          </div>
        </div>
      </section>

      <Problems d={d} />
      <Features d={d} />
      <Honest d={d} />
      <How d={d} />
      <Pricing d={d} />
      <Faq d={d} />

      {/* -------------------------------------------------------- yakuniy */}
      <section className="border-t border-line2 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto w-full max-w-[1120px] rounded-[18px] border border-blue/30 bg-blue-soft px-6 py-10 text-center sm:px-10 sm:py-14">
          <h2 className="font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-txt sm:text-[32px]">
            {d.landing.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-txt2">
            {d.landing.ctaSub}
          </p>
          <div className="mt-7 flex flex-wrap items-start justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-xl bg-blued px-7 text-[14px] font-bold text-white transition-colors hover:bg-blueh"
            >
              {d.landing.ctaButton}
            </Link>
            <DemoButton label={d.demo.ctaButton} busy={d.demo.opening} />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- pastki */}
      <footer className="border-t border-line2 px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <Image
              src="/logo-onebofx.png"
              alt="ONEBO FX"
              width={100}
              height={28}
              className="h-7 w-[100px] object-contain opacity-70"
            />
            <span className="text-[12px] text-txt3">{d.landing.footerTagline}</span>

            <div className="ml-auto flex flex-wrap items-center gap-5">
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
              <Link
                href="/login"
                className="text-[12.5px] font-semibold text-txt3 transition-colors hover:text-txt2"
              >
                {d.landing.navSignIn}
              </Link>
            </div>
          </div>

          <p className="max-w-[760px] text-[11.5px] leading-relaxed text-txt4">
            {d.landing.footerDisclaimer}
          </p>

          <p className="text-[11.5px] text-txt4">
            © {year} ONEBO FX. {d.landing.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
}
