/** `MAIL_FROM` dagi manzilni ajratib olish: `Nom <a@b.c>` → `a@b.c`.
 *
 *  Alohida faylda turadi va hech narsaga bog'lanmaydi — shunda uni
 *  server ko'tarilishida (`instrumentation.ts`) nodemailer'ni
 *  yuklamasdan chaqirsa bo'ladi.
 *
 *  Nega kerak: ko'p provayder — jumladan Gmail — faqat
 *  autentifikatsiya qilingan manzildan jo'natishga ruxsat beradi.
 *  `MAIL_FROM` boshqasini ko'rsatsa xat rad etiladi, sozlama esa
 *  tashqaridan joyida ko'rinaveradi.
 */
export function mailFromAddress(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;

  const angled = text.match(/<([^>]+)>/);
  const address = (angled ? angled[1] : text).trim().toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}
