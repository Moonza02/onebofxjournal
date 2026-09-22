/** Server xatolarini log'ga chiqarish.
 *
 *  Ishlab chiqarish rejimida Next server komponentidagi xatoning
 *  matnini yashiradi — brauzerga ham, log'ga ham faqat `digest`
 *  tushadi. Bu to'g'ri qaror (xato matnida maxfiy narsa bo'lishi
 *  mumkin), lekin serverning **o'z** log'ida matn ko'rinishi kerak:
 *  aks holda nosozlikni faqat taxmin bilan qidirasan.
 *
 *  `onRequestError` aynan shuning uchun: Next uni har bir server
 *  xatosida chaqiradi va biz matnni Railway log'iga yozamiz.
 */
import { mailFromAddress } from './lib/mail-address';

/** Server ko'tarilganda bir marta ishlaydi.
 *
 *  Sozlamadagi bo'shliq birinchi foydalanuvchi kelganda emas, shu
 *  yerda bilinsin. Bugun aynan shu narsa qimmatga tushdi: pochta
 *  o'zgaruvchilaridan biri bo'sh edi, ilova esa bu haqda faqat
 *  birinchi odam ro'yxatdan o'tmoqchi bo'lganda gapirdi.
 *
 *  Qiymatlar **yozilmaydi** — faqat nomi va bor-yo'qligi.
 */
export function register(): void {
  const need = (keys: string[]) => keys.filter((key) => !(process.env[key] ?? '').trim());

  const mail = need(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']);
  if (mail.length > 0) {
    console.warn(
      `[sozlama] Pochta o'chiq — bu o'zgaruvchilar bo'sh: ${mail.join(', ')}. ` +
        "Tasdiqlash xati, parol tiklash va haftalik hisobot jo'natilmaydi.",
    );
  } else {
    // Ijobiy qator ham kerak: usiz "sozlangan" bilan "bu tekshiruvi
    // yo'q eski yig'ma" farq qilmaydi. Shuning uchun bu yerda
    // console.log ataylab.
    // eslint-disable-next-line no-console
    console.log(
      `[sozlama] Pochta sozlangan: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`,
    );

    // Ko'p provayder — jumladan Gmail — faqat autentifikatsiya
    // qilingan manzildan jo'natishga ruxsat beradi. `MAIL_FROM`
    // boshqasini ko'rsatsa xat rad etiladi, sozlama esa tashqaridan
    // joyida ko'rinadi. Shuning uchun bu yerda aytiladi.
    const from = mailFromAddress(process.env.MAIL_FROM);
    const user = (process.env.SMTP_USER ?? '').trim().toLowerCase();

    if (process.env.MAIL_FROM && !from) {
      console.warn(`[sozlama] MAIL_FROM da manzil topilmadi: ${process.env.MAIL_FROM}`);
    } else if (from && user && from !== user) {
      console.warn(
        `[sozlama] MAIL_FROM (${from}) SMTP_USER (${user}) bilan bir xil emas — ` +
          "ko'p provayder bunday xatni rad etadi.",
      );
    }
  }

  const app = need(['APP_URL', 'AUTH_SECRET', 'DATABASE_URL']);
  if (app.length > 0) {
    console.warn(`[sozlama] Bo'sh o'zgaruvchilar: ${app.join(', ')}.`);
  }
}

export function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const where = `${request?.method ?? '?'} ${request?.path ?? '?'}`;

  console.error(`[server-error] ${where} — ${err.name}: ${err.message}`);
  if (err.stack) console.error(err.stack);

  const cause = (err as { cause?: unknown }).cause;
  if (cause) console.error('[server-error] sabab:', cause);
}
