/** AI sozlamasi — kalit va model nomi.
 *
 *  Nega alohida fayl va nega bunchalik ehtiyotkorlik: kalit bir marta
 *  `ANTHROPIC_MODEL` o'zgaruvchisiga tushib qolgan edi. Natijasi oddiy
 *  "ishlamadi" emas: ilova kalitni model nomi deb yubordi, Anthropic
 *  "bunday model yo'q" deb javob qaytardi va **o'sha javobda kalitning
 *  o'zi to'liq yozilgan edi**. Xato matni esa to'g'ridan-to'g'ri
 *  foydalanuvchi ekraniga chiqarildi.
 *
 *  Ya'ni bitta chalkashlik maxfiy kalitni ekranga olib chiqdi. Shuning
 *  uchun bu yerda ikki qoida:
 *
 *  1. Maxfiylikka o'xshagan qiymat hech qachon model nomi sifatida
 *     ishlatilmaydi — standart modelga qaytiladi.
 *  2. Provayderning xato matni hech qachon foydalanuvchiga
 *     ko'rsatilmaydi (buni chaqiruvchilar bajaradi).
 */

/** Anthropic kalitlari shunday boshlanadi. */
const SECRET_PREFIXES = ['sk-', 'sk_'];

export const DEFAULT_MODEL = 'claude-sonnet-5';

/** Qiymat maxfiy kalitga o'xshaydimi. */
export function looksLikeSecret(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) return false;

  if (SECRET_PREFIXES.some((p) => v.startsWith(p))) return true;

  // Model nomlari qisqa va oddiy bo'ladi; uzun tasodifiy satr — kalit.
  return v.length > 60;
}

/** Model nomi sifatida ishlatsa bo'ladigan qiymatmi.
 *
 *  Model nomlari faqat harf, raqam, chiziqcha va nuqtadan iborat.
 */
export function validModelName(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  if (!v || looksLikeSecret(v)) return false;

  return /^[a-z0-9][a-z0-9.\-_]*$/i.test(v);
}

export function aiModel(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.ANTHROPIC_MODEL ?? '').trim();
  return validModelName(raw) ? raw : DEFAULT_MODEL;
}

export function aiKey(env: Record<string, string | undefined> = process.env): string {
  return (env.ANTHROPIC_API_KEY ?? '').trim();
}

export function aiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return aiKey(env).length > 0;
}
