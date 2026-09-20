import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { evaluateAlerts, summarizeAlertOutcomes } from '@/lib/alerts';
import { uz } from '@/lib/i18n';
import { correlationGroups, exposure, relatedSymbols } from '@/lib/correlation';
import { tradeWithR } from './helpers';

const TZ = 'UTC';

/** Kunlik qoidalar "hozir" ga bog'liq. Vaqt qotirilmasa test UTC kuni
 *  endigina boshlangan payt yiqiladi: "60 daqiqa oldin" kechagi kunga
 *  tushib qoladi. Chorshanba, kun o'rtasi — chetlari yo'q payt.
 */
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-09-16T14:00:00Z'));
});

afterAll(() => {
  vi.useRealTimers();
});

const account = {
  dailyLossPct: 3,
  maxDrawdownPct: 6,
  riskPerTradePct: 1,
  startingBalance: 10000,
};

/** Bugungi kunda yopilgan savdo — kunlik qoidalar shunga qarab ishlaydi. */
function todayTrade(r: number, minutesAgo = 60) {
  const closedAt = new Date(Date.now() - minutesAgo * 60000);
  return tradeWithR(r, { closedAt, openedAt: new Date(closedAt.getTime() - 30 * 60000) });
}

describe('kunlik limit', () => {
  it('limit ochiq bo‘lsa ogohlantirmaydi', () => {
    const alerts = evaluateAlerts({ d: uz, account, trades: [todayTrade(2)], timeZone: TZ });
    expect(alerts.find((a) => a.kind.startsWith('DAILY'))).toBeUndefined();
  });

  it('limitning 70 foizi ketganda ogohlantiradi', () => {
    // 1R = $100. Limit ≈ 3% × ~10 000 = $300. −$220 ≈ 73%.
    const alerts = evaluateAlerts({ d: uz, account, trades: [todayTrade(-2.2)], timeZone: TZ });
    const alert = alerts.find((a) => a.kind === 'DAILY_LIMIT_NEAR');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('warn');
  });

  it('limit tugaganda jiddiy ogohlantirish beradi', () => {
    const alerts = evaluateAlerts({ d: uz, account, trades: [todayTrade(-4)], timeZone: TZ });
    const alert = alerts.find((a) => a.kind === 'DAILY_LIMIT_HIT');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('serious');
  });
});

describe('ketma-ket stoplar', () => {
  it('bugungi ikki zarardan keyin ogohlantiradi', () => {
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [todayTrade(-1, 90), todayTrade(-1, 30)],
      timeZone: TZ,
    });
    expect(alerts.find((a) => a.kind === 'LOSS_STREAK')).toBeDefined();
  });

  it('eski zararlar uchun har kuni ogohlantirmaydi', () => {
    const old = [
      tradeWithR(-1, { closedAt: new Date('2026-01-10T10:00:00Z') }),
      tradeWithR(-1, { closedAt: new Date('2026-01-11T10:00:00Z') }),
    ];
    const alerts = evaluateAlerts({ d: uz, account, trades: old, timeZone: TZ });
    expect(alerts.find((a) => a.kind === 'LOSS_STREAK')).toBeUndefined();
  });

  it('oxirgi ikkitadan biri g‘alaba bo‘lsa ogohlantirmaydi', () => {
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [todayTrade(-1, 90), todayTrade(2, 30)],
      timeZone: TZ,
    });
    expect(alerts.find((a) => a.kind === 'LOSS_STREAK')).toBeUndefined();
  });
});

describe('revenge-trade', () => {
  it('zarardan keyin 15 daqiqa ichida katta hajmda ogohlantiradi', () => {
    const loss = todayTrade(-1, 10);
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [loss],
      timeZone: TZ,
      draft: { openedAt: new Date(), volume: loss.volume * 2, risk: 100 },
    });
    const alert = alerts.find((a) => a.kind === 'REVENGE_TRADE');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('serious');
  });

  it('hajm oshmagan bo‘lsa ogohlantirmaydi', () => {
    const loss = todayTrade(-1, 10);
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [loss],
      timeZone: TZ,
      draft: { openedAt: new Date(), volume: loss.volume, risk: 100 },
    });
    expect(alerts.find((a) => a.kind === 'REVENGE_TRADE')).toBeUndefined();
  });

  it('ko‘p vaqt o‘tgan bo‘lsa ogohlantirmaydi', () => {
    const loss = todayTrade(-1, 120);
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [loss],
      timeZone: TZ,
      draft: { openedAt: new Date(), volume: loss.volume * 3, risk: 100 },
    });
    expect(alerts.find((a) => a.kind === 'REVENGE_TRADE')).toBeUndefined();
  });
});

