'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { periodFor } from '@/lib/billing';
import { createPayment, getPayment, markPaid } from '@/lib/payments';
import { checkoutUrl as paymeUrl } from '@/lib/payme';
import { checkoutUrl as clickUrl } from '@/lib/click';
import { checkoutUrl as uzumCheckoutUrl } from '@/lib/uzum';
import { rateLimit } from '@/lib/ratelimit';
import { getDict } from '@/lib/i18n/server';

export type CheckoutState = { error?: string; ok?: string };

const schema = z.object({
  plan: z.enum(['PRO', 'MENTOR']),
  months: z.coerce.number().int(),
  provider: z.enum(['PAYME', 'CLICK', 'UZUM', 'MANUAL']),
});

function siteUrl(): string {
  return (process.env.APP_URL || '').replace(/\/$/, '');
}

/** To'lovni boshlash.
 *
 *  Summani server hisoblaydi — formadan kelgan narxga ishonilmaydi.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = schema.safeParse({
    plan: formData.get('plan'),
    months: formData.get('months'),
    provider: formData.get('provider'),
  });
  const user = await requireUser();
  const d = await getDict(user.locale);

  if (user.isDemo) return { error: d.demo.blocked };
  // O'chirilishi kutilayotgan hisobga tarif sotilmaydi: bir oydan keyin
  // hisob ham, to'lov tarixi ham ketadi — pul esa qaytmaydi.
  if (user.deletionRequestedAt) return { error: d.billing.errorPendingDeletion };
  if (!parsed.success) return { error: d.billing.errorPlan };
  if (!periodFor(parsed.data.months)) return { error: d.billing.errorPeriod };

  if (!(await rateLimit(`checkout:${user.id}`, 20, 60 * 60 * 1000)).allowed) {
    return { error: d.billing.errorTooMany };
  }

  const payment = await createPayment({
    userId: user.id,
    plan: parsed.data.plan,
    months: parsed.data.months,
    provider: parsed.data.provider,
  });
  if (!payment) return { error: d.billing.errorCreate };

  if (parsed.data.provider === 'MANUAL') {
    redirect(`/tarif/tolov/${payment.id}`);
  }

  if (parsed.data.provider === 'PAYME') {
    const merchantId = process.env.PAYME_MERCHANT_ID;
    if (!merchantId) {
      return { error: d.billing.errorPaymeOff };
    }
    redirect(
      paymeUrl({
        merchantId,
        paymentId: payment.id,
        amount: payment.amount,
        returnUrl: siteUrl() ? `${siteUrl()}/tarif` : undefined,
        host: process.env.PAYME_CHECKOUT_URL,
      }),
    );
  }

  if (parsed.data.provider === 'UZUM') {
    // Uzum checkout havolasining shakli kassa sozlamasida beriladi —
    // shuning uchun u kodda emas, .env da namuna sifatida turadi.
    const template = process.env.UZUM_CHECKOUT_URL;
    if (!template || !process.env.UZUM_SERVICE_ID) {
      return { error: d.billing.errorUzumOff };
    }
    redirect(uzumCheckoutUrl(template, payment.id, payment.amount));
  }

  const serviceId = process.env.CLICK_SERVICE_ID;
  const clickMerchantId = process.env.CLICK_MERCHANT_ID;
  if (!serviceId || !clickMerchantId) {
    return { error: d.billing.errorClickOff };
  }

  redirect(
    clickUrl({
      serviceId,
      merchantId: clickMerchantId,
      paymentId: payment.id,
      amount: payment.amount,
      returnUrl: siteUrl() ? `${siteUrl()}/tarif` : undefined,
    }),
  );
}

/* ------------------------------------------------------------------ qo'lda to'lov */

const referenceSchema = z.object({
  id: z.string().min(1),
  reference: z.string().trim().min(3).max(120),
});

/** Foydalanuvchi o'tkazma qilgach chek raqamini qoldiradi.
 *  Tarif bu bilan ochilmaydi — tasdiqni xodim beradi.
 */
export async function submitReference(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = referenceSchema.safeParse({
    id: formData.get('id'),
    reference: formData.get('reference'),
  });
  const user = await requireUser();
  const d = await getDict(user.locale);

  if (!parsed.success) return { error: d.billing.referenceError };

  const updated = await db.payment.updateMany({
    where: { id: parsed.data.id, userId: user.id, status: 'PENDING', provider: 'MANUAL' },
    data: { reference: parsed.data.reference },
  });

  if (updated.count === 0) return { error: d.billing.referenceNotFound };

  revalidatePath(`/tarif/tolov/${parsed.data.id}`);
  return { ok: d.billing.referenceOk };
}

/* ------------------------------------------------------------------ admin */

/** Qo'lda to'lovni tasdiqlash. Faqat xodim uchun. */
export async function confirmManual(formData: FormData): Promise<void> {
  const user = await requireUser();
  const admin = await db.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return;

  const id = String(formData.get('id') ?? '');
  const payment = await getPayment(id);
  if (!payment || payment.provider !== 'MANUAL' || payment.status !== 'PENDING') return;

  await markPaid(payment.id);
  revalidatePath('/admin/tolovlar');
}

export async function rejectManual(formData: FormData): Promise<void> {
  const user = await requireUser();
  const admin = await db.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return;

  const id = String(formData.get('id') ?? '');
  await db.payment.updateMany({
    where: { id, provider: 'MANUAL', status: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  revalidatePath('/admin/tolovlar');
}

/** Kutilayotgan to'lovni foydalanuvchi o'zi bekor qiladi. */
export async function cancelPayment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  await db.payment.updateMany({
    where: { id, userId: user.id, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  revalidatePath('/tarif');
  redirect('/tarif');
}
