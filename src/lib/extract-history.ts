import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { Dict } from './i18n';
import { aiKey, aiModel } from './ai';

/** Tarix skrinshotidan bir nechta savdoni o'qish.
 *
 *  Bitta savdo uchun `extract.ts` bor — u formani to'ldiradi. Bu yerda
 *  boshqa vazifa: telefondagi MT4/MT5 tarix ro'yxatining rasmida o'nlab
 *  savdo bo'ladi va ularning hammasi birdan kerak.
 *
 *  Nega alohida fayl: natija ham boshqacha. Bu yerda forma emas,
 *  **jadval** qaytadi — import quvuri tushunadigan sarlavhalar va
 *  qatorlar. Shunda fayl importi uchun yozilgan hamma narsa — ustunlarni
 *  moslash, dublikatni tashlash, tarif chegarasi, oldindan ko'rsatish —
 *  qayta ishlatiladi. Skrinshot shunchaki yangi manba bo'ladi, xolos.
 *
 *  Sarlavhalar ataylab `lib/import/fields.ts` dagi maydon nomlari bilan
 *  bir xil yoziladi, shunda ular avtomatik tanilib ketadi.
 */

/** Jadval ustunlari. Tartibi muhim — qatorlar shu tartibda yig'iladi. */
export const HISTORY_HEADERS = [
  'symbol',
  'direction',
  'openedAt',
  'closedAt',
  'entryPrice',
  'exitPrice',
  'volume',
  'commission',
  'swap',
  'profit',
] as const;

/** Bitta rasmdan olinadigan eng ko'p savdo.
 *
 *  Telefon ekraniga bundan ortig'i sig'maydi, model esa chegarasiz
 *  so'ralsa o'zidan qator "to'qib" yuborishi mumkin.
 */
export const MAX_HISTORY_ROWS = 50;

export type HistoryGrid = {
  headers: string[];
  rows: string[][];
  /** Ochilish vaqti ko'rinmagani uchun yopilish vaqti qo'yilgan qatorlar. */
  assumedOpenedAt: number;
  /** Tushunarsizligi uchun tashlab yuborilgan qatorlar. */
  dropped: number;
};

function text(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

/** Modeldan kelgan ro'yxatni jadvalga aylantirish.
 *
 *  Bazaga ham, tarmoqqa ham tegmaydi — shuning uchun to'liq sinaladi.
 *
 *  Ikki qaror shu yerda:
 *
 *  1. Instrument, yo'nalish yoki hajm bo'lmasa qator tashlanadi. Bu
 *     uchtasisiz savdo savdo emas, va yarim qator keyinchalik
 *     statistikani jimgina buzadi.
 *  2. Ochilish vaqti ko'rinmasa yopilish vaqti qo'yiladi. Telefon
 *     tarixida odatda bitta vaqt ko'rinadi; qatorni tashlagandan ko'ra
 *     saqlab, nechtasi shunday bo'lganini aytib qo'ygan ma'qul —
 *     foydalanuvchi saqlashdan oldin jadvalni ko'radi.
 */
export function normalizeHistoryRows(raw: unknown): HistoryGrid {
  const headers = [...HISTORY_HEADERS];
  const list = Array.isArray(raw) ? raw : [];

  const rows: string[][] = [];
  let assumedOpenedAt = 0;
  let dropped = 0;

  for (const item of list.slice(0, MAX_HISTORY_ROWS)) {
    if (!item || typeof item !== 'object') {
      dropped += 1;
      continue;
    }

    const r = item as Record<string, unknown>;
    const symbol = text(r.symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const direction = text(r.direction).toUpperCase();
    const volume = text(r.volume);

    const side = direction.includes('SELL') || direction.includes('SHORT') ? 'SHORT' : 'LONG';
    const hasSide = /BUY|SELL|LONG|SHORT/.test(direction);

    if (!symbol || !hasSide || !volume) {
      dropped += 1;
      continue;
    }

    const closedAt = text(r.closedAt);
    let openedAt = text(r.openedAt);
    if (!openedAt && closedAt) {
      openedAt = closedAt;
      assumedOpenedAt += 1;
    }

    rows.push([
      symbol,
      side,
      openedAt,
      closedAt,
      text(r.entryPrice),
      text(r.exitPrice),
      volume,
      text(r.commission),
      text(r.swap),
      text(r.profit),
    ]);
  }

  return { headers, rows, assumedOpenedAt, dropped };
}

const TRADE_PROPERTIES = {
  symbol: { type: 'string' as const, description: 'Instrument, masalan EURUSD.' },
  direction: { type: 'string' as const, description: '"buy" yoki "sell" (long/short).' },
  openedAt: {
    type: 'string' as const,
    description: 'Ochilish vaqti ISO: "2026-10-14T15:30". Rasmda yo‘q bo‘lsa — bo‘sh satr.',
  },
  closedAt: {
    type: 'string' as const,
    description: 'Yopilish vaqti ISO. Rasmda bitta vaqt bo‘lsa odatda shu.',
  },
  entryPrice: { type: 'string' as const, description: 'Kirish narxi.' },
  exitPrice: { type: 'string' as const, description: 'Chiqish narxi.' },
  volume: { type: 'string' as const, description: 'Lot hajmi, masalan 0.25.' },
  commission: { type: 'string' as const, description: 'Komissiya. Ko‘rinmasa bo‘sh satr.' },
  swap: { type: 'string' as const, description: 'Svop. Ko‘rinmasa bo‘sh satr.' },
  profit: { type: 'string' as const, description: 'Broker ko‘rsatgan natija, minus bilan.' },
};

const TOOL = {
  name: 'savdolar',
  description: 'Rasmda ko‘ringan savdolar ro‘yxati.',
  input_schema: {
    type: 'object' as const,
    properties: {
      trades: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: TRADE_PROPERTIES,
          required: Object.keys(TRADE_PROPERTIES),
        },
      },
      note: { type: 'string' as const, description: 'Bir jumla: nima ko‘rinди, nima ko‘rinmadi.' },
    },
    required: ['trades', 'note'],
  },
};

