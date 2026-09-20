import { describe, expect, it } from 'vitest';
import { accountConfigured, onboardingDone } from '@/lib/onboarding';

describe('hisob sozlanganmi', () => {
  it('standart holatdagi yangi hisob sozlanmagan deb hisoblanadi', () => {
    expect(accountConfigured({ broker: '', startingBalance: 10000 })).toBe(false);
    expect(accountConfigured({ broker: '   ', startingBalance: 10000 })).toBe(false);
  });

  it('broker yozilgan bo‘lsa — sozlangan', () => {
    expect(accountConfigured({ broker: 'The5ers', startingBalance: 10000 })).toBe(true);
  });

  it('balans o‘zgartirilgan bo‘lsa — sozlangan', () => {
    expect(accountConfigured({ broker: '', startingBalance: 5000 })).toBe(true);
    expect(accountConfigured({ broker: '', startingBalance: 10000.5 })).toBe(true);
  });
});

describe('qadamlar tugadimi', () => {
  it('uchalasi bajarilgandagina tugaydi', () => {
    expect(onboardingDone({ accountReady: true, hasTrade: true, hasJournal: true })).toBe(true);
  });

  it('bittasi qolsa ham tugamaydi', () => {
    expect(onboardingDone({ accountReady: false, hasTrade: true, hasJournal: true })).toBe(false);
    expect(onboardingDone({ accountReady: true, hasTrade: false, hasJournal: true })).toBe(false);
    expect(onboardingDone({ accountReady: true, hasTrade: true, hasJournal: false })).toBe(false);
  });
});
