import { describe, expect, it } from 'vitest';
import {
  groupBy,
  isClosed,
  monthCalendar,
  netPnl,
  plannedRR,
  pnlOnDay,
  rDistribution,
  rMultiple,
  riskAmount,
  stopPips,
  summarize,
  weekdayBreakdown,
  winRateAfterLoss,
} from '@/lib/stats';
import { trade, tradeWithR } from './helpers';

const TZ = 'Asia/Tashkent';

describe('bitta savdo hisoblari', () => {
  it('stop masofasini punktlarda beradi', () => {
    expect(stopPips(trade())).toBe(100);
  });

  it('1R ni pulda beradi: punkt × punkt qiymati × hajm', () => {
    expect(riskAmount(trade())).toBeCloseTo(100, 6);
  });

  it('long savdoda foydani hisoblaydi', () => {
    // 3600 → 3620 = 200 punkt × $10 × 0.1 lot = $200
    expect(netPnl(trade())).toBeCloseTo(200, 6);
    expect(rMultiple(trade())).toBeCloseTo(2, 6);
  });

  it('short savdoda yo‘nalishni teskari hisoblaydi', () => {
    const t = trade({
      direction: 'SHORT',
      entryPrice: 3600,
      stopPrice: 3610,
      exitPrice: 3580,
    });
    expect(netPnl(t)).toBeCloseTo(200, 6);
    expect(rMultiple(t)).toBeCloseTo(2, 6);
  });

  it('komissiya va svopni natijadan ayiradi', () => {
    expect(netPnl(trade({ commission: 7, swap: 3 }))).toBeCloseTo(190, 6);
  });

  it('broker qiymati berilsa, hisoblangan natija o‘rniga o‘shani oladi', () => {
    const t = trade({ pnlOverride: -42.5 });
    expect(netPnl(t)).toBe(-42.5);
    // R ham broker qiymatidan chiqadi: -42.5 / 100
    expect(rMultiple(t)).toBeCloseTo(-0.425, 6);
  });

  it('ochiq pozitsiyani yopilmagan deb biladi', () => {
    expect(isClosed(trade({ exitPrice: null, closedAt: null }))).toBe(false);
    expect(netPnl(trade({ exitPrice: null, closedAt: null }))).toBe(0);
  });

  it('risk nol bo‘lsa R ni nolga tenglaydi, cheksizlikka ketmaydi', () => {
    expect(rMultiple(trade({ stopPrice: 3600 }))).toBe(0);
  });

  it('reja R:R nisbatini take profitdan chiqaradi', () => {
    expect(plannedRR(trade({ takeProfit: 3630 }))).toBeCloseTo(3, 6);
    expect(plannedRR(trade({ takeProfit: null }))).toBeNull();
  });
});

describe('umumiy statistika', () => {
  it('bo‘sh ro‘yxatda ham xavfsiz ishlaydi', () => {
    const s = summarize([], 10000);
    expect(s.count).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.balance).toBe(10000);
    expect(s.expectancy).toBe(0);
  });

  it('win rate ni faqat hal bo‘lgan savdolardan hisoblaydi', () => {
    // 2 g'alaba, 1 zarar, 1 breakeven → 2/3
    const s = summarize(
      [tradeWithR(2), tradeWithR(1.5), tradeWithR(-1), tradeWithR(0)],
      10000,
    );
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.breakeven).toBe(1);
    expect(s.winRate).toBeCloseTo(66.67, 1);
  });

  it('profit factor = gross foyda / gross zarar', () => {
    const s = summarize([tradeWithR(2), tradeWithR(2), tradeWithR(-1)], 10000);
    // +200 +200 / 100
    expect(s.profitFactor).toBeCloseTo(4, 6);
  });

  it('zarar bo‘lmasa profit factor null qaytaradi, nolga bo‘lmaydi', () => {
    const s = summarize([tradeWithR(2)], 10000);
    expect(s.profitFactor).toBeNull();
  });

  it('expectancy — har savdoga to‘g‘ri keladigan sof natija', () => {
    const s = summarize([tradeWithR(2), tradeWithR(-1)], 10000);
    expect(s.netPnl).toBeCloseTo(100, 6);
    expect(s.expectancy).toBeCloseTo(50, 6);
  });

  it('max drawdown cho‘qqidan pasayishni o‘lchaydi', () => {
    // 10000 → 10200 → 10100 → 9900: cho'qqi 10200, tub 9900 → 300
    const s = summarize(
      [
        tradeWithR(2, { closedAt: new Date('2026-09-01T10:00:00Z') }),
        tradeWithR(-1, { closedAt: new Date('2026-09-02T10:00:00Z') }),
        tradeWithR(-2, { closedAt: new Date('2026-09-03T10:00:00Z') }),
      ],
      10000,
    );
    expect(s.maxDrawdown).toBeCloseTo(300, 6);
    expect(s.maxDrawdownPct).toBeCloseTo((300 / 10200) * 100, 4);
  });

  it('eng uzun g‘alaba va zarar seriyalarini sanaydi', () => {
    const rs = [1, 1, 1, -1, -1, 1, -1, -1, -1];
    const s = summarize(
      rs.map((r, i) =>
        tradeWithR(r, { closedAt: new Date(Date.UTC(2026, 8, i + 1, 10)) }),
      ),
      10000,
    );
    expect(s.longestWinStreak).toBe(3);
    expect(s.longestLossStreak).toBe(3);
  });

  it('savdolarni yopilish vaqti bo‘yicha tartiblab hisoblaydi', () => {
    // Teskari tartibda berilgan bo'lsa ham drawdown to'g'ri chiqishi kerak.
    const late = tradeWithR(-2, { closedAt: new Date('2026-09-03T10:00:00Z') });
    const early = tradeWithR(2, { closedAt: new Date('2026-09-01T10:00:00Z') });
    const s = summarize([late, early], 10000);
    expect(s.equity[0].balance).toBeCloseTo(10200, 6);
    expect(s.equity[1].balance).toBeCloseTo(10000, 6);
  });
});

