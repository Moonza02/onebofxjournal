import 'server-only';
import { fill, type Dict } from './i18n';
import { VERIFY_TTL_MINUTES } from './verify';
import nodemailer from 'nodemailer';

/** Pochta jo'natish.
 *
 *  SMTP sozlanmagan bo'lsa jo'natish o'rniga aniq xato qaytadi —
 *  "yuborildi" deb yolg'on ko'rsatmaslik uchun.
 */

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function mailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port,
    // 465 — to'g'ridan-to'g'ri TLS; qolganlari STARTTLS orqali ko'tariladi.
    secure: port === 465,
    user,
    pass,
    from: process.env.MAIL_FROM || `ONEBO FX <${user}>`,
  };
}

export function isMailConfigured(): boolean {
  return mailConfig() !== null;
}

export type Attachment = { filename: string; content: Buffer; contentType: string };

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
}): Promise<{ ok: boolean; error?: string }> {
  const config = mailConfig();
  if (!config) {
    return { ok: false, error: 'SMTP sozlanmagan (SMTP_HOST, SMTP_USER, SMTP_PASS).' };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      // Muddatsiz kutish yaramaydi: javob bermayotgan SMTP ro'yxatdan
      // o'tishni ikki daqiqaga osib qo'yishi mumkin edi.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });

    await transport.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pochta jo‘natilmadi.';

    // Server log'iga **har doim** yoziladi, chaqiruvchi nima qilishidan
    // qat'i nazar. Bu qator bo'lmagani qimmatga tushdi: jo'natish rad
    // etilgan, foydalanuvchiga esa "sozlanmagan" deb ko'rsatilgan va
    // haqiqiy sabab hech qayerda qolmagan.
    console.error(`[mail] jo‘natilmadi (${options.to.split('@')[1] ?? '?'}): ${message}`);

    return { ok: false, error: message };
  }
}

export { mailFromAddress } from './mail-address';

