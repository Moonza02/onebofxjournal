import type { Dict } from './i18n';

/** Yangi hisob ochilganda beriladigan boshlang'ich setuplar.
 *  Foydalanuvchi ularni tahrirlaydi yoki o'chiradi — bu faqat bo'sh ekranni
 *  to'ldirish uchun, shunda birinchi savdo kiritishda tanlash bor.
 *  Matnlar ro'yxatdan olinadi: ro'yxatdan o'tishda tanlangan til bo'yicha
 *  bir marta yoziladi, keyin esa foydalanuvchining o'z ma'lumoti bo'lib qoladi.
 */
export function starterSetups(d: Dict) {
  const s = d.playbookSeed;
  return [
    {
      name: 'London Breakout',
      description: s.s1Desc,
      entryRules: [s.s1e1, s.s1e2, s.s1e3, s.s1e4, s.s1e5],
      exitRules: [s.s1x1, s.s1x2, s.s1x3, s.s1x4],
      riskRules: [s.s1r1, s.s1r2],
      timeframes: ['M15', 'H1'],
      sessions: ['London'],
    },
    {
      name: 'OB Rejection',
      description: s.s2Desc,
      entryRules: [s.s2e1, s.s2e2, s.s2e3],
      exitRules: [s.s2x1, s.s2x2],
      riskRules: [s.s2r1],
      timeframes: ['M15', 'H4'],
      sessions: ['London', 'Nyu-York'],
    },
    {
      name: 'FVG Retest',
      description: s.s3Desc,
      entryRules: [s.s3e1, s.s3e2, s.s3e3],
      exitRules: [s.s3x1, s.s3x2],
      riskRules: [s.s3r1],
      timeframes: ['M5', 'M15'],
      sessions: ['London'],
    },
  ];
}

/** Yangi savdo formasidagi standart checklist. */
export function defaultChecks(d: Dict): string[] {
  const s = d.playbookSeed;
  return [s.chk1, s.chk2, s.chk3, s.chk4, s.chk5];
}
