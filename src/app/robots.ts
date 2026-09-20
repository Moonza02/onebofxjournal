import type { MetadataRoute } from 'next';

/** Qidiruv tizimlari uchun.
 *  Ilova ichidagi sahifalar kirishni talab qiladi, shuning uchun ularni
 *  indekslashdan foyda yo'q — faqat ochiq sahifa qoladi.
 */
export default function robots(): MetadataRoute.Robots {
  const site = process.env.APP_URL?.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/panel', '/trades', '/journal', '/analytics', '/mentor', '/tarif', '/accounts', '/alerts', '/calendar', '/hisobot', '/playbook', '/risk', '/sozlamalar', '/admin'],
      },
    ],
    sitemap: site ? `${site}/sitemap.xml` : undefined,
  };
}
