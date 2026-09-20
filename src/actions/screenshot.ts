'use server';

import { requireUser } from '@/lib/session';
import { saveUpload, readUpload, UploadError } from '@/lib/uploads';
import { extractTrade, isExtractionEnabled, type ExtractedTrade } from '@/lib/extract';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { fill } from '@/lib/i18n';

export type ScreenshotState = {
  key?: string;
  fields?: ExtractedTrade;
  warnings?: string[];
  note?: string;
  error?: string;
  pending?: boolean;
};

/** Rasm saqlanadi va o'qiladi. Natija formaga TAKLIF qilinadi, o'zi yozilmaydi. */
export async function readScreenshot(
  _prev: ScreenshotState,
  formData: FormData,
): Promise<ScreenshotState> {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  // Namuna hisobda rasm o'qish yopiq — bu AI chaqiruvi va fayl yozuvi.
  if (user.isDemo) return { error: d.demo.blocked };

  const billing = await getBilling(user);
  if (!has(billing.plan, 'screenshot')) {
    return { error: d.billing.lockedScreenshot };
  }

  // Rasm o'qish qimmat: soatiga 30 marta, IP bo'yicha ham shuncha.
  const byUser = await rateLimit(`shot:${user.id}`, 30, 60 * 60 * 1000);
  const byIp = await rateLimit(await clientKey('shot-ip'), 60, 60 * 60 * 1000);
  if (!byUser.allowed || !byIp.allowed) return { error: d.reset.errTooMany };

  const file = formData.get('screenshot');

  if (!(file instanceof File) || file.size === 0) {
    return { error: d.screenshot.errNoImage };
  }

  let key: string;
  try {
    const saved = await saveUpload(user.id, file);
    key = saved.key;
  } catch (error) {
    if (error instanceof UploadError) return { error: d.errors[error.key] };
    return { error: error instanceof Error ? error.message : d.screenshot.errSaveFailed };
  }

  if (!isExtractionEnabled()) {
    return {
      key,
      warnings: [d.screenshot.warnNoKey],
    };
  }

  try {
    const { data, mediaType } = await readUpload(key);
    const result = await extractTrade(
      data,
      mediaType as 'image/png' | 'image/jpeg' | 'image/webp',
      d,
      locale,
    );
    return { key, fields: result.fields, warnings: result.warnings, note: result.note };
  } catch (error) {
    // O'qish ishlamasa ham rasm saqlanib qoladi — savdoga biriktiriladi.
    return {
      key,
      error:
        error instanceof Error
          ? fill(d.screenshot.errReadFailed, { reason: error.message })
          : d.screenshot.errReadFailedShort,
    };
  }
}
