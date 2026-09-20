import { NextResponse } from 'next/server';
import { getUser } from '@/lib/session';
import { keyBelongsTo, readUpload } from '@/lib/uploads';
import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Skrinshotlar ochiq URL bilan berilmaydi — faqat egasi ko'radi. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const user = await getUser();
  const d = await getDict(user?.locale);
  if (!user) return new NextResponse(d.errors.unauthorized, { status: 401 });

  const key = (await params).key.join('/');
  if (!keyBelongsTo(key, user.id)) {
    return new NextResponse(d.errors.forbidden, { status: 403 });
  }

  try {
    const { data, mediaType } = await readUpload(key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': mediaType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Topilmadi', { status: 404 });
  }
}
