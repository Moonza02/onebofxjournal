import type { Dict } from './index';

const PROGRAM_TEXT: Record<string, string> = {
  HYPER_GROWTH: 'The5ers — Hyper Growth',
  HIGH_STAKES: 'The5ers — High Stakes',
  BOOTCAMP: 'The5ers — Bootcamp',
};

/** Dastur nomi — firma nomlari tarjima qilinmaydi, faqat "o'zim sozlayman". */
export function programLabel(program: string, d: Dict): string {
  return PROGRAM_TEXT[program] ?? d.accounts.presetCustom;
}

/** Sidebar va chiplar uchun qisqartirilgan ko'rinish. */
export function programShort(program: string, d: Dict): string {
  return programLabel(program, d).replace('The5ers — ', '');
}

/** Sessiya nomi bazada o'zbekcha saqlanadi — u ma'lumot, yorliq emas.
 *  Shuning uchun ko'rsatishda tarjima qilinadi, saqlanganda esa tegilmaydi.
 */
export function sessionLabel(name: string, d: Dict): string {
  const map = d.sessions as Record<string, string>;
  return map[name] ?? name;
}
