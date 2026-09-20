/** Fayl matnini to'g'ri kodlashda o'qish.
 *
 *  MetaTrader hisobotni terminal tilidagi kodlashda saqlaydi: ruscha
 *  terminalda bu windows-1251, UTF-8 emas. To'g'ridan-to'g'ri UTF-8 deb
 *  o'qilsa sarlavhalar buzilib chiqadi va ustunlar tanilmaydi.
 */

/** Faylning boshidagi BOM qaysi kodlashni ko'rsatadi. */
function bomEncoding(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  return null;
}

/** `<meta charset=...>` yoki `content="text/html; charset=..."`. */
export function charsetFromHtml(head: string): string | null {
  const match = head.match(/charset\s*=\s*["']?\s*([\w-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Matnda buzilgan belgilar ko'pmi.
 *
 *  UTF-8 dekoderi tanimagan baytni `�` bilan almashtiradi. Bir
 *  nechtasi bo'lsa — fayl boshqa kodlashda.
 */
function looksBroken(text: string): boolean {
  const bad = (text.match(/�/g) ?? []).length;
  return bad > 0 && bad > text.length / 2000;
}

function decodeWith(buffer: ArrayBuffer, encoding: string): string | null {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(buffer);
  } catch {
    // Brauzer bu kodlashni bilmasa — tashlab ketamiz.
    return null;
  }
}

/** Faylni matnga aylantiradi.
 *
 *  Tartib: BOM → faylning o'zida ko'rsatilgan kodlash → UTF-8 →
 *  buzilgan bo'lsa windows-1251.
 */
export function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  const bom = bomEncoding(bytes);
  if (bom) return decodeWith(buffer, bom) ?? '';

  const utf8 = decodeWith(buffer, 'utf-8') ?? '';

  // Hisobot o'zi kodlashini aytishi mumkin — shunda uni tinglaymiz.
  const declared = charsetFromHtml(utf8.slice(0, 4000));
  if (declared && declared !== 'utf-8' && declared !== 'utf8') {
    const text = decodeWith(buffer, declared);
    if (text) return text;
  }

  if (looksBroken(utf8)) {
    // MetaTrader ruscha terminalda shu kodlashda saqlaydi.
    const text = decodeWith(buffer, 'windows-1251');
    if (text && !looksBroken(text)) return text;
  }

  return utf8;
}
