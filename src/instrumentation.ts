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
import { isFreemail, mailFromAddress } from './lib/mail-address';
import { pickMail } from './lib/mail-config';

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

  const mail = pickMail(process.env);

  if (!mail) {
    console.warn(
      "[sozlama] Pochta o'chiq — na BREVO_API_KEY, na SMTP_HOST/USER/PASS qo'yilgan. " +
        "Tasdiqlash kodi, parol tiklash va haftalik hisobot jo'natilmaydi.",
    );
  } else if (mail.kind === 'brevo') {
    // Ijobiy qator ham kerak: usiz "sozlangan" bilan "bu tekshiruvi
    // yo'q eski yig'ma" farq qilmaydi. Shuning uchun console.log ataylab.
    // eslint-disable-next-line no-console
    console.log(`[sozlama] Pochta: Brevo (HTTPS), jo'natuvchi ${mailFromAddress(mail.from) ?? '?'}`);

    // Bepul pochtadan jo'natish — xat yetib boradi, lekin ko'pincha
    // «Spam» ga. Sabab DMARC: `@gmail.com` nomidan boshqa server
    // jo'nata olmaydi, shuning uchun Brevo `From` ni o'z domeniga
    // almashtiradi va qabul qiluvchi uchun jo'natuvchi notanish bo'ladi.
    if (isFreemail(mail.from)) {
      console.warn(
        `[sozlama] Jo'natuvchi bepul pochta (${mailFromAddress(mail.from)}). ` +
          "Brevo `From` ni o'z domeniga almashtiradi va xatlar ko'pincha «Spam» ga tushadi. " +
          "To'liq yechim — o'z domeni va DKIM.",
      );
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`[sozlama] Pochta: SMTP ${mail.host}:${mail.port}`);

    // Bulutda SMTP portlari deyarli har doim yopiq. Bu aynan bir necha
    // soat yo'qotishga sabab bo'lgandi: sozlama joyida ko'rinadi,
    // ulanish esa "Connection timeout" bilan tugaydi.
    console.warn(
      '[sozlama] SMTP tanlandi. Bulut serverlarida 465 va 587 portlari ' +
        "odatda yopiq bo'ladi — jo'natish ishlamasa BREVO_API_KEY qo'ying.",
    );

    // Ko'p provayder — jumladan Gmail — faqat autentifikatsiya
    // qilingan manzildan jo'natishga ruxsat beradi.
    const from = mailFromAddress(mail.from);
    const user = mail.user.toLowerCase();

    if (!from) {
      console.warn(`[sozlama] MAIL_FROM da manzil topilmadi: ${mail.from}`);
    } else if (from !== user) {
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