describe('risk chegarasi', () => {
  it('chegaradan yuqori riskda ogohlantiradi', () => {
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [],
      timeZone: TZ,
      draft: { openedAt: new Date(), volume: 1, risk: 250 }, // 2.5% > 1%
    });
    expect(alerts.find((a) => a.kind === 'RISK_TOO_BIG')).toBeDefined();
  });

  it('chegara ichida ogohlantirmaydi', () => {
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [],
      timeZone: TZ,
      draft: { openedAt: new Date(), volume: 0.1, risk: 95 },
    });
    expect(alerts.find((a) => a.kind === 'RISK_TOO_BIG')).toBeUndefined();
  });
});

describe('korrelyatsiya', () => {
  it('juftlik tarkibidan yo‘nalishni chiqaradi', () => {
    expect(exposure('EURUSD', 'LONG')).toEqual({ longCurrency: 'EUR', shortCurrency: 'USD' });
    expect(exposure('EURUSD', 'SHORT')).toEqual({ longCurrency: 'USD', shortCurrency: 'EUR' });
    expect(exposure('NOSUCH', 'LONG')).toBeNull();
  });

  it('bir valyutaga bir tomondan turgan pozitsiyalarni guruhlaydi', () => {
    const groups = correlationGroups([
      { id: '1', symbol: 'EURUSD', direction: 'LONG', risk: 100 },
      { id: '2', symbol: 'GBPUSD', direction: 'LONG', risk: 150 },
    ]);
    const usdShort = groups.find((g) => g.currency === 'USD' && g.side === 'short');
    expect(usdShort).toBeDefined();
    expect(usdShort?.positions).toHaveLength(2);
    expect(usdShort?.totalRisk).toBeCloseTo(250, 6);
  });

  it('qarama-qarshi pozitsiyalarni guruhlamaydi', () => {
    const groups = correlationGroups([
      { id: '1', symbol: 'EURUSD', direction: 'LONG', risk: 100 },
      { id: '2', symbol: 'EURUSD', direction: 'SHORT', risk: 100 },
    ]);
    expect(groups).toHaveLength(0);
  });

  it('bitta pozitsiya uchun guruh chiqarmaydi', () => {
    const groups = correlationGroups([
      { id: '1', symbol: 'EURUSD', direction: 'LONG', risk: 100 },
    ]);
    expect(groups).toHaveLength(0);
  });

  it('ochiq pozitsiyalar bo‘yicha ogohlantirish beradi', () => {
    const open = (symbol: string) =>
      tradeWithR(0, { symbol, exitPrice: null, closedAt: null });
    const alerts = evaluateAlerts({
      d: uz,
      account,
      trades: [open('EURUSD'), open('GBPUSD')],
      timeZone: TZ,
    });
    expect(alerts.find((a) => a.kind === 'CORRELATION')).toBeDefined();
  });

  it('shu yo‘nalishdagi boshqa instrumentlarni taklif qiladi', () => {
    expect(relatedSymbols('USD', 'short').length).toBeGreaterThan(0);
  });
});

describe('ogohlantirish natijalari', () => {
  it('e’tibor berilmagan savdolarning natijasini yig‘adi', () => {
    const loss = tradeWithR(-1, { id: 'x' });
    const win = tradeWithR(2, { id: 'y' });
    const outcome = summarizeAlertOutcomes(
      [
        { action: 'IGNORED', tradeId: 'x' },
        { action: 'IGNORED', tradeId: 'y' },
        { action: 'STOPPED', tradeId: null },
      ],
      [loss, win],
    );
    expect(outcome.total).toBe(3);
    expect(outcome.stopped).toBe(1);
    expect(outcome.ignored).toBe(2);
    expect(outcome.ignoredLosses).toBe(1);
    expect(outcome.ignoredPnl).toBeCloseTo(100, 6);
  });
});
