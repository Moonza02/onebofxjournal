import { describe, expect, it } from 'vitest';
import {
  activeHours,
  holdBuckets,
  holdPoints,
  hourBreakdown,
  meaningful,
  monteCarlo,
  periodStats,
  simulate,
  weekdayHourMatrix,
} from '@/lib/analytics';
import { trade, tradeWithR } from './helpers';

const TZ = 'Asia/Tashkent';

describe('soat kesimi', () => {
  it('savdoni kirish soati bo‘yicha guruhlaydi, mintaqani hisobga olib', () => {
    // 06:00 UTC = Toshkentda 11:00
    const t = tradeWithR(-1, { openedAt: new Date('2026-09-15T06:00:00Z') });
    const rows = hourBreakdown([t], TZ);
    expect(rows[11].count).toBe(1);
    expect(rows[11].losses).toBe(1);
    expect(rows[11].stopShare).toBeCloseTo(100, 6);
    expect(rows[6].count).toBe(0);
  });

  it('g‘alaba, zarar va breakeven ni ajratadi', () => {
    const at = new Date('2026-09-15T06:00:00Z');
    const rows = hourBreakdown(
      [tradeWithR(2, { openedAt: at }), tradeWithR(-1, { openedAt: at }), tradeWithR(0, { openedAt: at })],
      TZ,
    );
    expect(rows[11].wins).toBe(1);
    expect(rows[11].losses).toBe(1);
    expect(rows[11].breakeven).toBe(1);
    expect(rows[11].stopShare).toBeCloseTo(33.33, 1);
  });

  it('faqat savdo bo‘lgan soatlar oralig‘ini qaytaradi', () => {
    const rows = hourBreakdown(
      [
        tradeWithR(1, { openedAt: new Date('2026-09-15T04:00:00Z') }), // 09:00
        tradeWithR(1, { openedAt: new Date('2026-09-15T07:00:00Z') }), // 12:00
      ],
      TZ,
    );
    const active = activeHours(rows);
    expect(active[0].hour).toBe(9);
    expect(active[active.length - 1].hour).toBe(12);
  });

  it('hafta kuni × soat matritsasini quradi', () => {
    // 2026-09-14 dushanba, 06:00 UTC → Toshkentda 11:00
    const t = tradeWithR(2, { openedAt: new Date('2026-09-14T06:00:00Z') });
    const matrix = weekdayHourMatrix([t], [10, 11, 12], TZ);
    expect(matrix).toHaveLength(5);
    expect(matrix[0][1]).toEqual({ weekday: 0, hour: 11, count: 1, avgR: 2 });
    expect(matrix[0][0].count).toBe(0);
  });
});

describe('ushlash vaqti', () => {
  it('daqiqalarda va R da nuqta beradi', () => {
    const t = trade({
      openedAt: new Date('2026-09-15T09:00:00Z'),
      closedAt: new Date('2026-09-15T11:30:00Z'),
    });
    const [point] = holdPoints([t]);
    expect(point.minutes).toBeCloseTo(150, 6);
    expect(point.r).toBeCloseTo(2, 6);
  });

  it('savdolarni vaqt oynalariga taqsimlaydi', () => {
    const short = trade({
      openedAt: new Date('2026-09-15T09:00:00Z'),
      closedAt: new Date('2026-09-15T09:20:00Z'),
    });
    const long = trade({
      openedAt: new Date('2026-09-15T09:00:00Z'),
      closedAt: new Date('2026-09-16T09:00:00Z'),
    });
    const buckets = holdBuckets([short, long]);
    expect(buckets[0].count).toBe(1); // 0–30 daq
    expect(buckets[3].count).toBe(1); // 6 soatdan ko'p
  });
});

