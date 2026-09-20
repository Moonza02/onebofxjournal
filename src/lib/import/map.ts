/** Qatorni savdoga aylantirish.
 *
 *  Bu yerda bazaga yozilmaydi — faqat tekshiriladi va tayyorlanadi.
 *  Shuning uchun natijani sahifada oldindan ko'rsatish ham, sinash ham
 *  oson: kirish matn, chiqish — tayyor savdo yoki sabab bilan rad.
 */

import { specFor } from '@/lib/instruments';
import { sessionFor } from '@/lib/tz';
import { REQUIRED, toDate, toDirection, toNumber, type Field, type Mapping } from './fields';

/** Ogohlantirish va rad etish sabablari. Tarjima kaliti sifatida ishlatiladi. */
export type IssueCode =
  | 'missingSymbol'
  | 'badDirection'
  | 'badOpenedAt'
  | 'badEntry'
  | 'badVolume'
  | 'noStop'
  | 'stopSide'
  | 'stopEqualsEntry'
  | 'closedBeforeOpen'
  | 'halfClosed'
  | 'duplicate'
  | 'existing';

export type MappedTrade = {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: Date;
  closedAt: Date | null;
  entryPrice: number;
  stopPrice: number;
  takeProfit: number | null;
  exitPrice: number | null;
  volume: number;
  pipSize: number;
  pipValuePerLot: number;
  commission: number;
  swap: number;
  pnlOverride: number | null;
  session: string;
  notes: string;
};

export type RowResult = {
  /** Fayldagi qator raqami (sarlavhasiz, 1 dan boshlab). */
  line: number;
  raw: string[];
  trade: MappedTrade | null;
  /** To'ldirilmagan sabablar — savdo olinmaydi. */
  errors: IssueCode[];
  /** Savdo olinadi, lekin e'tibor berilsin. */
  warnings: IssueCode[];
  /** Takrorlanishni aniqlash uchun. */
  key: string;
};

export type MapOptions = {
  /** Stopi yo'q savdolarni ham olish. Odatda — yo'q. */
  keepStopless?: boolean;
  /** Bazada allaqachon bor savdolarning kalitlari. */
  existingKeys?: Set<string>;
};

export type MapResult = {
  rows: RowResult[];
  ready: number;
  skipped: number;
};

/** Takrorlanmaslik kaliti.
 *
 *  Vaqt daqiqagacha yaxlitlanadi: bir xil hisobot ikki marta
 *  yuklanganda soniyalar farq qilmasligi kerak, lekin ikki xil
 *  savdo bir daqiqada tushishi kamdan-kam.
 */
export function tradeKey(t: {
  symbol: string;
  direction: string;
  openedAt: Date;
  volume: number;
  entryPrice: number;
}): string {
  const minute = Math.floor(t.openedAt.getTime() / 60_000);
  return [
    t.symbol.toUpperCase(),
    t.direction,
    minute,
    t.volume.toFixed(2),
    t.entryPrice.toFixed(5),
  ].join('|');
}

function cell(row: string[], mapping: Mapping, field: Field): string | undefined {
  const index = mapping[field];
  if (index === undefined) return undefined;
  return row[index];
}

