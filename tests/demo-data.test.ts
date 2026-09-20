import { describe, expect, it } from 'vitest';
import { buildDemoData } from '@/lib/demo-data';
import { uz } from '@/lib/i18n/uz';
import { ru } from '@/lib/i18n/ru';
import { netPnl, rMultiple, summarize } from '@/lib/stats';

const NOW = new Date('2026-09-18T12:00:00Z');

function data() {
  return buildDemoData({ d: uz, now: NOW });
}

describe('namuna ma’lumot', () => {
  it('bir xil urug‘dan bir xil natija chiqadi', () => {
    const a = buildDemoData({ d: uz, now: NOW, seed: 7 });
    const b = buildDemoData({ d: uz, now: NOW, seed: 7 });

    expect(a.trades.length).toBe(b.trades.length);
    expect(a.trades[0]).toEqual(b.trades[0]);
    expect(a.journal.length).toBe(b.journal.length);
  });

  it('boshqa urug‘ boshqa natija beradi', () => {
    const a = buildDemoData({ d: uz, now: NOW, seed: 1 });
    const b = buildDemoData({ d: uz, now: NOW, seed: 2 });
    expect(a.trades[0]).not.toEqual(b.trades[0]);
  });

  it('bo‘sh ekran qolmaydi: savdo, setup, kundalik va backtest bor', () => {
    const d = data();

    expect(d.setups.length).toBeGreaterThanOrEqual(3);
    expect(d.instruments.length).toBeGreaterThanOrEqual(5);
    expect(d.trades.length).toBeGreaterThan(30);
    expect(d.journal.length).toBeGreaterThan(2);
    expect(d.trades.filter((t) => t.isBacktest).length).toBe(14);
  });

  it('aynan bitta ochiq pozitsiya bo‘ladi', () => {
    const open = data().trades.filter((t) => t.closedAt === null);
    expect(open).toHaveLength(1);
    expect(open[0].isBacktest).toBe(false);
  });
});

describe('sanalar', () => {
  it('hech bir savdo kelajakda emas', () => {
    for (const trade of data().trades) {
      expect(trade.openedAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      if (trade.closedAt) {
        // Ochiq pozitsiya ikki soat oldin ochilgan, yopilishi kelajakda emas.
        expect(trade.closedAt.getTime()).toBeGreaterThan(trade.openedAt.getTime());
      }
    }
  });

  it('dam olish kunlarida savdo yo‘q', () => {
    for (const trade of data().trades) {
      if (trade.isBacktest) continue;
      const day = trade.openedAt.getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it('qaysi kun va soatda ochilsa ham ish kunida qoladi', () => {
    // Ilgari ochiq pozitsiya tunda kunni orqaga surib yuborardi va
    // dam olish kuniga ham tushib qolardi — bu sinov shuni ushlaydi.
    for (let day = 0; day < 9; day += 1) {
      for (const hour of [0, 1, 9, 23]) {
        const when = new Date(Date.UTC(2026, 8, 14 + day, hour, 45, 0));
        const result = buildDemoData({ d: uz, now: when });

        for (const trade of result.trades) {
          if (trade.isBacktest) continue;
          expect([1, 2, 3, 4, 5]).toContain(trade.openedAt.getDay());
          expect(trade.openedAt.getTime()).toBeLessThanOrEqual(when.getTime());
        }
      }
    }
  });

  it('kundalik sanalari UTC yarim tunida turadi', () => {
    for (const entry of data().journal) {
      expect(entry.date.getUTCHours()).toBe(0);
      expect(entry.date.getUTCMinutes()).toBe(0);
    }
  });
});

describe('savdolar mantiqan to‘g‘ri', () => {
  it('stop yo‘nalishga mos, hajm musbat', () => {
    for (const trade of data().trades) {
      expect(trade.volume).toBeGreaterThan(0);
      if (trade.direction === 'LONG') {
        expect(trade.stopPrice).toBeLessThan(trade.entryPrice);
      } else {
        expect(trade.stopPrice).toBeGreaterThan(trade.entryPrice);
      }
    }
  });

  it('R qiymati aqlli oraliqda — sehrli natija ko‘rsatilmaydi', () => {
    const closed = data().trades.filter((t) => !t.isBacktest && t.closedAt);

    for (const trade of closed) {
      const r = rMultiple(trade);
      expect(r).toBeGreaterThan(-2);
      expect(r).toBeLessThan(4);
    }
  });

  it('natija ishonarli: win rate va qoidaga rioya 100% emas', () => {
    const d = data();
    const real = d.trades.filter((t) => !t.isBacktest);
    const summary = summarize(real, d.account.startingBalance);

    expect(summary.winRate).toBeGreaterThan(30);
    expect(summary.winRate).toBeLessThan(75);
    expect(summary.ruleCompliance).toBeGreaterThan(50);
    expect(summary.ruleCompliance).toBeLessThan(100);
  });

  it('zarar ham bor — faqat foyda ko‘rsatilmaydi', () => {
    const losses = data().trades.filter((t) => t.closedAt && netPnl(t) < 0);
    expect(losses.length).toBeGreaterThan(5);
  });
});

describe('til', () => {
  it('izohlar tanlangan tilda yoziladi', () => {
    const uzbek = buildDemoData({ d: uz, now: NOW, seed: 5 });
    const rus = buildDemoData({ d: ru, now: NOW, seed: 5 });

    expect(uzbek.account.name).toBe(uz.demo.accountName);
    expect(rus.account.name).toBe(ru.demo.accountName);
    expect(rus.journal[0].plan).not.toBe(uzbek.journal[0].plan);
  });

  it('sessiya nomi bazadagi ko‘rinishda qoladi', () => {
    // Sessiya — ma'lumot, yorliq emas: u tarjima qilinmaydi.
    const sessions = new Set(data().trades.map((t) => t.session));
    for (const name of sessions) {
      expect(['Osiyo', 'London', 'Overlap', 'Nyu-York']).toContain(name);
    }
  });
});
