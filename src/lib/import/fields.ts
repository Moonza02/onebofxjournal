/** Import qilinadigan maydonlar va ustunlarni tanish.
 *
 *  Bu fayl bazaga ham, ilovaga ham bog'liq emas — faqat matndan
 *  qiymat ajratib olish. Shuning uchun to'liq sinaladi.
 */

export const FIELDS = [
  'symbol',
  'direction',
  'openedAt',
  'closedAt',
  'entryPrice',
  'stopPrice',
  'takeProfit',
  'exitPrice',
  'volume',
  'commission',
  'swap',
  'profit',
  'notes',
] as const;

export type Field = (typeof FIELDS)[number];

/** Qaysi maydon bo'lmasa savdo umuman tushunarsiz bo'ladi. */
export const REQUIRED: Field[] = ['symbol', 'direction', 'openedAt', 'entryPrice', 'volume'];

/** Ustun sarlavhasi → maydon. Kalitlar kichik harfda va bo'shliqsiz.
 *
 *  Ro'yxat uzun: MetaTrader, cTrader va Excel'da qo'lda yig'ilgan
 *  fayllar bir xil narsani turlicha ataydi, uch tilda ham.
 *
 *  Ruscha nomlar ikki ko'rinishda: kirillcha (MT ruscha terminaldan
 *  shunday beradi) va lotincha yozilgani.
 */
const ALIASES: Record<Field, string[]> = {
  symbol: [
    'symbol',
    'instrument',
    'pair',
    'ticker',
    'asset',
    'item', // MT4 hisobotida shunday ataladi
    'instrumen',
    'simvol',
    'valyuta',
    'символ',
    'инструмент',
    'валюта',
    'валютнаяпара',
  ],
  direction: [
    'direction',
    'type',
    'side',
    'action',
    'buysell',
    'yonalish',
    'napravlenie',
    'tip',
    'тип',
    'направление',
    'операция',
  ],
  openedAt: [
    'opentime',
    'opened',
    'openeda',
    'opendate',
    'entrytime',
    'entrydate',
    'time',
    'date',
    'datetime',
    'ochilish',
    'ochilishvaqti',
    'vremyaotkrytiya',
    'otkrytie',
    'времяоткрытия',
    'датаоткрытия',
    'открытие',
    'время',
    'дата',
  ],
  closedAt: [
    'closetime',
    'closed',
    'closeda',
    'closedate',
    'exittime',
    'exitdate',
    'yopilish',
    'yopilishvaqti',
    'vremyazakrytiya',
    'zakrytie',
    'времязакрытия',
    'датазакрытия',
    'закрытие',
  ],
  entryPrice: [
    'entryprice',
    'openprice',
    'entry',
    'priceopen',
    'open',
    'kirish',
    'kirishnarxi',
    'cenaotkrytiya',
    // Eng oxirida: MT4 ochilish ustunini shunchaki "Price" deb ataydi.
    // Yopilish narxi "Close Price" ga aylantirilgani uchun chalkashmaydi.
    'price',
    'ценаоткрытия',
    'ценавхода',
    'цена',
  ],
  stopPrice: [
    'stoploss',
    'stop',
    'sl',
    'stopprice',
    'stopnarxi',
    'стоплосс',
    'стоп',
  ],
  takeProfit: [
    'takeprofit',
    'tp',
    'target',
    'takeprofitprice',
    'maqsad',
    'тейкпрофит',
    'тейк',
  ],
  exitPrice: [
    'exitprice',
    'closeprice',
    'exit',
    'priceclose',
    'close',
    'chiqish',
    'chiqishnarxi',
    'cenazakrytiya',
    'ценазакрытия',
    'ценавыхода',
  ],
  volume: [
    'volume',
    'lots',
    'size',
    'lot',
    'quantity',
    'qty',
    'hajm',
    'obem',
    'объем',
    'объём',
    'лот',
    'лоты',
    'размер',
  ],
  commission: [
    'commission',
    'fee',
    'fees',
    'komissiya',
    'комиссия',
    'сбор',
  ],
  swap: [
    'swap',
    'rollover',
    'svop',
    'своп',
  ],
  profit: [
    'profit',
    'pnl',
    'pl',
    'netprofit',
    'result',
    'gross',
    'foyda',
    'natija',
    'pribyl',
    'прибыль',
    'результат',
    'доход',
  ],
  notes: [
    'notes',
    'comment',
    'comments',
    'note',
    'izoh',
    'kommentariy',
    'комментарий',
    'заметка',
    'примечание',
  ],
};

/** Barcha tanish sarlavhalar — jadvalni topish uchun.
 *
 *  Alohida ro'yxat tutilmaydi: yangi til yoki broker nomi qo'shilganda
 *  u avtomatik shu yerga ham tushadi.
 */
