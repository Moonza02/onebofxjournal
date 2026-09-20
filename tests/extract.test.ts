import { describe, expect, it } from 'vitest';
import { uz } from '@/lib/i18n/uz';
import { validateExtraction, type ExtractedTrade } from '@/lib/extract';
import { plausiblePrice, specFor } from '@/lib/instruments';
import { dayKeyIn, dayRangeIn, hourIn, sessionFor, weekdayIn, zonedTimeToUtc } from '@/lib/tz';

/** Skrinshotdan o'qish natijasining namunasi. */
function extracted(over: Partial<ExtractedTrade> = {}): ExtractedTrade {
  const high = <T>(value: T) => ({ value, confidence: 'high' as const });
  return {
    symbol: high('XAUUSD'),
    direction: high('LONG' as const),
    entryPrice: high(3600),
    stopPrice: high(3590),
    takeProfit: high(3620),
    exitPrice: high(3620),
    volume: high(0.1),
    timeframe: high('M15'),
    openedAt: high('2026-09-15T09:00'),
    closedAt: high('2026-09-15T10:00'),
    ...over,
  };
}

describe('skrinshot tekshiruvi', () => {
  it('to‘g‘ri ma’lumotda ogohlantirish bermaydi', () => {
    expect(validateExtraction(extracted(), uz)).toHaveLength(0);
  });

  it('stop yo‘nalishga mos kelmasa stop va TP ni bo‘shatadi', () => {
    // Long savdoda stop kirishdan yuqori — o'rni almashgan bo'lishi mumkin
    const fields = extracted({
      stopPrice: { value: 3620, confidence: 'high' },
      takeProfit: { value: 3590, confidence: 'high' },
    });
    const warnings = validateExtraction(fields, uz);
    expect(warnings.length).toBeGreaterThan(0);
    expect(fields.stopPrice.value).toBeNull();
    expect(fields.takeProfit.value).toBeNull();
    // Kirish narxi tegilmaydi
    expect(fields.entryPrice.value).toBe(3600);
  });

  it('instrument uchun g‘alati narxni belgilaydi', () => {
    const fields = extracted({ entryPrice: { value: 364, confidence: 'high' } });
    const warnings = validateExtraction(fields, uz);
    expect(warnings.some((w) => w.includes('Kirish narxi'))).toBe(true);
  });

  it('past ishonchli qiymatni formaga o‘tkazmaydi', () => {
    const fields = extracted({ volume: { value: 0.5, confidence: 'low' } });
    validateExtraction(fields, uz);
    expect(fields.volume.value).toBeNull();
    expect(fields.volume.confidence).toBe('low');
  });

  it('kirish va stop teng bo‘lsa stopni bo‘shatadi', () => {
    const fields = extracted({ stopPrice: { value: 3600, confidence: 'high' } });
    const warnings = validateExtraction(fields, uz);
    expect(fields.stopPrice.value).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('manfiy hajmni rad etadi', () => {
    const fields = extracted({ volume: { value: -1, confidence: 'high' } });
    validateExtraction(fields, uz);
    expect(fields.volume.value).toBeNull();
  });

  it('notanish instrument haqida ogohlantiradi, lekin o‘chirmaydi', () => {
    const fields = extracted({ symbol: { value: 'ABCXYZ', confidence: 'high' } });
    const warnings = validateExtraction(fields, uz);
    expect(warnings.some((w) => w.includes('ABCXYZ'))).toBe(true);
    expect(fields.symbol.value).toBe('ABCXYZ');
  });
});

describe('instrument spetsifikatsiyasi', () => {
  it('tanish instrument uchun punkt o‘lchamini beradi', () => {
    expect(specFor('XAUUSD').pipSize).toBe(0.1);
    expect(specFor('eurusd').pipSize).toBe(0.0001);
  });

  it('notanish instrument uchun xavfsiz standart qiymat beradi', () => {
    const spec = specFor('QQQQQQ');
    expect(spec.pipSize).toBe(0.0001);
    expect(spec.pipValuePerLot).toBe(10);
  });

  it('narx oralig‘ini tekshiradi', () => {
    expect(plausiblePrice('XAUUSD', 3600)).toBe(true);
    expect(plausiblePrice('XAUUSD', 36)).toBe(false);
    expect(plausiblePrice('NOSUCH', 999999)).toBe(true);
  });
});

describe('vaqt mintaqasi', () => {
  it('kun kalitini mintaqada beradi', () => {
    const at = new Date('2026-09-15T20:00:00Z');
    expect(dayKeyIn(at, 'UTC')).toBe('2026-09-15');
    expect(dayKeyIn(at, 'Asia/Tashkent')).toBe('2026-09-16');
    expect(dayKeyIn(at, 'America/New_York')).toBe('2026-09-15');
  });

  it('soatni mintaqada beradi', () => {
    const at = new Date('2026-09-15T06:00:00Z');
    expect(hourIn(at, 'UTC')).toBe(6);
    expect(hourIn(at, 'Asia/Tashkent')).toBe(11);
  });

  it('hafta kunini dushanbadan sanaydi', () => {
    // 2026-09-14 — dushanba
    expect(weekdayIn(new Date('2026-09-14T10:00:00Z'), 'UTC')).toBe(0);
    expect(weekdayIn(new Date('2026-09-20T10:00:00Z'), 'UTC')).toBe(6);
  });

  it('mintaqadagi kalendar vaqtini UTC ga aylantiradi', () => {
    // Toshkent UTC+5 — 00:00 mahalliy = oldingi kun 19:00 UTC
    const utc = zonedTimeToUtc('Asia/Tashkent', 2026, 8, 16);
    expect(utc.toISOString()).toBe('2026-09-15T19:00:00.000Z');
  });

  it('kun oralig‘i to‘liq 24 soatni qamraydi', () => {
    const { from, to } = dayRangeIn('2026-09-16', 'Asia/Tashkent');
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(dayKeyIn(from, 'Asia/Tashkent')).toBe('2026-09-16');
  });

  it('sessiyani bozor vaqtidan aniqlaydi, foydalanuvchi mintaqasidan emas', () => {
    expect(sessionFor(new Date('2026-09-15T03:00:00Z'))).toBe('Osiyo');
    expect(sessionFor(new Date('2026-09-15T09:00:00Z'))).toBe('London');
    expect(sessionFor(new Date('2026-09-15T14:00:00Z'))).toBe('Overlap');
    expect(sessionFor(new Date('2026-09-15T18:00:00Z'))).toBe('Nyu-York');
  });
});
