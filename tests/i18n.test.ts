import { describe, expect, it } from 'vitest';
import { dictFor, en, fill, isLocale, LOCALES, ru, uz } from '@/lib/i18n';
import { programLabel, programShort, sessionLabel } from '@/lib/i18n/labels';
import { defaultChecks, starterSetups } from '@/lib/starter-data';
import { HABITS, habitLabels } from '@/lib/journal';

/** Kalitlar ro'yxati — ichma-ich obyektni tekis yo'llarga yoyadi. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('lug‘atlar', () => {
  it('uchala tilda kalitlar to‘liq mos', () => {
    const base = paths(uz).sort();
    expect(paths(ru).sort()).toEqual(base);
    expect(paths(en).sort()).toEqual(base);
  });

  it('bo‘sh tarjima yo‘q', () => {
    for (const dict of [uz, ru, en]) {
      for (const [path, value] of Object.entries(flat(dict))) {
        // Ba'zi kalitlar ataylab bo'sh bo'lishi mumkin (masalan sanoq so'zi),
        // lekin faqat inglizchada — qolganlarda bo'sh qoldirish xato.
        if (dict !== en) expect(value, path).not.toBe('');
        expect(typeof value, path).toBe('string');
      }
    }
  });

  it('o‘rin to‘ldirgichlar uchala tilda bir xil', () => {
    const slots = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');
    const a = flat(uz);
    const b = flat(ru);
    const c = flat(en);
    for (const key of Object.keys(a)) {
      expect(slots(b[key]), key).toBe(slots(a[key]));
      expect(slots(c[key]), key).toBe(slots(a[key]));
    }
  });
});

function flat(value: unknown, prefix = '', out: Record<string, string> = {}) {
  if (typeof value === 'string') {
    out[prefix] = value;
    return out;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      flat(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

describe('dictFor', () => {
  it('har bir til uchun lug‘at bor', () => {
    for (const locale of LOCALES) expect(dictFor(locale)).toBeTruthy();
  });

  it('noma’lum til standartga tushadi', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('uz')).toBe(true);
  });
});

describe('fill', () => {
  it('o‘rinni qiymat bilan almashtiradi', () => {
    expect(fill('{minutes} daqiqa', { minutes: 5 })).toBe('5 daqiqa');
  });

  it('qiymat berilmasa o‘rin o‘z holicha qoladi', () => {
    expect(fill('{a} va {b}', { a: 1 })).toBe('1 va {b}');
  });

  it('bir nechta o‘rinni to‘ldiradi', () => {
    expect(fill('{a}-{b}-{a}', { a: 'x', b: 'y' })).toBe('x-y-x');
  });
});

describe('saqlangan qiymatlar ko‘rsatishda tarjima qilinadi', () => {
  it('sessiya nomi bazadagi ko‘rinishda qoladi, ekranda o‘giriladi', () => {
    // Bazada o'zbekcha turadi — til almashsa eski yozuvlar buzilmasin.
    expect(sessionLabel('Nyu-York', uz)).toBe('Nyu-York');
    expect(sessionLabel('Nyu-York', ru)).toBe('Нью-Йорк');
    expect(sessionLabel('Nyu-York', en)).toBe('New York');
    // Notanish nom bo'lsa o'zi qaytadi.
    expect(sessionLabel('Sydney', ru)).toBe('Sydney');
  });

  it('dastur nomi: firma nomi tarjima qilinmaydi, "o‘zim sozlayman" qilinadi', () => {
    expect(programLabel('HYPER_GROWTH', ru)).toBe('The5ers — Hyper Growth');
    expect(programShort('HYPER_GROWTH', en)).toBe('Hyper Growth');
    expect(programLabel('CUSTOM', ru)).toBe(ru.accounts.presetCustom);
    expect(programLabel('CUSTOM', en)).toBe(en.accounts.presetCustom);
  });

  it('odat kalitlari o‘zgarmaydi, yorliqlari tilga qarab keladi', () => {
    expect(HABITS).toEqual(['habit1', 'habit2', 'habit3', 'habit4', 'habit5']);
    expect(habitLabels(uz)[0]).toBe(uz.journal.habit1);
    expect(habitLabels(ru)[4]).toBe(ru.journal.habit5);
    expect(habitLabels(en)).toHaveLength(5);
  });
});

describe('ro‘yxatdan o‘tishdagi boshlang‘ich ma’lumot', () => {
  it('setup nomlari o‘zgarmaydi, qoidalar tarjima qilinadi', () => {
    const a = starterSetups(uz);
    const b = starterSetups(ru);

    expect(a.map((s) => s.name)).toEqual(b.map((s) => s.name));
    expect(b[0].description).toBe(ru.playbookSeed.s1Desc);
    expect(b[0].entryRules).toHaveLength(5);
    expect(b[0].exitRules).toHaveLength(4);
    expect(b[0].riskRules).toHaveLength(2);
  });

  it('standart checklist beshta qatordan iborat', () => {
    expect(defaultChecks(en)).toHaveLength(5);
    expect(defaultChecks(en)[0]).toBe(en.playbookSeed.chk1);
  });
});
