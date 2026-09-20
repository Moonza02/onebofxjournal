/** Huquqiy sahifalardagi rekvizitlar.
 *
 *  Firma nomi, STIR va aloqa ma'lumoti kodga yozilmaydi — ular
 *  `.env` dan olinadi. Sozlanmagan bo'lsa sahifada to'ldirish kerakligi
 *  ko'rinib turadigan belgi chiqadi, chunki jim qolgan bo'sh joy
 *  e'tibordan chetda qolib ketishi mumkin.
 */
import { siteUrl } from './site';

export type LegalParty = {
  company: string;
  stir: string;
  address: string;
  email: string;
  phone: string;
  site: string;
  /** Rekvizitlar to'liq to'ldirilganmi. */
  complete: boolean;
};

const PLACEHOLDER = '—';

function value(raw: string | undefined): { text: string; filled: boolean } {
  const text = (raw ?? '').trim();
  return text ? { text, filled: true } : { text: PLACEHOLDER, filled: false };
}

export function legalParty(): LegalParty {
  const fields = {
    company: value(process.env.LEGAL_COMPANY),
    stir: value(process.env.LEGAL_STIR),
    address: value(process.env.LEGAL_ADDRESS),
    email: value(process.env.LEGAL_EMAIL),
    phone: value(process.env.LEGAL_PHONE),
  };

  return {
    company: fields.company.text,
    stir: fields.stir.text,
    address: fields.address.text,
    email: fields.email.text,
    phone: fields.phone.text,
    site: (siteUrl() ?? 'https://onebofx.uz').replace(/^https?:\/\//, ''),
    complete: Object.values(fields).every((f) => f.filled),
  };
}

/** Hujjat oxirgi marta qachon o'zgargani.
 *
 *  Sana kodda turadi: matn o'zgarganda uni qo'lda yangilash kerak,
 *  aks holda "bugun" yozilib, hujjat har kuni o'zgargandek ko'rinardi.
 */
export const LEGAL_UPDATED = '2026-09-20';