describe('kesimlar', () => {
  it('setup bo‘yicha guruhlaydi va sof natija bo‘yicha saralaydi', () => {
    const rows = groupBy(
      [
        tradeWithR(2, { setup: { id: 'a', name: 'A' } }),
        tradeWithR(-1, { setup: { id: 'b', name: 'B' } }),
        tradeWithR(1, { setup: { id: 'a', name: 'A' } }),
      ],
      (t) => t.setup?.name ?? 'Setupsiz',
    );
    expect(rows[0].key).toBe('A');
    expect(rows[0].count).toBe(2);
    expect(rows[0].netPnl).toBeCloseTo(300, 6);
    expect(rows[1].key).toBe('B');
  });

  it('R taqsimotida chekka qiymatlarni chetki savatga qisadi', () => {
    const buckets = rDistribution([tradeWithR(9), tradeWithR(-9)]);
    const plus4 = buckets.find((b) => b.label === '+4R');
    const minus3 = buckets.find((b) => b.label === '−3R');
    expect(plus4?.count).toBe(1);
    expect(minus3?.count).toBe(1);
  });

  it('zarardan keyingi win rate ni alohida hisoblaydi', () => {
    // Ketma-ketlik: zarar, g'alaba, zarar, zarar → zarardan keyin 1/2
    const rs = [-1, 2, -1, -1];
    const trades = rs.map((r, i) =>
      tradeWithR(r, { closedAt: new Date(Date.UTC(2026, 8, i + 1, 10)) }),
    );
    const after = winRateAfterLoss(trades);
    expect(after.count).toBe(2);
    expect(after.winRate).toBeCloseTo(50, 6);
  });
});

describe('kun chegarasi', () => {
  it('kunlik natijani foydalanuvchi mintaqasida yig‘adi', () => {
    // 2026-09-15 20:00 UTC = Toshkentda 16-sentabr 01:00
    const t = tradeWithR(2, { closedAt: new Date('2026-09-15T20:00:00Z') });
    expect(pnlOnDay([t], '2026-09-16', TZ)).toBeCloseTo(200, 6);
    expect(pnlOnDay([t], '2026-09-15', TZ)).toBe(0);
    // UTC da esa o'sha kun
    expect(pnlOnDay([t], '2026-09-15', 'UTC')).toBeCloseTo(200, 6);
  });

  it('kalendarni dushanbadan boshlanadigan haftalarga bo‘ladi', () => {
    // 2026 yil sentabr 1-sentabrda seshanbaga to'g'ri keladi → bitta bo'sh katak
    const weeks = monthCalendar([], 2026, 8, TZ);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toEqual({ day: 1, netPnl: 0, count: 0 });
    expect(weeks.flat().filter((c) => c !== null)).toHaveLength(30);
  });

  it('hafta kunlari kesimida dushanba nolinchi o‘rinda turadi', () => {
    // 2026-09-14 — dushanba
    const t = tradeWithR(2, { closedAt: new Date('2026-09-14T10:00:00Z') });
    const rows = weekdayBreakdown([t], TZ);
    expect(rows[0].count).toBe(1);
    expect(rows[0].netPnl).toBeCloseTo(200, 6);
  });
});
