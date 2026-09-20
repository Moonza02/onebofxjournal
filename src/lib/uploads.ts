import 'server-only';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getObject, putObject } from './storage';

/** Skrinshotlarni qabul qilish.
 *
 *  Kalit: `<userId>/<uuid>.<kengaytma>`. Bazada faqat shu kalit turadi,
 *  to'liq yo'l emas — fayllar qayerda yotishi `storage.ts` da hal
 *  bo'ladi (disk yoki S3).
 */

const ALLOWED = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const;

export type ImageType = keyof typeof ALLOWED;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/** Xato sababi kalit bilan qaytadi — matn chaqiruvchi tomonda,
 *  foydalanuvchining tilida tanlanadi.
 */
export class UploadError extends Error {
  constructor(readonly key: 'uploadType' | 'uploadSize') {
    super(key);
    this.name = 'UploadError';
  }
}

/** Fayl turini brauzer aytganiga ishonmay, boshidagi baytlardan aniqlaymiz.
 *  Nomi va `content-type` ni o'zgartirish oson, sarlavha baytlarini esa yo'q.
 */
export function sniffImage(data: Buffer): ImageType | null {
  if (data.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  // WEBP: "RIFF" .... "WEBP"
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' &&
      data.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

export type SavedUpload = { key: string; mediaType: string; bytes: number };

export async function saveUpload(userId: string, file: File): Promise<SavedUpload> {
  if (!(file.type in ALLOWED)) {
    throw new UploadError('uploadType');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('uploadSize');
  }

  const data = Buffer.from(await file.arrayBuffer());

  // Ikkinchi tekshiruv — haqiqiy baytlar bo'yicha.
  const mediaType = sniffImage(data);
  if (!mediaType) {
    throw new UploadError('uploadType');
  }
  if (data.length > MAX_UPLOAD_BYTES) {
    throw new UploadError('uploadSize');
  }

  const key = `${userId}/${randomUUID()}.${ALLOWED[mediaType]}`;
  await putObject(key, data, mediaType);

  return { key, mediaType, bytes: data.length };
}

export async function readUpload(key: string): Promise<{ data: Buffer; mediaType: string }> {
  const data = await getObject(key);
  const ext = path.extname(key).slice(1).toLowerCase();
  const mediaType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { data, mediaType };
}

/** Kalit shu foydalanuvchiga tegishlimi — serve route shuni tekshiradi. */
export function keyBelongsTo(key: string, userId: string): boolean {
  return key.startsWith(`${userId}/`);
}
