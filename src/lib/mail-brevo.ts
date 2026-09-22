import { mailFromAddress } from './mail-address';

/** Pochtani HTTPS orqali jo'natish.
 *
 *  Nega SMTP emas: bulut provayderlari — Railway ham — 25, 465 va 587
 *  portlarini tashqariga yopib qo'yadi. Spamга qarshi keng tarqalgan
 *  siyosat. Natijada `nodemailer` ulana olmaydi va "Connection timeout"
 *  beradi; sozlamalarda esa hech qanday xato yo'q.
 *
 *  443-port hamma joyda ochiq, shuning uchun jo'natish oddiy HTTPS
 *  so'roviga aylantirildi. Yangi kutubxona kerak emas — Node'ning
 *  o'z `fetch` i yetadi.
 *
 *  Provayder Brevo tanlandi, sababi aniq: u **domensiz** ishlaydi.
 *  Bitta pochta manzilini jo'natuvchi sifatida tasdiqlasang kifoya.
 *  Domen paydo bo'lganda boshqasiga o'tish oson — bu fayl yagona joy.
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Javob kelmasa cheksiz kutmaymiz: ro'yxatdan o'tish osilib qolmasin. */
const TIMEOUT_MS = 15_000;

export type BrevoAttachment = { name: string; content: string };

export type BrevoPayload = {
  sender: { name?: string; email: string };
  to: { email: string }[];
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachment?: BrevoAttachment[];
};

/** `ONEBO FX <bot@onebofx.uz>` → `{ name, email }`.
 *
 *  Brevo nom va manzilni alohida kutadi, bitta satrda emas.
 */
export function brevoSender(from: string): { name?: string; email: string } | null {
  const email = mailFromAddress(from);
  if (!email) return null;

  const angle = from.indexOf('<');
  const name = angle > 0 ? from.slice(0, angle).trim().replace(/^"|"$/g, '') : '';

  return name ? { name, email } : { email };
}

export function brevoPayload(
  options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: { filename: string; content: Buffer }[];
  },
  from: string,
): BrevoPayload | null {
  const sender = brevoSender(from);
  if (!sender) return null;

  const payload: BrevoPayload = {
    sender,
    to: [{ email: options.to }],
    subject: options.subject,
    textContent: options.text,
  };

  if (options.html) payload.htmlContent = options.html;

  if (options.attachments && options.attachments.length > 0) {
    // Turini Brevo fayl nomidan aniqlaydi, shuning uchun `contentType`
    // uzatilmaydi — nomdagi kengaytma yetarli.
    payload.attachment = options.attachments.map((file) => ({
      name: file.filename,
      content: file.content.toString('base64'),
    }));
  }

  return payload;
}

export async function sendViaBrevo(
  apiKey: string,
  payload: BrevoPayload,
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.ok) return { ok: true };

  // Javob matnini log uchun saqlaymiz — Brevo sababni aynan shu yerda
  // aytadi (tasdiqlanmagan jo'natuvchi, kunlik chegara va hokazo).
  const body = await response.text().catch(() => '');
  return { ok: false, error: `Brevo ${response.status}: ${body.slice(0, 300)}` };
}
