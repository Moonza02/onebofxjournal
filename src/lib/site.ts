/** Ilova manzili — bitta joyda o'qiladi va tartibga solinadi.
 *
 *  `APP_URL` ni odam qo'l bilan yozadi, ya'ni u xato bo'lishi tabiiy:
 *  sxemasiz ("onebofx.uz"), oxirida chiziq bilan, bo'sh joy bilan yoki
 *  umuman o'rnini bosuvchi so'z ("MANZIL") bo'lib qolishi mumkin.
 *
 *  Muhimi shu: yaroqsiz qiymat **hech qachon** sahifani yiqitmasligi
 *  kerak. Avval `new URL(APP_URL)` to'g'ridan-to'g'ri root layout ichida
 *  chaqirilardi — natijada bitta xato o'zgaruvchi butun saytni, hatto
 *  kirish sahifasini ham o'chirib qo'yardi. Endi yaroqsiz qiymat
 *  "yo'q" degani bilan bir xil: manzilga bog'liq narsalar o'chadi,
 *  qolgani ishlayveradi.
 */

/** Nuqtasiz hostlar odatda xato yoki o'rnini bosuvchi so'z. Bular —
 *  istisno: kompyuterda ishlaganda haqiqiy manzil. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/** Toza manzil yoki `null`. Oxiridagi chiziqlar olib tashlanadi —
 *  chaqiruvchilar hamma joyda `${site}/...` deb yozadi.
 */
export function normalizeSite(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  // Sxema yozilmagan bo'lsa https deb hisoblaymiz: brauzer manzil
  // qatoridan nusxa olgan odam ko'pincha shunday yozadi.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, '')}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  if (!host) return null;
  if (!host.includes('.') && !LOCAL_HOSTS.has(host)) return null;

  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path}`;
}

/** `APP_URL` — tozalangan holda. Sozlanmagan yoki yaroqsiz bo'lsa `null`. */
export function siteUrl(): string | null {
  return normalizeSite(process.env.APP_URL);
}

/** `metadataBase` uchun. Yaroqsiz qiymatda `undefined` qaytadi —
 *  Next buni "yo'q" deb qabul qiladi va sahifa ishlayveradi.
 */
export function siteUrlObject(): URL | undefined {
  const site = siteUrl();
  if (!site) return undefined;

  try {
    return new URL(site);
  } catch {
    return undefined;
  }
}
