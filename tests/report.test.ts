import { describe, expect, it } from 'vitest';
import { reportHighlights, weekLabel, type WeeklyReport } from '@/lib/report';
import { renderWeeklyPdf, safe } from '@/lib/pdf';
import { weekRangeIn } from '@/lib/tz';
import { uz } from '@/lib/i18n/uz';

function report(patch: Partial<WeeklyReport> = {}): WeeklyReport {
  const from = new Date('2026-09-14T00:00:00Z');
  const to = new Date('2026-09-21T00:00:00Z');

  return {
    accountName: 'Asosiy hisob',
    userName: 'Ibrohim',
    from,
    to,
    label: '2026-09-14 — 2026-09-20',
    count: 6,
    netPnl: 420,
    totalR: 2.4,
    winRate: 50,
    profitFactor: 1.8,
    expectancy: 70,
    avgWin: 240,
    avgLoss: -120,
    best: 380,
    worst: -180,
    ruleCompliance: 83.3,
    maxDrawdown: 300,
    longestLossStreak: 2,
    openBalance: 10000,
    closeBalance: 10420,
    previous: { netPnl: -150, count: 5, winRate: 40 },
    byDay: [
      { label: 'Dushanba', netPnl: 200, count: 2 },
      { label: 'Seshanba', netPnl: -180, count: 1 },
      { label: 'Chorshanba', netPnl: 0, count: 0 },
      { label: 'Payshanba', netPnl: 400, count: 2 },
      { label: 'Juma', netPnl: 0, count: 1 },
      { label: 'Shanba', netPnl: 0, count: 0 },
      { label: 'Yakshanba', netPnl: 0, count: 0 },
    ],
    bySetup: [
      { key: 'London breakout', count: 4, netPnl: 600, winRate: 75, avgR: 0.9 },
      { key: 'Reversal', count: 2, netPnl: -180, winRate: 0, avgR: -0.6 },
    ],
    bySession: [
      { key: 'London', count: 4, netPnl: 600, winRate: 75, avgR: 0.9 },
      { key: 'Nyu-York', count: 2, netPnl: -180, winRate: 0, avgR: -0.6 },
    ],
    trades: [
      {
        day: '2026-09-14',
        symbol: 'XAUUSD',
        direction: 'Long',
        setup: 'London breakout',
        r: 1.4,
        pnl: 380,
        compliant: true,
      },
      {
        day: '2026-09-15',
        symbol: 'EURUSD',
        direction: 'Short',
        setup: 'Reversal',
        r: -1,
        pnl: -180,
        compliant: false,
      },
    ],
    lessons: ['Seshanba kuni ertalab savdo qilmaslik kerak.'],
    broken: [
      {
        day: '2026-09-15',
        symbol: 'EURUSD',
        direction: 'Short',
        setup: 'Reversal',
        r: -1,
        pnl: -180,
        compliant: false,
      },
    ],
    ...patch,
  };
}

