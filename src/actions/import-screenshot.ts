'use server';

import { requireUser } from '@/lib/session';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { fill } from '@/lib/i18n';
import { readImage, UploadError } from '@/lib/uploads';
import { extractHistory } from '@/lib/extract-history';
import { isExtractionEnabled } from '@/lib/extract';
import { suggestMapping } from '@/lib/import/fields';
import type { Parsed } from '@/lib/import';
import { logError } from '@/lib/log';

export type HistoryShotState = {
  parsed?: Parsed;
  note?: string;
  warnings?: string[];
  error?: string;
};

/** Tarix skrinshotini jadvalga aylantirish.
 *
 *  Rasm **saqlanmaydi**: u grafik emas, ro'yxat — savdoga biriktirishdan
 *  ma'no yo'q. O'qiladi va unutiladi.
 *
 *  Natija to'g'ridan-to'g'ri bazaga yozilmaydi. U fayl importi bilan
 *  bir xil yo'ldan o'tadi: foydalanuvchi ustunlarni ko'radi, qatorlarni
 *  tekshiradi va o'zi saqlaydi.
 */
export async function readHistoryScreenshot(formData: FormData): Promise<HistoryShotState> {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  if (user.isDemo) return { error: d.demo.blocked };

  const billing = await getBilling(user);
  if (!has(billing.plan, 'screenshot')) return { error: d.billing.lockedScreenshot };

  if (!isExtractionEnabled()) return { error: d.screenshot.warnNoKey };

  // Har bir rasm pul turadi. Chegara ikki qavat: odam bo'yicha va IP
  // bo'yicha — bitta hisobdan ham, bitta tarmoqdan ham.
  const byUser = await rateLimit(`shot-history:${user.id}`, 20, 60 * 60 * 1000);
  const byIp = await rateLimit(await clientKey('shot-history-ip'), 40, 60 * 60 * 1000);
  if (!byUser.allowed || !byIp.allowed) return { error: d.reset.errTooMany };

  const file = formData.get('screenshot');
  if (!(file instanceof File) || file.size === 0) return { error: d.screenshot.errNoImage };

  let image: { data: Buffer; mediaType: string };
  try {
    image = await readImage(file);
  } catch (error) {
    if (error instanceof UploadError) return { error: d.errors[error.key] };
    return { error: error instanceof Error ? error.message : d.screenshot.errSaveFailed };
  }

  try {
    const { grid, note } = await extractHistory(
      image.data,
      image.mediaType as 'image/png' | 'image/jpeg' | 'image/webp',
      d,
      locale,
    );

    if (grid.rows.length === 0) return { error: d.importShot.errNothing, note };

    const warnings: string[] = [];
    if (grid.assumedOpenedAt > 0) {
      warnings.push(fill(d.importShot.warnAssumedOpen, { n: grid.assumedOpenedAt }));
    }
    if (grid.dropped > 0) {
      warnings.push(fill(d.importShot.warnDropped, { n: grid.dropped }));
    }
    warnings.push(d.importShot.warnCheck);

    return {
      parsed: {
        kind: 'csv',
        headers: grid.headers,
        rows: grid.rows,
        mapping: suggestMapping(grid.headers),
      },
      note,
      warnings,
    };
  } catch (error) {
    await logError('import.screenshot', error, { userId: user.id, path: '/trades/import' });
    return {
      error:
        error instanceof Error
          ? fill(d.screenshot.errReadFailed, { reason: error.message })
          : d.screenshot.errReadFailedShort,
    };
  }
}
