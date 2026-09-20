import type { MetadataRoute } from 'next';

/** Ochiq sahifalar ro'yxati. Ilova ichi kirishni talab qiladi va
 *  bu yerga tushmaydi.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.APP_URL?.replace(/\/+$/, '') || 'https://onebofx.uz';
  const now = new Date();

  return [
    { url: `${site}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${site}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${site}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${site}/oferta`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site}/maxfiylik`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
