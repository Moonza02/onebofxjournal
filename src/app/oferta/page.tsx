import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { legalParty } from '@/lib/legal';
import { TRIAL_DAYS } from '@/lib/billing';
import LegalPage from '@/components/legal/LegalPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: `${d.legal.offerTitle} — ${d.app.name}` };
}

export default async function OfferPage() {
  const { locale, d } = await getI18n();
  const l = d.legal;
  const party = legalParty();

  const sections = [
    { title: l.o1Title, body: [l.o1a, l.o1b] },
    { title: l.o2Title, body: [l.o2a, l.o2b, l.o2c] },
    { title: l.o3Title, body: [l.o3a, l.o3b, l.o3c] },
    {
      title: l.o4Title,
      body: [fill(l.o4a, { days: TRIAL_DAYS }), l.o4b, l.o4c],
    },
    { title: l.o5Title, body: [l.o5a, l.o5b, l.o5c] },
    { title: l.o6Title, body: [l.o6a, l.o6b, l.o6c] },
    { title: l.o7Title, body: [l.o7a, l.o7b] },
    { title: l.o8Title, body: [l.o8a, l.o8b] },
    { title: l.o9Title, body: [l.o9a, l.o9b] },
    { title: l.o10Title, body: [l.o10a] },
  ];

  return (
    <LegalPage
      d={d}
      locale={locale}
      title={l.offerTitle}
      intro={fill(l.offerIntro, { site: party.site })}
      sections={sections}
    />
  );
}
