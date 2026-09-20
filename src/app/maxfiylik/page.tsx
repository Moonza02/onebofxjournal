import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import LegalPage from '@/components/legal/LegalPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: `${d.legal.privacyTitle} — ${d.app.name}` };
}

export default async function PrivacyPage() {
  const { locale, d } = await getI18n();
  const l = d.legal;

  const sections = [
    { title: l.p1Title, body: [l.p1a, l.p1b, l.p1c, l.p1d] },
    { title: l.p2Title, body: [l.p2a, l.p2b, l.p2c] },
    { title: l.p3Title, body: [l.p3a, l.p3b, l.p3c] },
    { title: l.p4Title, body: [l.p4a, l.p4b, l.p4c] },
    { title: l.p5Title, body: [l.p5a, l.p5b, l.p5c, l.p5d] },
    { title: l.p6Title, body: [l.p6a, l.p6b, l.p6c] },
    { title: l.p7Title, body: [l.p7a, l.p7b, l.p7c] },
    { title: l.p8Title, body: [l.p8a, l.p8b, l.p8c] },
    { title: l.p9Title, body: [l.p9a, l.p9b] },
    { title: l.p10Title, body: [l.p10a, l.p10b] },
  ];

  return (
    <LegalPage
      d={d}
      locale={locale}
      title={l.privacyTitle}
      intro={l.privacyIntro}
      sections={sections}
    />
  );
}
