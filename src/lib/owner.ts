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
  const value = (email ?? '').trim().toLowerCase();
  if (!value) return false;

  return ownerEmails(env).has(value);
}
