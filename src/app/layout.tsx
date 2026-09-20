import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getI18n } from '@/lib/i18n/server';
import { LOCALE_TAGS } from '@/lib/i18n';

/** Sarlavha va tavsif ham tanlangan tilda — ulashilgan havola
 *  foydalanuvchi ko'rgan til bilan bir xil ko'rinadi.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getI18n();
  const title = `${d.app.name} — ${d.app.tagline}`;
  const site = process.env.APP_URL?.replace(/\/+$/, '');

  return {
    // Havola Telegram yoki ijtimoiy tarmoqda ulashilganda sarlavha va
    // tavsif shu yerdan olinadi.
    metadataBase: site ? new URL(site) : undefined,
    title,
    description: d.app.description,
    applicationName: d.app.name,
    openGraph: {
      type: 'website',
      siteName: d.app.name,
      title,
      description: d.app.description,
      locale: LOCALE_TAGS[locale].replace('-', '_'),
      images: ['/logo-onebofx.png'],
    },
    twitter: {
      card: 'summary',
      title,
      description: d.app.description,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#07090D',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();

  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body>{children}</body>
    </html>
  );
}