export const KNOWN_HEADERS: ReadonlySet<string> = new Set(Object.values(ALIASES).flat());

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_\-./\\]/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9а-яё]/gi, '');
}

export type Mapping = Partial<Record<Field, number>>;

/** Sarlavhalar bo'yicha ustunlarni taxmin qiladi.
 *
 *  Aniq moslik ustunroq: "close" ham `closedAt`, ham `exitPrice` ga
 *  o'xshaydi, shuning uchun avval to'liq mos kelgani olinadi.
 */
export function suggestMapping(headers: string[]): Mapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: Mapping = {};
  const taken = new Set<number>();

  /** Ustunni maydonga biriktiradi. Band ustun qayta olinmaydi. */
  const claim = (field: Field, index: number): boolean => {
    if (taken.has(index) || mapping[field] !== undefined) return false;
    mapping[field] = index;
    taken.add(index);
    return true;
  };

  // Birinchi o'tish — aynan mos kelgan sarlavhalar.
  for (const field of FIELDS) {
    for (const alias of ALIASES[field]) {
      const index = normalized.indexOf(alias);
      // Band ustunda to'xtamaymiz: keyingi nom mos kelishi mumkin.
      if (index >= 0 && claim(field, index)) break;
    }
  }

  // Ikkinchi o'tish — ichida uchraganlar ("opentimeutc" kabi).
  for (const field of FIELDS) {
    if (mapping[field] !== undefined) continue;
    for (const alias of ALIASES[field]) {
      const index = normalized.findIndex((h, i) => !taken.has(i) && h.includes(alias));
      if (index >= 0 && claim(field, index)) break;
    }
  }

  return mapping;
}

/* ------------------------------------------------------------------ qiymat */

/** Raqamni o'qiydi.
 *
 *  Brokerlar turlicha yozadi: `1 234,56`, `1,234.56`, `(120.50)` —
 *  qavs manfiy degani, `−` esa matematik minus.
 */
export function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  // Uzilmas va ingichka bo'shliqlar: Excel va brokerlar mingliklarni
  // shular bilan ajratadi.
  let text = raw
    .trim()
    .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
    .replace(/[\u2212\u2013\u2014]/g, '-');
  if (!text || text === '-') return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  // Valyuta belgisi va bo'shliqlar.
  text = text.replace(/[^\d,.\-+]/g, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    // Ikkalasi bor: oxirgisi kasr ajratgichi.
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // Faqat vergul: uch xonadan keyin kelsa mingliklar ajratgichi.
    const after = text.length - lastComma - 1;
    text = after === 3 ? text.replace(/,/g, '') : text.replace(',', '.');
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -Math.abs(value) : value;
}

/** Yo'nalishni o'qiydi. Broker `buy`, `sell`, `0`, `1` yozishi mumkin.
 *
 *  Bitta harfli ko'rinish faqat aynan mos kelganda qabul qilinadi:
 *  MT4 hisobotida "balance" degan qator ham bor, u `b` bilan
 *  boshlanadi — lekin savdo emas.
 */
export function toDirection(raw: string | undefined): 'LONG' | 'SHORT' | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();

  if (text === 'b' || text === 'l' || text === '0') return 'LONG';
  if (text === 's' || text === '1') return 'SHORT';

  // `\b` bu yerda yaramaydi: kirill harfidan keyin so'z chegarasi
  // topilmaydi va "покупка" umuman o'qilmay qoladi.
  if (/^(buy|long|покупка|kupit|olish)(?![a-zа-яё])/.test(text)) return 'LONG';
  if (/^(sell|short|продажа|prodat|sotish)(?![a-zа-яё])/.test(text)) return 'SHORT';
  return null;
}

/** Sanani o'qiydi.
 *
 *  `2026.09.18 14:30:00` (MetaTrader), `2026-09-18T14:30`, `18/09/2026 14:30`
 *  ko'rinishlari qo'llab-quvvatlanadi. Vaqt mintaqasi berilmasa mahalliy
 *  deb olinadi — broker hisobotidagi vaqt odatda shunday.
 */
export function toDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  // 2026.09.18 14:30:00 yoki 2026-09-18 14:30
  const iso = text.match(
    /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (iso) {
    const [, y, m, day, h = '0', min = '0', sec = '0'] = iso;
    return make(+y, +m, +day, +h, +min, +sec);
  }

  // 18/09/2026 14:30 — kun birinchi (Yevropa ko'rinishi).
  const euro = text.match(
    /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (euro) {
    const [, day, m, y, h = '0', min = '0', sec = '0'] = euro;
    return make(+y, +m, +day, +h, +min, +sec);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function make(y: number, m: number, d: number, h: number, min: number, s: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || s > 59) return null;
  const date = new Date(y, m - 1, d, h, min, s);
  // Oy chegarasidan oshgan kun (31-fevral kabi) boshqa oyga ko'chadi.
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}
