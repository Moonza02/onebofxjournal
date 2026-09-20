import type { MetadataRoute } from 'next';
import { getI18n } from '@/lib/i18n/server';

/** Telefonga o'rnatish uchun.
 *
 *  `start_url` — panel: o'rnatgan odam allaqachon kirgan bo'ladi,
 *  shuning uchun uni ochiq sahifaga olib borishning hojati yo'q.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { d } = await getI18n();

  return {
    name: `${d.app.name} — ${d.app.tagline}`,
    short_name: d.app.name,
    description: d.app.description,
    start_url: '/panel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0E1116',
    theme_color: '#0E1116',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
