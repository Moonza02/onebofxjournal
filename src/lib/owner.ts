/** Loyiha egasi.
 *
 *  Egaga tarif sotilmaydi: u mahsulotning o'zini quradi va har bir
 *  imkoniyatni har kuni o'z hisobida sinab ko'rishi kerak. Shuning
 *  uchun uning darajasi bazada emas, muhitda belgilanadi — bazadagi
 *  qiymat tasodifan o'zgarsa ham, to'lov muddati tugasa ham, hisob
 *  tozalanib qayta ochilsa ham ta'sir qilmaydi.
 *
 *  `OWNER_EMAILS` — vergul yoki bo'sh joy bilan ajratilgan manzillar.
 *  Bo'sh bo'lsa hech kim ega emas: standart holat shu.
 *
 *  Alohida faylda va hech narsaga bog'lanmaydi, `mail-address.ts` kabi —
 *  `instrumentation.ts` uni og'ir modullarsiz chaqira olsin.
 */

function parse(raw: string | null | undefined): Set<string> {
  const out = new Set<string>();

  for (const part of (raw ?? '').split(/[,;\s]+/)) {
    const value = part.trim().toLowerCase();
    // Eng kam tekshiruv: ichida `@` bo'lsa manzilga o'xshaydi.
    if (value.includes('@')) out.add(value);
  }

  return out;
}

export function ownerEmails(env: Record<string, string | undefined> = process.env): Set<string> {
  return parse(env.OWNER_EMAILS);
}

export function isOwner(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return has(ownerEmails(env), email);
}

/** Sovg'a qilingan to'liq kirish.
 *
 *  Sherik, do'st, sinovchi — pul to'lamaydigan, lekin mahsulotni
 *  to'liq ko'rishi kerak bo'lgan odamlar. Nega to'lov tizimi orqali
 *  emas: "bepul" to'lov yozuvi yaratilsa u daromad hisobotiga
 *  tushadi va raqamlar yolg'on bo'lib qoladi. Bu yerda esa `Payment`
 *  yozuvi **umuman yaratilmaydi** — demak sovg'a na prixod, na
 *  rasxod bo'lib ko'rinadi, hisobotlar toza qoladi.
 *
 *  Bazadagi `plan` va `planUntil` maydonlariga ham tegilmaydi,
 *  shuning uchun xodim panelidagi "to'lagan foydalanuvchilar" soni
 *  ham to'g'ri qolaveradi.
 */
export function giftEmails(env: Record<string, string | undefined> = process.env): Set<string> {
  return parse(env.GIFT_EMAILS);
}

export function isGift(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return has(giftEmails(env), email);
}

function has(set: Set<string>, email: string | null | undefined): boolean {
  const value = (email ?? '').trim().toLowerCase();
  if (!value) return false;

  return set.has(value);
}
