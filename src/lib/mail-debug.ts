/** Pochtasiz sinash uchun vaqtinchalik eshik.
 *
 *  Nega kerak bo'ldi. Gmail o'z domenisiz va DKIM imzosisiz kelgan
 *  xatni SMTP bosqichida qabul qiladi — provayder buni "Delivered"
 *  deb yozadi — va keyin uni jimgina yo'q qiladi. «Spam» ga ham
 *  qo'ymaydi, bounce ham qaytarmaydi. Natijada tasdiqlash kodini
 *  hech kim ko'rmaydi va ro'yxatdan o'tishni sinab ham bo'lmaydi.
 *
 *  Bu kalit yoqilsa kod (va parol tiklash havolasi) server log'iga
 *  yoziladi, ya'ni pochtasiz sinash mumkin bo'ladi.
 *
 *  **Bu — ataylab ochilgan xavfsizlik teshigi.** Log'ni o'qiy
 *  oladigan odam istagan hisobni tasdiqlab, parolini tiklab oladi.
 *  Shuning uchun uch shart: standart holatda o'chiq; yoqilganda
 *  server ko'tarilishida baland ovozda ogohlantiradi; domen va DKIM
 *  tayyor bo'lgan kuni o'chiriladi va bu fayl butunlay olib
 *  tashlanadi.
 *
 *  Alohida faylda va hech narsaga bog'lanmaydi — `instrumentation.ts`
 *  uni og'ir modullarni yuklamasdan chaqira olsin.
 */

const ON = new Set(['1', 'true', 'ha', 'yes', 'on']);

export function secretsToLog(env: Record<string, string | undefined> = process.env): boolean {
  return ON.has((env.SECRETS_TO_LOG ?? '').trim().toLowerCase());
}

/** Sirni log'ga chiqarish — faqat kalit yoqilgan bo'lsa.
 *
 *  Qator ataylab boshqalaridan ajralib turadi: log'da qidirish oson
 *  bo'lsin, va tasodifan yoqilib qolgani ko'zga tashlansin.
 */
export function logSecret(kind: string, email: string, secret: string): void {
  if (!secretsToLog()) return;

  console.warn(`[SINOV-KOD] ${kind} — ${email} → ${secret}`);
}
