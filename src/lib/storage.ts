import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Skrinshotlar qayerda yotadi.
 *
 *  Ikki saqlagich bor va tanlov sozlamaga qarab bo'ladi:
 *
 *  - **Disk** (standart) — `<UPLOAD_DIR>/<kalit>`. Oddiy server yoki VPS
 *    uchun eng sodda yo'l, hech narsa sozlash shart emas.
 *  - **S3** — `S3_BUCKET` qo'yilgan bo'lsa. S3 ning o'zi, Cloudflare R2,
 *    Backblaze B2 va MinIO — hammasi bitta protokol, farqi faqat
 *    `S3_ENDPOINT` da. Shu variantda ilova serverless'da ham ishlaydi,
 *    chunki fayl mahalliy diskka bog'lanmaydi.
 *
 *  Kalit ikkala holatda bir xil: `<userId>/<uuid>.<kengaytma>`. Bazada
 *  shu kalit turadi, to'liq yo'l emas — shuning uchun saqlagichni
 *  almashtirsangiz yozuvlar buzilmaydi, faqat fayllarni ko'chirish kerak.
 */

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export type Stored = { data: Buffer; mediaType: string };

/* -------------------------------------------------------------------- disk */

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || './uploads');
}

/** Kalit ichida ".." yoki absolyut yo'l bo'lsa — rad etiladi. */
function safeKeyPath(key: string): string {
  const root = uploadRoot();
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(root, normalized);
  if (!full.startsWith(root + path.sep)) {
    throw new StorageError('Yaroqsiz fayl kaliti.');
  }
  return full;
}

async function diskPut(key: string, data: Buffer): Promise<void> {
  const full = safeKeyPath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

async function diskGet(key: string): Promise<Buffer> {
  return readFile(safeKeyPath(key));
}

/* ---------------------------------------------------------------------- S3 */

type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** R2, B2 va MinIO uchun. Bo'sh bo'lsa — AWS ning o'z manzili. */
  endpoint: string;
  pathStyle: boolean;
};

export function s3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const region = process.env.S3_REGION || 'auto';
  const endpoint = (process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`).replace(
    /\/+$/,
    '',
  );

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    // MinIO va mahalliy sinovlar uchun. R2 ham path-style bilan ishlaydi.
    pathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || !!process.env.S3_ENDPOINT,
  };
}

export function isS3(): boolean {
  return s3Config() !== null;
}

function objectUrl(config: S3Config, key: string): string {
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  if (config.pathStyle) return `${config.endpoint}/${config.bucket}/${encoded}`;

  const url = new URL(config.endpoint);
  return `${url.protocol}//${config.bucket}.${url.host}/${encoded}`;
}

/** aws4fetch imzoni o'zi qo'yadi — SigV4 ni qo'lda yozish shart emas. */
async function signer(config: S3Config) {
  const { AwsClient } = await import('aws4fetch');
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: config.region,
  });
}

async function s3Put(
  config: S3Config,
  key: string,
  data: Buffer,
  mediaType: string,
): Promise<void> {
  const client = await signer(config);

  const response = await client.fetch(objectUrl(config, key), {
    method: 'PUT',
    body: new Uint8Array(data),
    headers: { 'content-type': mediaType, 'content-length': String(data.length) },
  });

  if (!response.ok) {
    throw new StorageError(`S3 yozib bo‘lmadi (${response.status}).`);
  }
}

async function s3Get(config: S3Config, key: string): Promise<Buffer> {
  const client = await signer(config);
  const response = await client.fetch(objectUrl(config, key), { method: 'GET' });

  if (!response.ok) {
    throw new StorageError(`S3 dan o‘qib bo‘lmadi (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/** Bitta foydalanuvchining hamma fayllari. Hisob o'chirilganda yoki
 *  namuna hisob muddati tugaganda chaqiriladi — aks holda rasmlar
 *  saqlagichda egasiz qolib ketardi.
 */
async function diskDeleteUser(userId: string): Promise<void> {
  // Kalit `<userId>/...` ko'rinishida, ya'ni papka nomi — foydalanuvchi id si.
  // `safeKeyPath` uni ildizdan chiqib ketishdan saqlaydi.
  await rm(safeKeyPath(userId), { recursive: true, force: true });
}

/** S3 da papka tushunchasi yo'q — prefiks bo'yicha ro'yxat olinadi va
 *  har bir obyekt alohida o'chiriladi. Bitta foydalanuvchida bir necha
 *  o'nlab fayl bo'ladi, shuning uchun bu yetarli.
 */
async function s3DeleteUser(config: S3Config, userId: string): Promise<void> {
  const client = await signer(config);
  const base = config.pathStyle
    ? `${config.endpoint}/${config.bucket}`
    : `${new URL(config.endpoint).protocol}//${config.bucket}.${new URL(config.endpoint).host}`;

  let token: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', `${userId}/`);
    if (token) url.searchParams.set('continuation-token', token);

    const listed = await client.fetch(url.toString(), { method: 'GET' });
    if (!listed.ok) throw new StorageError(`S3 ro‘yxatini olib bo‘lmadi (${listed.status}).`);

    const xml = await listed.text();
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => decodeXml(m[1]));

    for (const key of keys) {
      await client.fetch(objectUrl(config, key), { method: 'DELETE' });
    }

    const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    token = next ? decodeXml(next[1]) : undefined;
  } while (token);
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/* -------------------------------------------------------------------- API */

export async function putObject(key: string, data: Buffer, mediaType: string): Promise<void> {
  const config = s3Config();
  if (config) return s3Put(config, key, data, mediaType);
  return diskPut(key, data);
}

export async function getObject(key: string): Promise<Buffer> {
  const config = s3Config();
  if (config) return s3Get(config, key);
  return diskGet(key);
}

/** Foydalanuvchining hamma yuklamalarini o'chiradi.
 *
 *  Xato **yashirilmaydi**. Ilgari jim o'tkazilardi, lekin shunda
 *  quyidagi hol paydo bo'lardi: saqlagich javob bermaydi, skrinshotlar
 *  joyida qoladi, baza yozuvi esa o'chib ketadi — va qaysi fayl kimniki
 *  ekanini bilib bo'lmaydi. Foydalanuvchiga esa "hammasi o'chdi"
 *  deyilgan bo'lardi. Shuning uchun chaqiruvchi xatoni ko'rib, yozuvni
 *  keyingi urinishga qoldiradi.
 */
export async function deleteUserObjects(userId: string): Promise<void> {
  if (!userId || userId.includes('/') || userId.includes('..')) return;

  const config = s3Config();
  if (config) await s3DeleteUser(config, userId);
  else await diskDeleteUser(userId);
}
