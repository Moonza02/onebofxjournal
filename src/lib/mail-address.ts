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

/** Bepul pochta domenlari — gmail, mail.ru va shu kabilar. */
const FREEMAIL = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'mail.ru',
  'inbox.ru',
  'bk.ru',
  'list.ru',
  'yandex.ru',
  'yandex.com',
  'ya.ru',
  'proton.me',
  'protonmail.com',
]);

/** Jo'natuvchi bepul pochtami?
 *
 *  Nega muhim: `@gmail.com` manzilidan boshqa server orqali xat
 *  jo'natib bo'lmaydi — Gmail'ning DMARC yozuvi buni taqiqlaydi.
 *  Shuning uchun Brevo `From` ni jimgina o'z domeniga almashtiradi
 *  (`...@NNNNNN.brevosend.com`). Xat yetib boradi, lekin qabul
 *  qiluvchi uchun jo'natuvchi notanish — natijada ko'pincha «Spam».
 *
 *  Yagona to'liq yechim — o'z domeni va DKIM. Bu tekshiruv esa shuni
 *  eslatib turadi: bir necha soat "xat kelmadi" deb qidirilgandan
 *  keyin qo'shildi.
 */
export function isFreemail(value: string | null | undefined): boolean {
  const address = mailFromAddress(value);
  if (!address) return false;

  const domain = address.slice(address.lastIndexOf('@') + 1);
  return FREEMAIL.has(domain);
}
