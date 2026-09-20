import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_INSTRUMENTS, plausiblePrice, specFor } from './instruments';
import { fill, type Dict } from './i18n';

/** Skrinshotdan savdo ma'lumotini o'qish.
 *
 *  Muhim qoida: AI hech narsani saqlamaydi. U faqat formani to'ldiradi,
 *  har bir maydon ishonch darajasi bilan qaytadi, va saqlash tugmasi
 *  har doim foydalanuvchida qoladi.
 *
 *  Ikkinchi qoida: AI faqat raqamlarni o'qiydi. R-multiple, P&L va risk
 *  foizi backend formulasi bilan hisoblanadi (lib/stats.ts), shuning uchun
 *  AI adashsa ham statistika buzilmaydi.
 */

export type Confidence = 'high' | 'low';

export type ExtractedField<T> = { value: T | null; confidence: Confidence | null };

export type ExtractedTrade = {
  symbol: ExtractedField<string>;
  direction: ExtractedField<'LONG' | 'SHORT'>;
  entryPrice: ExtractedField<number>;
  stopPrice: ExtractedField<number>;
  takeProfit: ExtractedField<number>;
  exitPrice: ExtractedField<number>;
  volume: ExtractedField<number>;
  timeframe: ExtractedField<string>;
  openedAt: ExtractedField<string>;
  closedAt: ExtractedField<string>;
};

export type ExtractionResult = {
  fields: ExtractedTrade;
  warnings: string[];
  note: string;
};

export function isExtractionEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/** `note` foydalanuvchiga ko'rinadi — u interfeys tilida yozilsin. */
const LANGUAGE_NAMES: Record<string, string> = { uz: 'o‘zbek', ru: 'rus', en: 'ingliz' };

/** Qiymat har doim matn sifatida so'raladi — union tiplar o'rniga bitta
 *  aniq tip, shunda sxema har qanday model bilan ishlaydi. Bo'sh satr = topilmadi.
 */
const FIELD_SCHEMA = {
  type: 'object' as const,
  properties: {
    value: {
      type: 'string' as const,
      description: 'O‘qilgan qiymat matn ko‘rinishida. Topilmasa yoki shubhali bo‘lsa — bo‘sh satr.',
    },
    confidence: {
      type: 'string' as const,
      enum: ['high', 'low', 'none'],
      description: 'high — aniq o‘qildi; low — shubham bor; none — umuman topilmadi.',
    },
  },
  required: ['value', 'confidence'],
};

const TOOL = {
  name: 'savdo_malumoti',
  description:
    'Skrinshotdan o‘qilgan savdo ma’lumotini qaytaradi. Har bir maydon uchun qiymat va ishonch darajasi beriladi.',
  input_schema: {
    type: 'object' as const,
    properties: {
      symbol: FIELD_SCHEMA,
      direction: FIELD_SCHEMA,
      entryPrice: FIELD_SCHEMA,
      stopPrice: FIELD_SCHEMA,
      takeProfit: FIELD_SCHEMA,
      exitPrice: FIELD_SCHEMA,
      volume: FIELD_SCHEMA,
      timeframe: FIELD_SCHEMA,
      openedAt: FIELD_SCHEMA,
      closedAt: FIELD_SCHEMA,
      note: { type: 'string' },
    },
    required: [
      'symbol',
      'direction',
      'entryPrice',
      'stopPrice',
      'takeProfit',
      'exitPrice',
      'volume',
      'timeframe',
      'openedAt',
      'closedAt',
      'note',
    ],
  },
};

const PROMPT = `Sen treyding jurnaliga skrinshotdan ma'lumot ko'chiryapsan. Rasm — MetaTrader, TradingView yoki boshqa savdo platformasining ekrani.

Vazifang: rasmda AYNAN ko'rinib turgan raqamlarni o'qish.

Qat'iy qoidalar:
1. Faqat rasmda yozilgan narsani qaytar. Hech narsani taxmin qilma va o'zingdan hisoblama.
2. Maydon rasmda yo'q bo'lsa — value: bo'sh satr, confidence: "none". Bo'sh qoldirish noto'g'ri qiymatdan yaxshiroq.
3. confidence: "high" — raqam aniq va bir ma'noli ko'rinib turibdi. "low" — o'qidim, lekin shubham bor (mayda shrift, qisman berkilgan, ikki xil o'qilishi mumkin). "none" — topilmadi. Shubha bo'lsa "low" qo'y: past ishonchli qiymat formaga o'zi tushmaydi, foydalanuvchi o'zi kiritadi.
4. Stop loss va take profit o'rnini ALMASHTIRMA. Stop — zarardan himoya darajasi, take profit — maqsad. Long savdoda stop kirishdan past, take profit yuqori; short savdoda teskari. Agar rasmda qaysi biri qaysiligi aniq bo'lmasa, ikkalasini ham "low" qilib belgila.
5. Sanani ISO formatida ber: "2026-09-18T09:42". Vaqt ko'rinmasa faqat sana ber, u ham bo'lmasa bo'sh satr.
6. direction faqat "LONG" yoki "SHORT" bo'ladi. Buy/Sell ham shunga o'giriladi.
7. volume — lot hajmi (masalan 0.50), pul summasi emas.
8. symbol — instrument nomi, masalan XAUUSD. Platformadagi qo'shimchalarni (".m", "#", "_i") olib tashla.
9. P&L, foyda, R yoki foizni O'QIMA — ular kerak emas, tizim o'zi hisoblaydi.

note maydoniga bir jumlada yoz: rasmda nimani ko'rding va nimani o'qiy olmading.`;

function normalizeNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return null;
  // "3 642.10", "3,642.10", "1.17420" — bo'shliq va mingliklar vergulini tozalaymiz.
  const cleaned = raw.replace(/\s/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function asField<T>(raw: unknown, cast: (v: unknown) => T | null): ExtractedField<T> {
  if (!raw || typeof raw !== 'object') return { value: null, confidence: null };
  const record = raw as { value?: unknown; confidence?: unknown };

  const empty =
    record.value === null ||
    record.value === undefined ||
    (typeof record.value === 'string' && record.value.trim() === '');

  const value = empty ? null : cast(record.value);
  const confidence =
    record.confidence === 'high' || record.confidence === 'low' ? record.confidence : null;

  return { value, confidence };
}

const SYMBOLS = new Set(DEFAULT_INSTRUMENTS.map((i) => i.symbol));

function castSymbol(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return SYMBOLS.has(cleaned) ? cleaned : cleaned || null;
}

function castDirection(v: unknown): 'LONG' | 'SHORT' | null {
  if (typeof v !== 'string') return null;
  const s = v.toUpperCase();
  if (s.includes('LONG') || s.includes('BUY')) return 'LONG';
  if (s.includes('SHORT') || s.includes('SELL')) return 'SHORT';
  return null;
}

function castText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Ikkinchi himoya qatlami: AI dan mustaqil mantiqiy tekshiruv.
 *  Bu yerda topilgan muammo maydonni bo'shatadi — noto'g'ri raqam
 *  formaga tushmaydi, foydalanuvchi o'zi kiritadi.
 */
export function validateExtraction(fields: ExtractedTrade, d: Dict): string[] {
  const warnings: string[] = [];
  const symbol = fields.symbol.value;
  const entry = fields.entryPrice.value;
  const stop = fields.stopPrice.value;
  const take = fields.takeProfit.value;
  const exit = fields.exitPrice.value;
  const direction = fields.direction.value;

  if (symbol && !SYMBOLS.has(symbol)) {
    warnings.push(fill(d.extract.unknownSymbol, { symbol }));
  }

  for (const [label, price] of [
    [d.extract.priceEntry, entry],
    [d.extract.priceStop, stop],
    [d.extract.priceTake, take],
    [d.extract.priceExit, exit],
  ] as const) {
    if (symbol && price !== null && !plausiblePrice(symbol, price)) {
      warnings.push(fill(d.extract.oddPrice, { label, price, symbol }));
    }
  }

  if (direction && entry !== null && stop !== null) {
    const wrongLong = direction === 'LONG' && stop > entry;
    const wrongShort = direction === 'SHORT' && stop < entry;
    if (wrongLong || wrongShort) {
      warnings.push(d.extract.stopSide);
      fields.stopPrice = { value: null, confidence: null };
      fields.takeProfit = { value: null, confidence: null };
    }
  }

  if (entry !== null && stop !== null && entry === stop) {
    warnings.push(d.extract.stopEqualsEntry);
    fields.stopPrice = { value: null, confidence: null };
  }

  if (fields.volume.value !== null && fields.volume.value <= 0) {
    warnings.push(d.extract.volumePositive);
    fields.volume = { value: null, confidence: null };
  }

  if (symbol && entry !== null && stop !== null) {
    const spec = specFor(symbol);
    const pips = Math.abs(entry - stop) / spec.pipSize;
    if (pips > 5000) {
      warnings.push(fill(d.extract.stopFar, { pips: Math.round(pips) }));
    }
  }

  // Past ishonchli maydonlar formaga o'zi tushmaydi.
  for (const key of Object.keys(fields) as (keyof ExtractedTrade)[]) {
    if (fields[key].confidence === 'low') {
      fields[key] = { value: null, confidence: 'low' };
    }
  }

  return warnings;
}

export async function extractTrade(
  image: Buffer,
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp',
  d: Dict,
  locale = 'uz',
): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: image.toString('base64') },
          },
          {
            type: 'text',
            text: `${PROMPT}\n\nnote MAYDONI TILI: ${LANGUAGE_NAMES[locale] ?? 'o‘zbek'}.`,
          },
        ],
      },
    ],
  });

  const block = response.content.find((c) => c.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error(d.extract.nothingRead);
  }

  const raw = block.input as Record<string, unknown>;

  const fields: ExtractedTrade = {
    symbol: asField(raw.symbol, castSymbol),
    direction: asField(raw.direction, castDirection),
    entryPrice: asField(raw.entryPrice, normalizeNumber),
    stopPrice: asField(raw.stopPrice, normalizeNumber),
    takeProfit: asField(raw.takeProfit, normalizeNumber),
    exitPrice: asField(raw.exitPrice, normalizeNumber),
    volume: asField(raw.volume, normalizeNumber),
    timeframe: asField(raw.timeframe, castText),
    openedAt: asField(raw.openedAt, castText),
    closedAt: asField(raw.closedAt, castText),
  };

  const warnings = validateExtraction(fields, d);

  return {
    fields,
    warnings,
    note: typeof raw.note === 'string' ? raw.note : '',
  };
}
