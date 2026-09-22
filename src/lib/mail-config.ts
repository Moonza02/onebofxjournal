/** Pochta qaysi yo'l bilan jo'natilishi.
 *
 *  Alohida faylda va hech narsaga bog'lanmaydi: shunda uni server
 *  ko'tarilishida (`instrumentation.ts`) nodemailer'ni yuklamasdan
 *  chaqirish mumkin, va to'liq sinaladi.
 */

export type SmtpConfig = {
  kind: 'smtp';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export type BrevoConfig = { kind: 'brevo'; apiKey: string; from: string };

export type MailConfig = SmtpConfig | BrevoConfig;

/** Muhitdan sozlamani tanlaydi. Hech biri yo'q bo'lsa `null`.
 *
 *  Tartib muhim: HTTPS birinchi. Bulut provayderlari SMTP portlarini
 *  yopadi, shuning uchun ikkalasi ham sozlangan bo'lsa ishlaydigani
 *  tanlanishi kerak.
 */
export function pickMail(env: Record<string, string | undefined>): MailConfig | null {
  const user = (env.SMTP_USER ?? '').trim();
  const from = (env.MAIL_FROM ?? '').trim() || (user ? `ONEBO FX <${user}>` : '');

  const apiKey = (env.BREVO_API_KEY ?? '').trim();
  if (apiKey && from) return { kind: 'brevo', apiKey, from };

  const host = (env.SMTP_HOST ?? '').trim();
  const pass = (env.SMTP_PASS ?? '').trim();
  if (!host || !user || !pass) return null;

  const port = Number(env.SMTP_PORT ?? 587);

  return {
    kind: 'smtp',
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    // 465 — to'g'ridan-to'g'ri TLS; qolganlari STARTTLS orqali ko'tariladi.
    secure: port === 465,
    user,
    pass,
    from,
  };
}
