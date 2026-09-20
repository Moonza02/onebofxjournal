/** Boshlash qadamlarining mantig'i.
 *
 *  Ko'rinishdan alohida turadi — shunda u sinaladi va panel sahifasi
 *  qaysi qadam bajarilganini bir joydan biladi.
 */

export type OnboardingState = {
  accountReady: boolean;
  hasTrade: boolean;
  hasJournal: boolean;
};

/** Hisob sozlangan deb hisoblanadimi.
 *
 *  Yangi hisob standart holatda ochiladi: broker bo'sh, balans 10 000.
 *  Foydalanuvchi ulardan birini o'zgartirgan bo'lsa — sozlagan deymiz.
 *  Bu taxmin, lekin zarari yo'q: qadamlar ro'yxat, to'siq emas.
 */
export function accountConfigured(account: {
  broker: string;
  startingBalance: number;
}): boolean {
  return account.broker.trim().length > 0 || account.startingBalance !== 10000;
}

/** Qadamlar tugagach kartochka o'zi yo'qoladi. */
export function onboardingDone(state: OnboardingState): boolean {
  return state.accountReady && state.hasTrade && state.hasJournal;
}
