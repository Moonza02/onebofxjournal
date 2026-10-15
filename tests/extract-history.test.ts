import { describe, expect, it } from 'vitest';
import {
  HISTORY_HEADERS,
  MAX_HISTORY_ROWS,
  normalizeHistoryRows,
} from '../src/lib/extract-history';
import { suggestMapping, REQUIRED } from '../src/lib/import/fields';

const row = {
  symbol: 'EURUSD',
  direction: 'buy',
  openedAt: '2026-10-14T15:10',
  closedAt: '2026-10-14T15:30',
  entryPrice: '1.11924',
  exitPrice: '1.11682',
  volume: '5',
  commission: '',
  swap: '',
  profit: '-1210.00',
};

describe('normalizeHistoryRows', () => {
  it('oddiy qator o‘tadi', () => {
    const grid = normalizeHistoryRows([row]);
    expect(grid.rows).toEqual([
      ['EURUSD', 'LONG', '2026-10-14T15:10', '2026-10-14T15:30', '1.11924', '1.11682', '5', '', '', '-1210.00'],
    ]);
    expect(grid.assumedOpenedAt).toBe(0);
    expect(grid.dropped).toBe(0);
  });

  it('sell → SHORT', () => {
    expect(normalizeHistoryRows([{ ...row, direction: 'sell' }]).rows[0][1]).toBe('SHORT');
  });

  // Telefon tarixida odatda bitta vaqt ko'rinadi.
  it('ochilish vaqti yo‘q — yopilish vaqti qo‘yiladi va sanaladi', () => {
    const grid = normalizeHistoryRows([{ ...row, openedAt: '' }]);
    expect(grid.rows[0][2]).toBe('2026-10-14T15:30');
    expect(grid.assumedOpenedAt).toBe(1);
  });

  it('ikkala vaqt ham yo‘q — ochilish bo‘sh qoladi', () => {
    const grid = normalizeHistoryRows([{ ...row, openedAt: '', closedAt: '' }]);
    expect(grid.rows[0][2]).toBe('');
    expect(grid.assumedOpenedAt).toBe(0);
  });

  // Yakuniy qatorlar ("Total", "Balance") savdo emas: ularda hajm ham,
  // yo'nalish ham bo'lmaydi.
  it('yo‘nalishsiz, hajmsiz yoki instrumentsiz qator tashlanadi', () => {
    const grid = normalizeHistoryRows([
      { ...row, direction: 'Total' },
      { ...row, volume: '' },
      { ...row, symbol: '' },
      row,
    ]);
    expect(grid.rows).toHaveLength(1);
    expect(grid.dropped).toBe(3);
  });

  it('axlat qiymatlar yiqitmaydi', () => {
    expect(normalizeHistoryRows(null).rows).toEqual([]);
    expect(normalizeHistoryRows('salom').rows).toEqual([]);
    expect(normalizeHistoryRows([null, 42]).dropped).toBe(2);
  });

  it('instrumentdagi qo‘shimchalar tozalanadi', () => {
    expect(normalizeHistoryRows([{ ...row, symbol: 'eurusd.m' }]).rows[0][0]).toBe('EURUSDM');
  });

  it('chegaradan ortig‘i olinmaydi', () => {
    const many = Array.from({ length: MAX_HISTORY_ROWS + 10 }, () => row);
    expect(normalizeHistoryRows(many).rows).toHaveLength(MAX_HISTORY_ROWS);
  });

  // Eng muhim bog'lanish: sarlavhalar import quvuri tanishi kerak,
  // aks holda foydalanuvchi ustunlarni qo'lda moslashga majbur bo'ladi.
  it('sarlavhalar import quvurida o‘zi tanilади', () => {
    const mapping = suggestMapping([...HISTORY_HEADERS]);
    for (const field of REQUIRED) {
      if (field === 'openedAt') continue;
      expect(mapping[field]).toBeTypeOf('number');
    }
    expect(mapping.openedAt).toBeTypeOf('number');
    expect(mapping.profit).toBeTypeOf('number');
  });
});