/** Hisobot xatining matni — PDF ilova sifatida ketadi, matn qisqa qoladi. */
export function reportEmail(options: {
  userName: string;
  label: string;
  lines: string[];
  d: Dict;
}): { subject: string; text: string; html: string } {
  const { d } = options;
  const subject = fill(d.mail.subject, { label: options.label });

  const text = [
    fill(d.mail.greeting, { name: options.userName }),
    '',
    fill(d.mail.body, { label: options.label }),
    '',
    ...options.lines.map((l) => `— ${l}`),
    '',
    d.mail.disclaimer,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#F4F6FA;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E3E7EE">
<tr><td style="background:#3B81FC;padding:20px 24px;color:#FFFFFF">
<div style="font-size:17px;font-weight:700;letter-spacing:.2px">ONEBO FX</div>
<div style="font-size:12px;color:#DCE8FF;margin-top:3px">${escapeHtml(fill(d.mail.headerSub, { label: options.label }))}</div>
</td></tr>
<tr><td style="padding:22px 24px;color:#111826;font-size:14px;line-height:1.6">
<p style="margin:0 0 14px">${escapeHtml(fill(d.mail.greeting, { name: options.userName }))}</p>
<ul style="margin:0 0 16px;padding-left:18px;color:#3B4453">
${options.lines.map((l) => `<li style="margin-bottom:7px">${escapeHtml(l)}</li>`).join('')}
</ul>
<p style="margin:0;color:#6B7687;font-size:12px">${escapeHtml(d.mail.htmlNote)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

/** Havolali xat — bitta ko'rinish, ikki maqsad.
 *
 *  Parolni tiklash va manzilni tasdiqlash xatlari faqat matni bilan
 *  farq qiladi. Ikki nusxa saqlansa, biri o'zgarib ikkinchisi eskirib
 *  qoladi — shuning uchun ko'rinish bitta joyda turadi.
 */
export function linkEmail(options: {
  url: string;
  /** Sarlavha ostidagi kichik yozuv. */
  kicker: string;
  body: string;
  button: string;
  footer: string;
  subject: string;
}): { subject: string; text: string; html: string } {
  const { url, kicker, body, button, footer, subject } = options;

  const text = [body, '', url, '', footer].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#F4F6FA;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E3E7EE">
<tr><td style="background:#3B81FC;padding:20px 24px;color:#FFFFFF">
<div style="font-size:17px;font-weight:700;letter-spacing:.2px">ONEBO FX</div>
<div style="font-size:12px;color:#DCE8FF;margin-top:3px">${escapeHtml(kicker)}</div>
</td></tr>
<tr><td style="padding:22px 24px;color:#111826;font-size:14px;line-height:1.6">
<p style="margin:0 0 18px">${escapeHtml(body)}</p>
<p style="margin:0 0 18px">
<a href="${escapeHtml(url)}" style="display:inline-block;background:#3B81FC;color:#FFFFFF;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:700;font-size:14px">${escapeHtml(button)}</a>
</p>
<p style="margin:0 0 18px;color:#6B7687;font-size:12px;word-break:break-all">${escapeHtml(url)}</p>
<p style="margin:0;color:#6B7687;font-size:12px">${escapeHtml(footer)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

/** Parolni tiklash xati.
 *
 *  Havoladan boshqa hech narsa yo'q: na ism, na hisob ma'lumoti —
 *  xat boshqa odamga tushib qolsa ham undan foyda bo'lmaydi.
 */
export function resetEmail(options: { url: string; d: Dict }) {
  const { d, url } = options;
  return linkEmail({
    url,
    kicker: d.reset.title,
    body: d.reset.mailBody,
    button: d.reset.mailButton,
    footer: d.reset.mailIgnore,
    subject: d.reset.mailSubject,
  });
}

/** Manzilni tasdiqlash xati. */
/** Tasdiqlash kodi bilan xat.
 *
 *  Havola emas, kod — ataylab. Havolani pochta xizmatlari bot bilan
 *  oldindan ochib ko'radi va u ishlatilgan bo'lib qoladi; kod bilan
 *  bunday bo'lmaydi. Ustiga-ustak kod odam saytdan chiqmasdan
 *  tasdiqlashiga imkon beradi — brauzer almashtirish shart emas.
 */
export function verifyCodeEmail(options: { code: string; d: Dict }): {
  subject: string;
  text: string;
  html: string;
} {
  const { code, d } = options;
  const body = d.verify.mailBody;
  const footer = fill(d.verify.mailIgnore, { minutes: VERIFY_TTL_MINUTES });

  const text = [body, '', code, '', footer].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#F4F6FA;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E3E7EE">
<tr><td style="background:#3B81FC;padding:20px 24px;color:#FFFFFF">
<div style="font-size:17px;font-weight:700;letter-spacing:.2px">ONEBO FX</div>
<div style="font-size:12px;color:#DCE8FF;margin-top:3px">${escapeHtml(d.verify.title)}</div>
</td></tr>
<tr><td style="padding:22px 24px;color:#111826;font-size:14px;line-height:1.6">
<p style="margin:0 0 18px">${escapeHtml(body)}</p>
<p style="margin:0 0 18px;text-align:center">
<span style="display:inline-block;background:#F4F6FA;border:1px solid #E3E7EE;border-radius:12px;padding:14px 26px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#111826">${escapeHtml(code)}</span>
</p>
<p style="margin:0;color:#6B7687;font-size:12px">${escapeHtml(footer)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: d.verify.mailSubject, text, html };
}

/** Hisobni o'chirish so'ralgani haqida xabar.
 *
 *  Muddatning butun ma'nosi shu xatda: hisobga kirish imkoni bor
 *  boshqa odam o'chirishni so'rab qo'ysa, egasi buni faqat shu yo'l
 *  bilan biladi.
 */
export function deletionEmail(options: { url: string; days: number; d: Dict }) {
  const { d, url, days } = options;
  return linkEmail({
    url,
    kicker: d.deletion.requestedTitle,
    body: fill(d.deletion.mailBody, { days }),
    button: d.deletion.mailButton,
    footer: d.deletion.mailIgnore,
    subject: d.deletion.mailSubject,
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
