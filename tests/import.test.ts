import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv } from '@/lib/import/csv';
import { suggestMapping, toDate, toDirection, toNumber } from '@/lib/import/fields';
import { dedupeHeaders, looksLikeHtml, parseMtHtml } from '@/lib/import/mt';
import { mapRow, mapRows, missingFields, tradeKey } from '@/lib/import/map';
import { ImportError, parseFile } from '@/lib/import';
import { decodeBuffer } from '@/lib/import/decode';

/* ------------------------------------------------------------------- CSV */

describe('detectDelimiter', () => {
  it('vergulni topadi', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('nuqtali vergulni topadi', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('tabni topadi', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('matn ichidagi vergul aldab ketmaydi', () => {
    // Har qatorda bitta `;` barqaror, vergul esa turlicha uchraydi.
    const text = 'nom;izoh\nA;bir, ikki, uch\nB;bir\nC;bir, ikki';
    expect(detectDelimiter(text)).toBe(';');
  });

  it('bo‘sh matnda vergul qaytaradi', () => {
    expect(detectDelimiter('')).toBe(',');
  });
});

describe('parseCsv', () => {
  it('oddiy jadvalni o‘qiydi', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('qo‘shtirnoq ichidagi vergulni saqlaydi', () => {
    expect(parseCsv('a,b\n"bir, ikki",2')).toEqual([
      ['a', 'b'],
      ['bir, ikki', '2'],
    ]);
  });

  it('ikkilangan qo‘shtirnoqni bittaga aylantiradi', () => {
    expect(parseCsv('a\n"u ""zor"" dedi"')).toEqual([['a'], ['u "zor" dedi']]);
  });

  it('qo‘shtirnoq ichidagi qator ko‘chirishni saqlaydi', () => {
    const rows = parseCsv('a,b\n"bir\nikki",2');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('bir\nikki');
  });

  it('BOM belgisini olib tashlaydi', () => {
    const rows = parseCsv('﻿Symbol,Type\nEURUSD,buy');
    expect(rows[0][0]).toBe('Symbol');
  });

  it('bo‘sh qatorlarni tashlaydi', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toHaveLength(2);
  });

  it('oxirgi qator ko‘chirishsiz tugasa ham oladi', () => {
    expect(parseCsv('a,b\n1,2')).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------- qiymat */

describe('toNumber', () => {
  it('oddiy sonni o‘qiydi', () => {
    expect(toNumber('1.2345')).toBe(1.2345);
  });

  it('inglizcha mingliklarni o‘qiydi', () => {
    expect(toNumber('1,234.56')).toBe(1234.56);
  });

  it('yevropacha kasrni o‘qiydi', () => {
    expect(toNumber('1.234,56')).toBe(1234.56);
  });

  it('bo‘shliqli mingliklarni o‘qiydi', () => {
    expect(toNumber('1 234,56')).toBe(1234.56);
  });

  it('faqat vergul uch xonadan keyin kelsa mingliklar ajratgichi', () => {
    expect(toNumber('1,234')).toBe(1234);
    expect(toNumber('1,23')).toBe(1.23);
  });

  it('qavsni manfiy deb oladi', () => {
    expect(toNumber('(120.50)')).toBe(-120.5);
  });

  it('matematik minusni tushunadi', () => {
    expect(toNumber('−120.50')).toBe(-120.5);
  });

  it('valyuta belgisini tashlaydi', () => {
    expect(toNumber('$ 1,200.00')).toBe(1200);
  });

  it('bo‘sh va chiziqni null qiladi', () => {
    expect(toNumber('')).toBeNull();
    expect(toNumber('-')).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber('n/a')).toBeNull();
  });
});

describe('toDirection', () => {
  it('asosiy ko‘rinishlarni oladi', () => {
    expect(toDirection('buy')).toBe('LONG');
    expect(toDirection('Sell')).toBe('SHORT');
    expect(toDirection('LONG')).toBe('LONG');
    expect(toDirection('short')).toBe('SHORT');
  });

  it('MT5 kengaytmalarini oladi', () => {
    expect(toDirection('buy limit')).toBe('LONG');
    expect(toDirection('sell stop')).toBe('SHORT');
  });

  it('MT4 "balance" qatorini savdo deb hisoblamaydi', () => {
    // Bir harfli qoida butun so'zga yopishib qolmasligi kerak.
    expect(toDirection('balance')).toBeNull();
    expect(toDirection('credit')).toBeNull();
  });

  it('raqamli ko‘rinishni oladi', () => {
    expect(toDirection('0')).toBe('LONG');
    expect(toDirection('1')).toBe('SHORT');
  });

  it('notanish qiymatda null', () => {
    expect(toDirection('deposit')).toBeNull();
    expect(toDirection('')).toBeNull();
  });
});

describe('toDate', () => {
  it('MetaTrader ko‘rinishini oladi', () => {
    const d = toDate('2026.09.18 14:30:00');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(18);
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(30);
  });

  it('ISO ko‘rinishini oladi', () => {
    const d = toDate('2026-09-18T14:30');
    expect(d?.getDate()).toBe(18);
    expect(d?.getHours()).toBe(14);
  });

  it('vaqtsiz sanani oladi', () => {
    const d = toDate('2026-09-18');
    expect(d?.getHours()).toBe(0);
  });

  it('yevropacha kun-oy-yilni oladi', () => {
    const d = toDate('18/09/2026 14:30');
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(18);
  });

  it('mavjud bo‘lmagan sanani rad etadi', () => {
    expect(toDate('2026.02.31 10:00')).toBeNull();
    expect(toDate('2026.13.01')).toBeNull();
  });

  it('bo‘sh qiymatda null', () => {
    expect(toDate('')).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('salom')).toBeNull();
  });
});

/* --------------------------------------------------------------- moslash */

describe('suggestMapping', () => {
  it('inglizcha sarlavhalarni taniydi', () => {
    const m = suggestMapping([
      'Symbol',
      'Type',
      'Open Time',
      'Close Time',
      'Entry Price',
      'Stop Loss',
      'Take Profit',
      'Exit Price',
      'Volume',
      'Profit',
    ]);
    expect(m.symbol).toBe(0);
    expect(m.direction).toBe(1);
    expect(m.openedAt).toBe(2);
    expect(m.closedAt).toBe(3);
    expect(m.entryPrice).toBe(4);
    expect(m.stopPrice).toBe(5);
    expect(m.takeProfit).toBe(6);
    expect(m.exitPrice).toBe(7);
    expect(m.volume).toBe(8);
    expect(m.profit).toBe(9);
  });

  it('ruscha sarlavhalarni taniydi', () => {
    const m = suggestMapping(['Символ', 'Тип', 'Время открытия', 'Объем']);
    expect(m.symbol).toBe(0);
    expect(m.direction).toBe(1);
    expect(m.openedAt).toBe(2);
    expect(m.volume).toBe(3);
  });

  it('o‘zbekcha sarlavhalarni taniydi', () => {
    const m = suggestMapping(['Instrument', 'Yo‘nalish', 'Ochilish vaqti', 'Hajm', 'Izoh']);
    expect(m.symbol).toBe(0);
    expect(m.direction).toBe(1);
    expect(m.openedAt).toBe(2);
    expect(m.volume).toBe(3);
    expect(m.notes).toBe(4);
  });

  it('bitta ustunni ikki maydonga bermaydi', () => {
    const m = suggestMapping(['Time', 'Symbol', 'Volume']);
    const used = Object.values(m);
    expect(new Set(used).size).toBe(used.length);
  });

  it('band ustunda to‘xtab qolmaydi', () => {
    // "Open Time" openedAt ga ketadi; entryPrice "Open Price" ni topishi kerak.
    const m = suggestMapping(['Open Time', 'Open Price', 'Volume']);
    expect(m.openedAt).toBe(0);
    expect(m.entryPrice).toBe(1);
  });

  it('notanish sarlavhalarni tashlab ketadi', () => {
    const m = suggestMapping(['xyz', 'qqq']);
    expect(Object.keys(m)).toHaveLength(0);
  });
});

describe('missingFields', () => {
  it('yetishmaganini aytadi', () => {
    expect(missingFields({ symbol: 0 })).toEqual([
      'direction',
      'openedAt',
      'entryPrice',
      'volume',
    ]);
  });

  it('to‘liq moslashda bo‘sh', () => {
    expect(
      missingFields({ symbol: 0, direction: 1, openedAt: 2, entryPrice: 3, volume: 4 }),
    ).toEqual([]);
  });
});

/* -------------------------------------------------------------------- MT */

const MT4_REPORT = `<html><head><title>Statement</title></head><body>
<table>
<tr><td colspan="14"><b>Broker Ltd</b></td></tr>
<tr><td>Ticket</td><td>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td>Close Time</td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
<tr><td>101</td><td>2026.09.15 09:12:00</td><td>buy</td><td>0.50</td><td>eurusd</td><td>1.08200</td><td>1.07900</td><td>1.08800</td><td>2026.09.15 12:40:00</td><td>1.08800</td><td>-3.50</td><td>0.00</td><td>-1.20</td><td>300.00</td></tr>
<tr><td>102</td><td>2026.09.16 10:00:00</td><td>sell</td><td>0.30</td><td>gbpusd</td><td>1.27500</td><td>1.27800</td><td>0.00</td><td>2026.09.16 11:05:00</td><td>1.27300</td><td>-2.10</td><td>0.00</td><td>0.00</td><td>60.00</td></tr>
<tr><td>103</td><td>2026.09.17 08:00:00</td><td>balance</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>1000.00</td></tr>
<tr><td colspan="14">Closed P/L: 360.00</td></tr>
</table></body></html>`;

describe('parseMtHtml', () => {
  it('sarlavha va qatorlarni ajratadi', () => {
    const grid = parseMtHtml(MT4_REPORT);
    expect(grid).not.toBeNull();
    expect(grid!.headers[0]).toBe('Ticket');
    expect(grid!.headers).toHaveLength(14);
  });

  it('yakuniy hisob qatorini olmaydi', () => {
    const grid = parseMtHtml(MT4_REPORT)!;
    const joined = grid.rows.map((r) => r.join(' '));
    expect(joined.some((r) => r.includes('Closed P/L'))).toBe(false);
  });

  it('&nbsp; va teglarni tozalaydi', () => {
    const grid = parseMtHtml(
      '<table><tr><td>Symbol</td><td>Type</td><td>Volume</td></tr>' +
        '<tr><td><b>EURUSD</b></td><td>buy&nbsp;</td><td>1.00</td></tr></table>',
    )!;
    expect(grid.rows[0]).toEqual(['EURUSD', 'buy', '1.00']);
  });

  it('jadval bo‘lmasa null', () => {
    expect(parseMtHtml('<html><body><p>salom</p></body></html>')).toBeNull();
  });

  it('colspan ustunlarni surib yubormaydi', () => {
    const grid = parseMtHtml(MT4_REPORT)!;
    // Birinchi savdoda 14 ta katak bo'lishi kerak, chapga surilmagan.
    expect(grid.rows[0][0]).toBe('101');
    expect(grid.rows[0][4]).toBe('eurusd');
  });
});

describe('dedupeHeaders', () => {
  it('takrorlangan Time va Price ni farqlaydi', () => {
    expect(dedupeHeaders(['Time', 'Symbol', 'Price', 'Time', 'Price'])).toEqual([
      'Time',
      'Symbol',
      'Price',
      'Close Time',
      'Close Price',
    ]);
  });

  it('uchinchi takrorga raqam qo‘shadi', () => {
    expect(dedupeHeaders(['P', 'P', 'P'])[2]).toBe('P 3');
  });
});

describe('looksLikeHtml', () => {
  it('HTML ni taniydi', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html>')).toBe(true);
    expect(looksLikeHtml('<table><tr>')).toBe(true);
  });

  it('CSV ni HTML demaydi', () => {
    expect(looksLikeHtml('Symbol,Type\nEURUSD,buy')).toBe(false);
  });
});

/* ------------------------------------------------------------- aylantirish */

const MAPPING = {
  symbol: 0,
  direction: 1,
  openedAt: 2,
  closedAt: 3,
  entryPrice: 4,
  stopPrice: 5,
  exitPrice: 6,
  volume: 7,
};

function row(over: Partial<Record<number, string>> = {}): string[] {
  const base = [
    'eurusd',
    'buy',
    '2026.09.15 09:12:00',
    '2026.09.15 12:40:00',
    '1.08200',
    '1.07900',
    '1.08800',
    '0.50',
  ];
  for (const [i, value] of Object.entries(over)) base[Number(i)] = value ?? '';
  return base;
}

describe('mapRow', () => {
  it('to‘g‘ri qatorni savdoga aylantiradi', () => {
    const r = mapRow(row(), MAPPING, 1);
    expect(r.errors).toEqual([]);
    expect(r.trade).not.toBeNull();
    expect(r.trade!.symbol).toBe('EURUSD');
    expect(r.trade!.direction).toBe('LONG');
    expect(r.trade!.volume).toBe(0.5);
    expect(r.trade!.closedAt).not.toBeNull();
  });

  it('majburiy maydon yo‘q bo‘lsa rad etadi', () => {
    expect(mapRow(row({ 0: '' }), MAPPING, 1).errors).toContain('missingSymbol');
    expect(mapRow(row({ 1: 'deposit' }), MAPPING, 1).errors).toContain('badDirection');
    expect(mapRow(row({ 2: '' }), MAPPING, 1).errors).toContain('badOpenedAt');
    expect(mapRow(row({ 4: '0' }), MAPPING, 1).errors).toContain('badEntry');
    expect(mapRow(row({ 7: '0' }), MAPPING, 1).errors).toContain('badVolume');
  });

  it('stopsiz savdoni odatda o‘tkazib yuboradi', () => {
    const r = mapRow(row({ 5: '0.00' }), MAPPING, 1);
    expect(r.trade).toBeNull();
    expect(r.errors).toEqual(['noStop']);
  });

  it('so‘ralganda stopsiz savdoni ham oladi', () => {
    const r = mapRow(row({ 5: '0.00' }), MAPPING, 1, { keepStopless: true });
    expect(r.trade).not.toBeNull();
    expect(r.warnings).toContain('noStop');
    // Risk nolga teng bo'ladi — hisob buzilmaydi.
    expect(r.trade!.stopPrice).toBe(r.trade!.entryPrice);
  });

  it('stop noto‘g‘ri tomonda bo‘lsa rad etmaydi, ogohlantiradi', () => {
    const r = mapRow(row({ 5: '1.09000' }), MAPPING, 1);
    expect(r.trade).not.toBeNull();
    expect(r.warnings).toContain('stopSide');
  });

  it('yopilish ochilishdan oldin bo‘lsa rad etadi', () => {
    const r = mapRow(row({ 3: '2026.09.14 10:00:00' }), MAPPING, 1);
    expect(r.trade).toBeNull();
    expect(r.errors).toContain('closedBeforeOpen');
  });

  it('yarim yopilgan savdoni ochiq deb oladi', () => {
    const r = mapRow(row({ 6: '' }), MAPPING, 1);
    expect(r.trade).not.toBeNull();
    expect(r.trade!.closedAt).toBeNull();
    expect(r.trade!.exitPrice).toBeNull();
    expect(r.warnings).toContain('halfClosed');
  });

  it('komissiya va svopni xarajat sifatida oladi', () => {
    const mapping = { ...MAPPING, commission: 8, swap: 9, profit: 10 };
    const r = mapRow([...row(), '-3.50', '-1.20', '300.00'], mapping, 1);
    expect(r.trade!.commission).toBe(3.5);
    expect(r.trade!.swap).toBe(1.2);
    // Broker foydasi komissiya va svopsiz beriladi.
    expect(r.trade!.pnlOverride).toBeCloseTo(300 - 3.5 - 1.2, 5);
  });

  it('ochiq savdoga broker foydasini yozmaydi', () => {
    const mapping = { ...MAPPING, profit: 8 };
    const r = mapRow([...row({ 3: '', 6: '' }), '300.00'], mapping, 1);
    expect(r.trade!.pnlOverride).toBeNull();
  });
});

describe('mapRows', () => {
  it('bir xil savdoni ikki marta olmaydi', () => {
    const result = mapRows([row(), row()], MAPPING);
    expect(result.ready).toBe(1);
    expect(result.rows[1].errors).toContain('duplicate');
  });

  it('soniyalar farqi takror deb hisoblanadi', () => {
    const result = mapRows([row(), row({ 2: '2026.09.15 09:12:45' })], MAPPING);
    expect(result.ready).toBe(1);
  });

  it('bazada bor savdoni belgilaydi', () => {
    const first = mapRow(row(), MAPPING, 1);
    const result = mapRows([row()], MAPPING, { existingKeys: new Set([first.key]) });
    expect(result.ready).toBe(0);
    expect(result.rows[0].errors).toContain('existing');
  });

  it('sanoq to‘g‘ri', () => {
    const result = mapRows([row(), row({ 0: '' }), row({ 0: 'gbpusd' })], MAPPING);
    expect(result.ready).toBe(2);
    expect(result.skipped).toBe(1);
  });
});

describe('tradeKey', () => {
  it('bir xil savdoga bir xil kalit', () => {
    const t = {
      symbol: 'EURUSD',
      direction: 'LONG',
      openedAt: new Date(2026, 8, 15, 9, 12, 0),
      volume: 0.5,
      entryPrice: 1.082,
    };
    expect(tradeKey(t)).toBe(tradeKey({ ...t, openedAt: new Date(2026, 8, 15, 9, 12, 59) }));
  });

  it('hajmi boshqa savdoga boshqa kalit', () => {
    const t = {
      symbol: 'EURUSD',
      direction: 'LONG',
      openedAt: new Date(2026, 8, 15, 9, 12, 0),
      volume: 0.5,
      entryPrice: 1.082,
    };
    expect(tradeKey(t)).not.toBe(tradeKey({ ...t, volume: 1 }));
  });
});

/* ---------------------------------------------------------------- umumiy */

describe('parseFile', () => {
  it('CSV ni o‘qiydi va ustunlarni taxmin qiladi', () => {
    const parsed = parseFile(
      'Symbol,Type,Open Time,Open Price,Stop Loss,Volume\nEURUSD,buy,2026.09.15 09:12,1.082,1.079,0.5',
    );
    expect(parsed.kind).toBe('csv');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.mapping.symbol).toBe(0);
    expect(parsed.mapping.stopPrice).toBe(4);
  });

  it('MT hisobotini o‘qiydi', () => {
    const parsed = parseFile(MT4_REPORT);
    expect(parsed.kind).toBe('mt');
    expect(parsed.mapping.symbol).toBe(4); // "Item"
    expect(parsed.mapping.direction).toBe(2);
    expect(parsed.mapping.entryPrice).toBe(5);
    expect(parsed.mapping.exitPrice).toBe(9); // "Close Price"
  });

  it('MT hisobotidagi savdolar to‘liq o‘tadi', () => {
    const parsed = parseFile(MT4_REPORT);
    const result = mapRows(parsed.rows, parsed.mapping);
    // Ikkita savdo; "balance" qatori savdo emas.
    expect(result.ready).toBe(2);
    const first = result.rows[0].trade!;
    expect(first.symbol).toBe('EURUSD');
    expect(first.commission).toBe(3.5);
    expect(first.swap).toBe(1.2);
    expect(first.pnlOverride).toBeCloseTo(300 - 3.5 - 1.2, 5);
  });

  it('bo‘sh faylni rad etadi', () => {
    expect(() => parseFile('   ')).toThrow(ImportError);
  });

  it('faqat sarlavhali faylni rad etadi', () => {
    expect(() => parseFile('Symbol,Type,Volume')).toThrow(ImportError);
  });

  it('juda katta faylni rad etadi', () => {
    const lines = ['Symbol,Type,Volume'];
    for (let i = 0; i < 2100; i += 1) lines.push('EURUSD,buy,0.5');
    try {
      parseFile(lines.join('\n'));
      expect.unreachable('xato kutilgandi');
    } catch (error) {
      expect((error as ImportError).code).toBe('tooBig');
    }
  });
});

/* ------------------------------------------------------------- kodlash */

const RU_REPORT_BODY =
  '<table><tr><th>Символ</th><th>Тип</th><th>Время открытия</th><th>Цена открытия</th>' +
  '<th>Стоп лосс</th><th>Объем</th></tr>' +
  '<tr><td>EURUSD</td><td>покупка</td><td>2026.09.15 09:12:00</td><td>1.08200</td>' +
  '<td>1.07900</td><td>0.50</td></tr></table>';

function bytes(text: string, encoding: BufferEncoding | 'win1251'): ArrayBuffer {
  if (encoding === 'win1251') {
    // Kirill harflari 0xC0..0xFF oralig'ida joylashgan.
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code >= 0x410 && code <= 0x44f) out[i] = code - 0x410 + 0xc0;
      else if (code === 0x401) out[i] = 0xa8;
      else if (code === 0x451) out[i] = 0xb8;
      else out[i] = code;
    }
    return out.buffer;
  }
  const buffer = Buffer.from(text, encoding);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe('decodeBuffer', () => {
  it('UTF-8 ni o‘qiydi', () => {
    expect(decodeBuffer(bytes('Символ,Тип', 'utf8'))).toBe('Символ,Тип');
  });

  it('BOM li UTF-8 ni o‘qiydi', () => {
    expect(decodeBuffer(bytes('﻿Символ', 'utf8'))).toContain('Символ');
  });

  it('UTF-16LE ni o‘qiydi', () => {
    expect(decodeBuffer(bytes('﻿Символ,Тип', 'utf16le'))).toContain('Символ');
  });

  it('windows-1251 ni o‘qiydi', () => {
    const text = decodeBuffer(bytes(RU_REPORT_BODY, 'win1251'));
    expect(text).toContain('Символ');
    expect(text).toContain('покупка');
  });

  it('e’lon qilingan kodlashni tinglaydi', () => {
    const html = '<meta charset="windows-1251">' + RU_REPORT_BODY;
    expect(decodeBuffer(bytes(html, 'win1251'))).toContain('Время открытия');
  });

  it('windows-1251 hisoboti to‘liq o‘qiladi', () => {
    // Asl maqsad shu: buzilgan sarlavha ustunlarni tanitmay qo'yadi.
    const parsed = parseFile(decodeBuffer(bytes(RU_REPORT_BODY, 'win1251')));
    expect(parsed.mapping.symbol).toBe(0);
    expect(parsed.mapping.direction).toBe(1);
    expect(parsed.mapping.openedAt).toBe(2);
    expect(parsed.mapping.entryPrice).toBe(3);
    expect(parsed.mapping.stopPrice).toBe(4);
    expect(parsed.mapping.volume).toBe(5);

    const result = mapRows(parsed.rows, parsed.mapping);
    expect(result.ready).toBe(1);
    expect(result.rows[0].trade!.direction).toBe('LONG');
  });
});

/* ------------------------------------------------------- MT5 to'liq hisobot */

const MT5_REPORT = readFileSync(
  new URL('./fixtures/mt5-report.html', import.meta.url),
  'utf-8',
);

describe('MT5 hisoboti (to‘liq ko‘rinish)', () => {
  const parsed = parseFile(MT5_REPORT);

  it('Positions bo‘limini oladi, Orders va Deals ga o‘tmaydi', () => {
    // Uchta pozitsiya bor; Orders va Deals bo'limlari import qilinmaydi,
    // aks holda bir savdo ikki marta tushardi.
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows.map((r) => r[2])).toEqual(['EURUSD', 'GBPUSD', 'XAUUSD']);
  });

  it('takrorlangan Time va Price ustunlarini farqlaydi', () => {
    expect(parsed.mapping.openedAt).toBe(0);
    expect(parsed.mapping.closedAt).toBe(8);
    expect(parsed.mapping.entryPrice).toBe(5);
    expect(parsed.mapping.exitPrice).toBe(9);
  });

  it('barcha ustunlarni topadi', () => {
    expect(parsed.mapping).toMatchObject({
      symbol: 2,
      direction: 3,
      volume: 4,
      stopPrice: 6,
      takeProfit: 7,
      commission: 10,
      swap: 11,
      profit: 12,
      notes: 13,
    });
  });

  it('yakuniy hisob qatorini savdo deb olmaydi', () => {
    // «Jami» qatorida faqat uchta katak to'la — u savdo emas.
    expect(parsed.rows.some((r) => r[2] === '')).toBe(false);
  });

  it('sof natijani komissiya va svopdan tozalab yozadi', () => {
    const result = mapRows(parsed.rows, parsed.mapping);
    expect(result.ready).toBe(2);
    expect(result.rows[0].trade!.pnlOverride).toBeCloseTo(300 - 3.5 - 1.2, 5);
    expect(result.rows[1].trade!.pnlOverride).toBeCloseTo(60 - 2.1, 5);
  });

  it('stopsiz pozitsiyani o‘tkazib yuboradi', () => {
    const result = mapRows(parsed.rows, parsed.mapping);
    expect(result.rows[2].trade).toBeNull();
    expect(result.rows[2].errors).toContain('noStop');
  });

  it('so‘ralganda stopsiz pozitsiya ham olinadi', () => {
    const result = mapRows(parsed.rows, parsed.mapping, { keepStopless: true });
    expect(result.ready).toBe(3);
    expect(result.rows[2].trade!.symbol).toBe('XAUUSD');
  });

  it('izohni oladi', () => {
    const result = mapRows(parsed.rows, parsed.mapping);
    expect(result.rows[1].trade!.notes).toBe('tp hit');
  });
});
