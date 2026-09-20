'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAccount } from '@/lib/account';
import { getBilling } from '@/lib/payments';
import { limits } from '@/lib/billing';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { rateLimit } from '@/lib/ratelimit';
import { logError } from '@/lib/log';
import { MAX_ROWS } from '@/lib/import';
import { FIELDS, type Mapping } from '@/lib/import/fields';
import { mapRows, missingFields, tradeKey } from '@/lib/import/map';

export type ImportState = {
  error?: string;
  /** Nechta savdo qo'shildi. */
  added?: number;
  /** Nechta qator olinmadi. */
  skipped?: number;
  /** Tarif chegarasi sabab kesilgan qatorlar. */
  trimmed?: number;
};

const columnIndex = z.number().int().min(0).max(200);

const schema = z.object({
  rows: z.array(z.array(z.string().max(500)).max(64)).min(1).max(MAX_ROWS),
  mapping: z.object(
    Object.fromEntries(FIELDS.map((f) => [f, columnIndex.optional()])) as Record<
      (typeof FIELDS)[number],
      z.ZodOptional<typeof columnIndex>
    >,
  ),
  keepStopless: z.boolean(),
});

/** Faylni saqlash.
 *
 *  Brauzerda ko'rsatilgan natijaga ishonilmaydi: qatorlar va ustun
 *  moslamasi shu yerda qaytadan tekshiriladi. Brauzerdan faqat matn
 *  keladi, tayyor savdo emas.
 */
export async function importTrades(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  // Import og'ir amal — soatiga bir necha marta yetarli.
  const limit = await rateLimit(`import:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return { error: d.import.errTooMany };

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(JSON.parse(String(formData.get('payload') ?? '')));
  } catch {
    return { error: d.import.errBadPayload };
  }

  const mapping = payload.mapping as Mapping;
  if (missingFields(mapping).length > 0) return { error: d.import.errMapping };

  // Bazada bor savdolar — takrorlanmasligi uchun. Faqat fayldagi
  // vaqt oralig'i olinadi, butun tarix emas.
  const existingKeys = await loadKeys(account.id, payload.rows, mapping);

  const result = mapRows(payload.rows, mapping, {
    keepStopless: payload.keepStopless,
    existingKeys,
  });

  const ready = result.rows.map((r) => r.trade).filter((t) => t !== null);
  if (ready.length === 0) return { error: d.import.errNothing };

  // Oylik chegara. Chegaradan oshgani kesiladi — hammasi rad etilmaydi.
  const billing = await getBilling(user);
  const allowance = limits(billing.plan).tradesPerMonth;
  const room = Number.isFinite(allowance)
    ? Math.max(0, allowance - billing.tradesThisMonth)
    : ready.length;

  if (room === 0) {
    return { error: fill(d.billing.limitTrades, { n: allowance }) };
  }

  const take = ready.slice(0, room);
  const trimmed = ready.length - take.length;

  try {
    await db.trade.createMany({
      data: take.map((trade) => ({ ...trade, accountId: account.id, source: 'IMPORT' as const })),
    });
  } catch (error) {
    await logError('import', error, { userId: user.id, path: '/trades/import' });
    return { error: d.import.errSave };
  }

  revalidatePath('/panel');
  revalidatePath('/trades');

  return { added: take.length, skipped: result.skipped, trimmed };
}

/** Fayldagi oraliqdagi savdolarning takrorlanmaslik kalitlari. */
async function loadKeys(
  accountId: string,
  rows: string[][],
  mapping: Mapping,
): Promise<Set<string>> {
  // Oraliqni bilish uchun avval qatorlar bazasiz aylantiriladi.
  const probe = mapRows(rows, mapping, { keepStopless: true });
  const times = probe.rows
    .map((r) => r.trade?.openedAt.getTime())
    .filter((t): t is number => t !== undefined);

  if (times.length === 0) return new Set();

  const existing = await db.trade.findMany({
    where: {
      accountId,
      openedAt: {
        gte: new Date(Math.min(...times) - 60_000),
        lte: new Date(Math.max(...times) + 60_000),
      },
    },
    select: { symbol: true, direction: true, openedAt: true, volume: true, entryPrice: true },
  });

  return new Set(existing.map(tradeKey));
}