const PROMPT = `Sen treyding jurnaliga savdo tarixini ko'chiryapsan. Rasm — MetaTrader 4/5 yoki boshqa platformaning TARIX ro'yxati: unda bir nechta yopilgan savdo ko'rinadi.

Vazifang: ro'yxatdagi HAR BIR savdoni alohida qator qilib qaytarish.

Qat'iy qoidalar:
1. Faqat rasmda yozilganini qaytar. Hech narsani taxmin qilma, hisoblama, to'qima.
2. Maydon ko'rinmasa — bo'sh satr. Bo'sh qoldirish noto'g'ri qiymatdan yaxshiroq.
3. Yig'indi, balans, depozit, "Total", "Profit" kabi YAKUNIY qatorlarni savdo deb olma. Faqat alohida savdolar kerak.
4. Bitta savdo ikki marta tushmasin.
5. Narxlarni aynan o'qi, raqamni yaxlitlama. "1.11924" — shundayligicha.
6. volume — lot hajmi (0.25, 2.5, 5), pul summasi emas.
7. profit — brokerning natijasi, minus belgisi bilan birga. Bo'shliqli yozilgan bo'lsa ("-1 210.00") bo'shliqni olib tashla.
8. Vaqt ISO ko'rinishida: "2026-10-14T15:30". Rasmda bitta vaqt bo'lsa uni closedAt ga yoz va openedAt ni bo'sh qoldir — o'zingdan ochilish vaqtini o'ylab topma.
9. symbol dan platforma qo'shimchalarini (".m", "#", "_i") olib tashla.
10. Rasmda savdo ko'rinmasa — trades bo'sh ro'yxat.

note maydoniga bir jumlada yoz: nechta savdo ko'rdingu nimani o'qiy olmading.`;

const LANGUAGE_NAMES: Record<string, string> = { uz: 'o‘zbek', ru: 'rus', en: 'ingliz' };

export type HistoryExtraction = { grid: HistoryGrid; note: string };

export async function extractHistory(
  image: Buffer,
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp',
  d: Dict,
  locale = 'uz',
): Promise<HistoryExtraction> {
  const client = new Anthropic({ apiKey: aiKey() });

  const response = await client.messages.create({
    model: aiModel(),
    max_tokens: 4096,
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
  if (!block || block.type !== 'tool_use') throw new Error(d.extract.nothingRead);

  const raw = block.input as { trades?: unknown; note?: unknown };

  return {
    grid: normalizeHistoryRows(raw.trades),
    note: typeof raw.note === 'string' ? raw.note.trim() : '',
  };
}
