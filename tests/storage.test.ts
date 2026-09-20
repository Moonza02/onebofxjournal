import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sniffImage } from '@/lib/uploads';

/** Saqlagich sinovlari.
 *
 *  S3 yo'li haqiqiy S3 ga emas, mahalliy soxta serverga yoziladi:
 *  bu yerda tekshiriladigan narsa — so'rov qayerga, qanday usul bilan
 *  va qanday sarlavhalar bilan ketishi. Imzoning o'zi `aws4fetch`
 *  zimmasida.
 */

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.alloc(4),
  Buffer.from('WEBP', 'latin1'),
  Buffer.alloc(8),
]);

describe('sniffImage', () => {
  it('haqiqiy sarlavha baytlarini tanidi', () => {
    expect(sniffImage(PNG)).toBe('image/png');
    expect(sniffImage(JPEG)).toBe('image/jpeg');
    expect(sniffImage(WEBP)).toBe('image/webp');
  });

  it('rasm bo‘lmagan faylni rad etadi', () => {
    // Nomi .png bo'lsa ham, ichi rasm emas.
    expect(sniffImage(Buffer.from('MZ\u0090\u0000not an image at all', 'latin1'))).toBeNull();
    expect(sniffImage(Buffer.from('%PDF-1.7 hello', 'latin1'))).toBeNull();
    expect(sniffImage(Buffer.alloc(4))).toBeNull();
  });
});

describe('disk saqlagichi', () => {
  it('kalit bo‘yicha yozadi va o‘qiydi', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'onebo-'));
    process.env.UPLOAD_DIR = dir;
    delete process.env.S3_BUCKET;

    const { getObject, putObject } = await import('@/lib/storage');

    await putObject('user-1/a.png', PNG, 'image/png');

    expect(await getObject('user-1/a.png')).toEqual(PNG);
    // Haqiqatan diskda, kutilgan joyda.
    expect(await readFile(path.join(dir, 'user-1', 'a.png'))).toEqual(PNG);
  });

  it('foydalanuvchi fayllarini butunlay o‘chiradi', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'onebo-'));
    process.env.UPLOAD_DIR = dir;
    delete process.env.S3_BUCKET;

    const { deleteUserObjects, getObject, putObject } = await import('@/lib/storage');

    await putObject('user-2/a.png', PNG, 'image/png');
    await putObject('user-2/b.png', PNG, 'image/png');
    await putObject('user-3/c.png', PNG, 'image/png');

    await deleteUserObjects('user-2');

    await expect(getObject('user-2/a.png')).rejects.toThrow();
    await expect(getObject('user-2/b.png')).rejects.toThrow();
    // Boshqa foydalanuvchining fayliga tegmaydi.
    expect(await getObject('user-3/c.png')).toEqual(PNG);
  });

  it('o‘chirishda ildizdan chiqib keta olmaydi', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'onebo-'));
    process.env.UPLOAD_DIR = dir;
    delete process.env.S3_BUCKET;

    const { deleteUserObjects, getObject, putObject } = await import('@/lib/storage');
    await putObject('user-9/keep.png', PNG, 'image/png');

    // Yaroqsiz id lar jim o'tkaziladi, hech narsa o'chmaydi.
    await deleteUserObjects('..');
    await deleteUserObjects('../..');
    await deleteUserObjects('a/b');
    await deleteUserObjects('');

    expect(await getObject('user-9/keep.png')).toEqual(PNG);
  });

  it('kalit papkadan chiqib keta olmaydi', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'onebo-'));
    process.env.UPLOAD_DIR = dir;

    const { getObject } = await import('@/lib/storage');

    await expect(getObject('../../etc/passwd')).rejects.toThrow();
  });
});

describe('S3 saqlagichi', () => {
  const received: {
    method: string;
    url: string;
    auth: string;
    contentType: string;
    body: Buffer;
  }[] = [];
  const objects = new Map<string, Buffer>();

  let server: http.Server;
  let port = 0;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        received.push({
          method: req.method ?? '',
          url: req.url ?? '',
          auth: String(req.headers.authorization ?? ''),
          contentType: String(req.headers['content-type'] ?? ''),
          body,
        });

        if (req.method === 'PUT') {
          objects.set(req.url ?? '', body);
          res.writeHead(200).end();
          return;
        }

        const stored = objects.get(req.url ?? '');
        if (!stored) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'content-type': 'image/png' }).end(stored);
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    delete process.env.S3_BUCKET;
  });

  it('S3_BUCKET qo‘yilsa shu saqlagich tanlanadi', async () => {
    process.env.S3_BUCKET = 'shots';
    process.env.S3_REGION = 'auto';
    process.env.S3_ACCESS_KEY_ID = 'test-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
    process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;

    const { isS3, s3Config } = await import('@/lib/storage');

    expect(isS3()).toBe(true);
    // Mahalliy endpoint berilganda path-style ishlatiladi — bucket
    // nomini DNS ga qo'shish shart bo'lmaydi.
    expect(s3Config()?.pathStyle).toBe(true);
  });

  it('obyektni yozadi va qaytarib o‘qiydi', async () => {
    process.env.S3_BUCKET = 'shots';
    process.env.S3_REGION = 'auto';
    process.env.S3_ACCESS_KEY_ID = 'test-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
    process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;

    const { getObject, putObject } = await import('@/lib/storage');

    received.length = 0;
    await putObject('user-9/shot.png', PNG, 'image/png');

    const put = received[0];
    expect(put.method).toBe('PUT');
    expect(put.url).toBe('/shots/user-9/shot.png');
    expect(put.contentType).toBe('image/png');
    expect(put.body).toEqual(PNG);
    // So'rov imzolangan — imzosiz S3 401 qaytarardi.
    expect(put.auth).toMatch(/^AWS4-HMAC-SHA256 Credential=test-key\//);
    expect(put.auth).toContain('/auto/s3/aws4_request');

    expect(await getObject('user-9/shot.png')).toEqual(PNG);
    expect(received[1].method).toBe('GET');
  });

  it('S3 xato qaytarsa tushunarli xato beradi', async () => {
    process.env.S3_BUCKET = 'shots';
    process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;

    const { getObject } = await import('@/lib/storage');

    await expect(getObject('user-9/yoq.png')).rejects.toThrow(/404/);
  });
});