describe('weekRangeIn', () => {
  it('dushanbadan boshlanadi va yetti kun davom etadi', () => {
    // 2026-09-19 — shanba. Joriy hafta dushanbasi 2026-09-14.
    const now = new Date('2026-09-19T10:00:00Z');
    const { from, to } = weekRangeIn(0, 'Asia/Tashkent', now);

    expect(from.toISOString()).toBe('2026-09-13T19:00:00.000Z'); // Toshkentda 14-sentabr 00:00
    expect(to.getTime() - from.getTime()).toBe(7 * 86400000);
  });

  it('o‘tgan hafta ettala kun oldin boshlanadi', () => {
    const now = new Date('2026-09-19T10:00:00Z');
    const current = weekRangeIn(0, 'Asia/Tashkent', now);
    const previous = weekRangeIn(1, 'Asia/Tashkent', now);

    expect(current.from.getTime() - previous.from.getTime()).toBe(7 * 86400000);
    expect(previous.to.getTime()).toBe(current.from.getTime());
  });

  it('oy chegarasidan o‘tganda ham to‘g‘ri ishlaydi', () => {
    const now = new Date('2026-10-01T10:00:00Z'); // payshanba
    const { from, to } = weekRangeIn(0, 'UTC', now);

    expect(from.toISOString()).toBe('2026-09-28T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });
});

describe('weekLabel', () => {
  it('oxirgi kun sifatida yakshanbani ko‘rsatadi, keyingi dushanbani emas', () => {
    const { from, to } = weekRangeIn(0, 'UTC', new Date('2026-09-19T10:00:00Z'));
    expect(weekLabel(from, to, 'UTC')).toBe('2026-09-14 — 2026-09-20');
  });
});

describe('reportHighlights', () => {
  it('savdo bo‘lmasa bitta jumla qaytaradi', () => {
    const lines = reportHighlights(report({ count: 0 }), uz);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('yopilgan savdo yo‘q');
  });

  it('o‘tgan hafta bilan solishtiradi', () => {
    const lines = reportHighlights(report(), uz).join(' ');
    expect(lines).toContain('yaxshilandi');
  });

  it('natija pasayganini ham aytadi', () => {
    const lines = reportHighlights(
      report({ netPnl: -400, previous: { netPnl: 200, count: 5, winRate: 60 } }),
      uz,
    ).join(' ');
    expect(lines).toContain('pasaydi');
  });

  it('qoidaga to‘liq rioya qilinganini alohida qayd etadi', () => {
    const lines = reportHighlights(report({ ruleCompliance: 100, broken: [] }), uz).join(' ');
    expect(lines).toContain('o‘z qoidasi bo‘yicha');
  });

  it('kam savdoli setuplarni solishtirmaydi', () => {
    const lines = reportHighlights(
      report({
        bySetup: [{ key: 'Yagona', count: 1, netPnl: -50, winRate: 0, avgR: -1 }],
      }),
      uz,
    ).join(' ');
    expect(lines).not.toContain('Eng yaxshi setup');
  });

  it('uzoq zarar zanjirini eslatadi', () => {
    const lines = reportHighlights(report({ longestLossStreak: 4 }), uz).join(' ');
    expect(lines).toContain('Ketma-ket 4 ta zarar');
  });
});

describe('safe', () => {
  it('matematik minusni oddiy chiziqqa almashtiradi', () => {
    // WinAnsi da U+2212 yo'q — almashtirilmasa PDF da tirnoq chiqadi.
    expect(safe('\u2212$310.00')).toBe('-$310.00');
  });

  it('strelka va cheksizlikni so‘z bilan beradi', () => {
    expect(safe('a \u2192 b')).toBe('a -> b');
    expect(safe('\u221E')).toBe('cheksiz');
  });

  it('o‘zbek apostrofi va tirelarga tegmaydi', () => {
    expect(safe('o‘tgan hafta — natija ma’lum')).toBe('o‘tgan hafta — natija ma’lum');
  });

  it('noma’lum belgini tashlab ketmaydi, chiziqqa aylantiradi', () => {
    expect(safe('\u2248')).toBe('-');
  });
});

describe('renderWeeklyPdf', () => {
  it('pastki izoh qo‘shimcha bo‘sh sahifa ochmaydi', async () => {
    // Ilgari sahifa pastidagi izoh chegaradan chiqib, pdfkit har bir
    // sahifaga yana bittadan bo'sh sahifa qo'shib yuborardi.
    const pdf = await renderWeeklyPdf(
      report({ count: 0, trades: [], bySetup: [], bySession: [], broken: [], lessons: [] }),
      uz,
    );
    const pages = Number(pdf.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0);
    expect(pages).toBe(1);
  });

  it('haqiqiy PDF fayl qaytaradi', async () => {
    const pdf = await renderWeeklyPdf(report(), uz);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
    expect(pdf.subarray(-1024).toString('latin1')).toContain('%%EOF');
  });

  it('bo‘sh haftada ham buziladigan joy yo‘q', async () => {
    const pdf = await renderWeeklyPdf(
      report({
        count: 0,
        trades: [],
        bySetup: [],
        bySession: [],
        broken: [],
        lessons: [],
        previous: null,
        profitFactor: null,
        byDay: report().byDay.map((d) => ({ ...d, netPnl: 0, count: 0 })),
      }),
      uz,
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('uzun ro‘yxatda ikkinchi sahifaga o‘tadi', async () => {
    const one = report().trades[0];
    const many = Array.from({ length: 90 }, () => one);
    const pdf = await renderWeeklyPdf(report({ trades: many, count: 90 }), uz);

    // Sahifalar soni PDF ichida /Count bilan yoziladi.
    const pages = Number(pdf.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0);
    expect(pages).toBeGreaterThan(1);
  });
});