describe('simulyator', () => {
  const trades = [
    tradeWithR(2, { setup: { id: 'a', name: 'Yaxshi' }, closedAt: new Date('2026-09-01T10:00:00Z') }),
    tradeWithR(-1, { setup: { id: 'b', name: 'Yomon' }, closedAt: new Date('2026-09-02T10:00:00Z') }),
    tradeWithR(-1, { setup: { id: 'b', name: 'Yomon' }, closedAt: new Date('2026-09-03T10:00:00Z') }),
  ];

  it('filtrsiz haqiqiy natijani qaytaradi', () => {
    const r = simulate(trades, 10000, {}, TZ);
    expect(r.kept).toBe(3);
    expect(r.removed).toBe(0);
    expect(r.netPnl).toBeCloseTo(0, 6);
  });

  it('setupni chiqarib tashlaganda natijani qayta hisoblaydi', () => {
    const r = simulate(trades, 10000, { excludeSetups: ['Yomon'] }, TZ);
    expect(r.kept).toBe(1);
    expect(r.removed).toBe(2);
    expect(r.netPnl).toBeCloseTo(200, 6);
  });

  it('kundagi savdo chegarasini qo‘llaydi', () => {
    const sameDay = [
      tradeWithR(2, { openedAt: new Date('2026-09-01T06:00:00Z') }),
      tradeWithR(-1, { openedAt: new Date('2026-09-01T07:00:00Z') }),
      tradeWithR(-1, { openedAt: new Date('2026-09-01T08:00:00Z') }),
    ];
    const r = simulate(sameDay, 10000, { maxPerDay: 1 }, TZ);
    expect(r.kept).toBe(1);
  });

  it('vaqt oynasini mintaqada qo‘llaydi', () => {
    // 06:00 UTC = 11:00 Toshkent — 09:00-12:00 oynasiga tushadi
    const t = tradeWithR(2, { openedAt: new Date('2026-09-01T06:00:00Z') });
    expect(simulate([t], 10000, { hourFrom: 9, hourTo: 11 }, TZ).kept).toBe(1);
    expect(simulate([t], 10000, { hourFrom: 9, hourTo: 11 }, 'UTC').kept).toBe(0);
  });

  it('egri chiziq boshlang‘ich balansdan boshlanadi', () => {
    const r = simulate(trades, 10000, {}, TZ);
    expect(r.curve[0]).toBe(10000);
    expect(r.curve).toHaveLength(4);
  });
});

describe('Monte-Carlo', () => {
  const many = Array.from({ length: 40 }, (_, i) =>
    tradeWithR(i % 3 === 0 ? -1 : 1.5, {
      closedAt: new Date(Date.UTC(2026, 5, (i % 28) + 1, 10)),
    }),
  );

  it('30 savdodan kam bo‘lsa hisoblamaydi', () => {
    expect(monteCarlo(many.slice(0, 10), 10000, 6)).toBeNull();
  });

  it('protsentil chiziqlari tartibda turadi', () => {
    const result = monteCarlo(many, 10000, 6, 200)!;
    expect(result.sampleSize).toBe(40);
    expect(result.bands.p50).toHaveLength(41);
    for (let i = 0; i < result.bands.p50.length; i += 1) {
      expect(result.bands.p5[i]).toBeLessThanOrEqual(result.bands.p50[i]);
      expect(result.bands.p50[i]).toBeLessThanOrEqual(result.bands.p95[i]);
    }
  });

  it('natija takrorlanadi — generator determinlashgan', () => {
    const a = monteCarlo(many, 10000, 6, 200)!;
    const b = monteCarlo(many, 10000, 6, 200)!;
    expect(a.medianDrawdownPct).toBe(b.medianDrawdownPct);
    expect(a.worstStreak).toBe(b.worstStreak);
  });

  it('gistogrammalardagi yig‘indi ishga tushirishlar soniga teng', () => {
    const result = monteCarlo(many, 10000, 6, 200)!;
    const ddTotal = result.drawdownHistogram.reduce((s, b) => s + b.count, 0);
    const streakTotal = result.streakHistogram.reduce((s, b) => s + b.count, 0);
    expect(ddTotal).toBe(200);
    expect(streakTotal).toBe(200);
  });

  it('limitdan oshish ehtimoli 0–100 oralig‘ida bo‘ladi', () => {
    const result = monteCarlo(many, 10000, 6, 200)!;
    expect(result.ruinChance).toBeGreaterThanOrEqual(0);
    expect(result.ruinChance).toBeLessThanOrEqual(100);
  });
});

describe('davrlarni solishtirish', () => {
  it('faqat davr ichidagi savdolarni oladi', () => {
    const trades = [
      tradeWithR(2, { closedAt: new Date('2026-09-10T10:00:00Z') }),
      tradeWithR(-1, { closedAt: new Date('2026-08-10T10:00:00Z') }),
    ];
    const p = periodStats(trades, new Date('2026-09-01'), new Date('2026-10-01'), 'Sentabr');
    expect(p.count).toBe(1);
    expect(p.netPnl).toBeCloseTo(200, 6);
  });

  it('kichik tebranishni sezilarli deb hisoblamaydi', () => {
    expect(meaningful(100, 105)).toBe(false);
    expect(meaningful(100, 130)).toBe(true);
    expect(meaningful(0, 0)).toBe(false);
  });
});
