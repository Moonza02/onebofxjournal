/** MetaTrader 4 / 5 hisobotini o'qish.
 *
 *  MT "Save as Report" tugmasi HTML fayl beradi — ichida oddiy
 *  jadval. Bizga faqat shu jadvalning sarlavhasi va qatorlari kerak,
 *  keyin ular CSV bilan bir xil yo'ldan o'tadi.
 *
 *  Tashqi kutubxona ishlatilmadi: hisobot tuzilishi juda sodda va
 *  bir xil, to'liq HTML ajratgich bu yerda ortiqcha yuk bo'lardi.
 */

import { KNOWN_HEADERS, normalizeHeader } from './fields';

export type Grid = { headers: string[]; rows: string[][] };

/** Maydon nomi emas, lekin hisobot jadvalida uchraydigan sarlavhalar. */
const EXTRA_HEADERS = ['ticket', 'position', 'order', 'deal', 'taxes', 'balance', 'state'];

function isHeaderWord(cell: string): boolean {
  const key = normalizeHeader(cell);
  if (!key) return false;
  return KNOWN_HEADERS.has(key) || EXTRA_HEADERS.includes(key);
}

/** Jadval qatori emas, bo'lim sarlavhasi yoki yakuniy hisob. */
const SUMMARY_WORDS = [
  'balance',
  'credit',
  'deposit',
  'withdrawal',
  'grossprofit',
  'grossloss',
  'totalnetprofit',
  'closedpl',
  'floatingpl',
  'summary',
  'results',
];

function decode(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function cellText(html: string): string {
  return decode(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** HTML'ni qator va ustunlarga ajratadi. */
function toGridRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html)) !== null) {
    const cells: string[] = [];
    const tdRe = /<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/gi;

    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(tr[1])) !== null) {
      cells.push(cellText(td[3]));
      // colspan bo'lsa — qolgan joylar bo'sh katak bilan to'ldiriladi,
      // aks holda ustunlar surilib ketadi.
      const span = td[2].match(/colspan\s*=\s*["']?(\d+)/i);
      const extra = span ? Number(span[1]) - 1 : 0;
      for (let i = 0; i < extra && i < 20; i += 1) cells.push('');
    }

    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

function headerScore(cells: string[]): number {
  let score = 0;
  for (const cell of cells) {
    if (isHeaderWord(cell)) score += 1;
  }
  return score;
}

/** Takrorlangan sarlavhalarni farqlaydi.
 *
 *  MT5 ochilish va yopilish ustunlarini bir xil ataydi: "Time", "Price".
 *  Ikkinchisi — yopilish, shuning uchun nomiga "Close" qo'shiladi va
 *  ustunlarni taniydigan umumiy qoidalar ishlayveradi.
 */
export function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();

  return headers.map((header) => {
    const key = normalizeHeader(header);
    if (!key) return header;

    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return header;
    if (count === 2) return `Close ${header}`;
    return `${header} ${count}`;
  });
}

function isSummary(cells: string[]): boolean {
  const joined = normalizeHeader(cells.join(''));
  if (!joined) return true;
  return SUMMARY_WORDS.some((word) => joined.includes(word));
}

/** Hisobotdagi savdolar jadvalini ajratib beradi.
 *
 *  Sarlavha deb tanish so'zlari eng ko'p uchragan qator olinadi.
 *  Undan keyingi qatorlar — savdolar; bo'lim yoki yakun qatoriga
 *  yetganda to'xtaydi.
 */
export function parseMtHtml(html: string): Grid | null {
  const rows = toGridRows(html);
  if (rows.length === 0) return null;

  let headerIndex = -1;
  let best = 2; // kamida uchta tanish ustun bo'lsin

  for (let i = 0; i < rows.length; i += 1) {
    const score = headerScore(rows[i]);
    if (score > best) {
      best = score;
      headerIndex = i;
    }
  }

  if (headerIndex < 0) return null;

  const headers = dedupeHeaders(rows[headerIndex]);
  const width = headers.length;
  const data: string[][] = [];

  // Savdo qatorida kataklarning ko'pi to'la bo'ladi. Yakuniy hisob
  // ("Jami") va bo'lim nomi ("Orders") esa deyarli bo'sh — shu bilan
  // ajratiladi.
  const needFilled = Math.max(3, Math.ceil(width / 3));

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];

    // Keyingi bo'limning sarlavha qatori — bu yerda to'xtaymiz.
    // Kengligiga qaramaymiz: MT5 da bo'limlar turli ustunli bo'ladi,
    // va savdo qatorida uchtadan ortiq tanish so'z uchramaydi.
    if (headerScore(row) >= 3) break;

    if (row.length < width - 2) continue;
    if (isSummary(row)) continue;
    if (row.filter((cell) => cell.length > 0).length < needFilled) continue;

    data.push(row.slice(0, width));
  }

  if (data.length === 0) return null;
  return { headers, rows: data };
}

/** Fayl MT hisobotiga o'xshaydimi. */
export function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 2000).toLowerCase();
  return head.includes('<html') || head.includes('<table') || head.includes('<!doctype html');
}