/** Bitta qatorni savdoga aylantiradi. */
export function mapRow(
  row: string[],
  mapping: Mapping,
  line: number,
  options: MapOptions = {},
): RowResult {
  const errors: IssueCode[] = [];
  const warnings: IssueCode[] = [];

  const symbol = (cell(row, mapping, 'symbol') ?? '').trim().toUpperCase();
  const direction = toDirection(cell(row, mapping, 'direction'));
  const openedAt = toDate(cell(row, mapping, 'openedAt'));
  const entryPrice = toNumber(cell(row, mapping, 'entryPrice'));
  const volume = toNumber(cell(row, mapping, 'volume'));

  if (!symbol) errors.push('missingSymbol');
  if (!direction) errors.push('badDirection');
  if (!openedAt) errors.push('badOpenedAt');
  if (entryPrice === null || entryPrice <= 0) errors.push('badEntry');
  if (volume === null || volume <= 0) errors.push('badVolume');

  if (errors.length > 0 || !direction || !openedAt || entryPrice === null || volume === null) {
    return { line, raw: row, trade: null, errors, warnings, key: '' };
  }

  let closedAt = toDate(cell(row, mapping, 'closedAt'));
  let exitPrice = toNumber(cell(row, mapping, 'exitPrice'));
  const stopRaw = toNumber(cell(row, mapping, 'stopPrice'));
  const takeRaw = toNumber(cell(row, mapping, 'takeProfit'));

  // MT hisobotida stop yoki take qo'yilmagan bo'lsa 0 yoziladi.
  const stopPrice = stopRaw && stopRaw > 0 ? stopRaw : null;
  const takeProfit = takeRaw && takeRaw > 0 ? takeRaw : null;

  if (closedAt && closedAt.getTime() < openedAt.getTime()) {
    errors.push('closedBeforeOpen');
    return { line, raw: row, trade: null, errors, warnings, key: '' };
  }

  // Yarim ma'lumot: yopilish vaqti bor, narxi yo'q (yoki aksincha).
  // Savdo ochiq deb olinadi — noto'g'ri natija yozgandan ko'ra yaxshiroq.
  if ((closedAt && exitPrice === null) || (!closedAt && exitPrice !== null)) {
    warnings.push('halfClosed');
    closedAt = null;
    exitPrice = null;
  }

  if (stopPrice === null) {
    if (!options.keepStopless) {
      return { line, raw: row, trade: null, errors: ['noStop'], warnings, key: '' };
    }
    warnings.push('noStop');
  } else if (stopPrice === entryPrice) {
    if (!options.keepStopless) {
      return { line, raw: row, trade: null, errors: ['stopEqualsEntry'], warnings, key: '' };
    }
    warnings.push('stopEqualsEntry');
  } else {
    const wrongSide =
      (direction === 'LONG' && stopPrice > entryPrice) ||
      (direction === 'SHORT' && stopPrice < entryPrice);
    // Rad etmaymiz: broker stopni ko'chirgan bo'lishi mumkin. Faqat aytamiz.
    if (wrongSide) warnings.push('stopSide');
  }

  const spec = specFor(symbol);
  // Broker komissiyani manfiy yozadi ("-7.00"), bizda esa u xarajat —
  // musbat son. Svop ham shunday: "-2.40" ushlab qolingani degani.
  const commission = Math.abs(toNumber(cell(row, mapping, 'commission')) ?? 0);
  const swap = -(toNumber(cell(row, mapping, 'swap')) ?? 0);
  const profit = toNumber(cell(row, mapping, 'profit'));

  // MT hisobotida "Profit" — komissiya va svopsiz. Sof natija uchun
  // ularni ayiramiz; alohida ustunlar bo'lmasa nol bo'lib, hech narsa
  // o'zgarmaydi.
  const netProfit = profit === null ? null : profit - commission - swap;

  const trade: MappedTrade = {
    symbol,
    direction,
    openedAt,
    closedAt,
    entryPrice,
    // Stopsiz savdo kiritilsa kirish narxi qo'yiladi: R nolga teng
    // bo'ladi va hisob buzilmaydi.
    stopPrice: stopPrice ?? entryPrice,
    takeProfit,
    exitPrice,
    volume,
    pipSize: spec.pipSize,
    pipValuePerLot: spec.pipValuePerLot,
    commission,
    swap,
    // Broker foydasi bor bo'lsa — o'sha ishonchli: svop, komissiya va
    // ayirboshlash kursi allaqachon hisobga olingan.
    pnlOverride: closedAt !== null ? netProfit : null,
    session: sessionFor(openedAt),
    notes: (cell(row, mapping, 'notes') ?? '').trim().slice(0, 2000),
  };

  return { line, raw: row, trade, errors, warnings, key: tradeKey(trade) };
}

/** Butun faylni aylantiradi va takrorlarni belgilaydi. */
export function mapRows(rows: string[][], mapping: Mapping, options: MapOptions = {}): MapResult {
  const results: RowResult[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const result = mapRow(row, mapping, i + 1, options);

    if (result.trade) {
      if (seen.has(result.key)) {
        result.errors.push('duplicate');
        result.trade = null;
      } else if (options.existingKeys?.has(result.key)) {
        result.errors.push('existing');
        result.trade = null;
      } else {
        seen.add(result.key);
      }
    }

    results.push(result);
  });

  const ready = results.filter((r) => r.trade !== null).length;
  return { rows: results, ready, skipped: results.length - ready };
}

/** Moslash to'liqmi — majburiy ustunlar tanlanganmi. */
export function missingFields(mapping: Mapping): Field[] {
  return REQUIRED.filter((field) => mapping[field] === undefined);
}
