'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { getActiveAccount, getTrades } from '@/lib/account';
import { canAddTrade, getBilling } from '@/lib/payments';
import { getDict } from '@/lib/i18n/server';
import type { Dict } from '@/lib/i18n';
import { fill } from '@/lib/i18n';
import { limits } from '@/lib/billing';
import { evaluateAlerts } from '@/lib/alerts';
import { logAlerts } from './alerts';
import { specFor } from '@/lib/instruments';
import { sessionFor } from '@/lib/tz';

export type TradeFormState = { error?: string };

/** Bo'sh satr → undefined, aks holda son. */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().finite().optional(),
);

const requiredNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
  z.number().finite(),
);

const tradeSchema = (d: Dict) =>
  z
  .object({
    symbol: z.string().trim().min(1, d.tradeForm.errSymbol).transform((s) => s.toUpperCase()),
    direction: z.enum(['LONG', 'SHORT']),
    openedAt: z.string().min(1, d.tradeForm.errOpenedAt),
    closedAt: z.string().optional(),
    entryPrice: requiredNumber,
    stopPrice: requiredNumber,
    takeProfit: optionalNumber,
    exitPrice: optionalNumber,
    volume: requiredNumber,
    commission: optionalNumber,
    swap: optionalNumber,
    pnlOverride: optionalNumber,
    pipSize: optionalNumber,
    pipValuePerLot: optionalNumber,
    setupId: z.string().optional(),
    screenshotKey: z.string().optional(),
    isBacktest: z.preprocess((v) => v === 'on' || v === true, z.boolean()).optional(),
    session: z.string().optional(),
    timeframe: z.string().optional(),
    tags: z.string().optional(),
    notes: z.string().optional(),
    discipline: optionalNumber,
    patience: optionalNumber,
    confidence: optionalNumber,
    stress: optionalNumber,
  })
  .superRefine((v, ctx) => {
    if (v.volume <= 0) {
      ctx.addIssue({ code: 'custom', path: ['volume'], message: d.tradeForm.errVolume });
    }
    if (v.entryPrice === v.stopPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['stopPrice'],
        message: d.tradeForm.errStopEqualsEntry,
      });
    }
    // Mantiqiy tekshiruv: stop yo'nalishga qarshi tomonda turishi kerak.
    if (v.direction === 'LONG' && v.stopPrice > v.entryPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['stopPrice'],
        message: d.tradeForm.errStopLong,
      });
    }
    if (v.direction === 'SHORT' && v.stopPrice < v.entryPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['stopPrice'],
        message: d.tradeForm.errStopShort,
      });
    }
    if (v.takeProfit !== undefined) {
      if (v.direction === 'LONG' && v.takeProfit <= v.entryPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['takeProfit'],
          message: d.tradeForm.errTakeLong,
        });
      }
      if (v.direction === 'SHORT' && v.takeProfit >= v.entryPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['takeProfit'],
          message: d.tradeForm.errTakeShort,
        });
      }
    }
    if (v.exitPrice !== undefined && !v.closedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['closedAt'],
        message: d.tradeForm.errNeedClosedAt,
      });
    }
    if (v.closedAt && v.exitPrice === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['exitPrice'],
        message: d.tradeForm.errNeedExit,
      });
    }
    if (v.closedAt && new Date(v.closedAt) < new Date(v.openedAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['closedAt'],
        message: d.tradeForm.errClosedBeforeOpen,
      });
    }
  });

function parseChecks(formData: FormData) {
  const labels = formData.getAll('checkLabel').map(String);
  return labels.map((label, i) => ({
    label,
    passed: formData.get(`checkPassed-${i}`) === 'on',
    order: i,
  }));
}

function buildData(values: z.infer<ReturnType<typeof tradeSchema>>) {
  const spec = specFor(values.symbol);
  const openedAt = new Date(values.openedAt);

  return {
    symbol: values.symbol,
    direction: values.direction,
    openedAt,
    closedAt: values.closedAt ? new Date(values.closedAt) : null,
    entryPrice: values.entryPrice,
    stopPrice: values.stopPrice,
    takeProfit: values.takeProfit ?? null,
    exitPrice: values.exitPrice ?? null,
    volume: values.volume,
    pipSize: values.pipSize && values.pipSize > 0 ? values.pipSize : spec.pipSize,
    pipValuePerLot:
      values.pipValuePerLot && values.pipValuePerLot > 0
        ? values.pipValuePerLot
        : spec.pipValuePerLot,
    commission: values.commission ?? 0,
    swap: values.swap ?? 0,
    pnlOverride: values.pnlOverride ?? null,
    setupId: values.setupId || null,
    screenshotKey: values.screenshotKey || null,
    isBacktest: values.isBacktest ?? false,
    session: values.session || sessionFor(openedAt),
    timeframe: values.timeframe ?? '',
    tags: (values.tags ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    notes: values.notes ?? '',
    discipline: values.discipline ?? null,
    patience: values.patience ?? null,
    confidence: values.confidence ?? null,
    stress: values.stress ?? null,
  };
}

export async function createTrade(
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  const { user, account } = await getActiveAccount();

  // Oylik chegara — tarifga bog'liq. Savdo qo'shishdan oldin tekshiriladi.
  const d = await getDict(user.locale);
  const billing = await getBilling(user);
  if (!canAddTrade(billing)) {
    return {
      error: fill(d.billing.limitTrades, { n: limits(billing.plan).tradesPerMonth }),
    };
  }

  const parsed = tradeSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const checks = parseChecks(formData);
  const data = buildData(parsed.data);

  // Savdo qo'shilishidan oldingi holat — ogohlantirishlar shundan baholanadi.
  const before = await getTrades(account.id);
  const alerts = evaluateAlerts({
    d,
    account,
    trades: before,
    timeZone: user.timezone,
    draft: {
      openedAt: data.openedAt,
      volume: data.volume,
      risk:
        (Math.abs(data.entryPrice - data.stopPrice) / data.pipSize) *
        data.pipValuePerLot *
        data.volume,
    },
  });

  const trade = await db.trade.create({
    data: {
      ...data,
      accountId: account.id,
      ruleCompliant: checks.length === 0 || checks.every((c) => c.passed),
      checks: { create: checks },
    },
  });

  // Ogohlantirish chiqqan bo'lsa-yu savdo baribir qo'shilgan bo'lsa — yoziladi.
  // Bu bloklash emas: oy oxirida "e'tibor bermagan savdolar qanday tugadi"
  // degan raqam shu yozuvlardan chiqadi.
  await logAlerts(user.id, account.id, alerts, 'IGNORED', trade.id);

  revalidatePath('/');
  revalidatePath('/trades');
  revalidatePath('/calendar');
  revalidatePath('/alerts');
  redirect(`/trades/${trade.id}`);
}

export async function updateTrade(
  tradeId: string,
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  const user = await requireUser();
  const d = await getDict(user.locale);

  const existing = await db.trade.findFirst({
    where: { id: tradeId, account: { userId: user.id } },
    select: { id: true },
  });
  if (!existing) return { error: d.tradeForm.errNotFound };

  const parsed = tradeSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const checks = parseChecks(formData);

  await db.trade.update({
    where: { id: tradeId },
    data: {
      ...buildData(parsed.data),
      ruleCompliant: checks.length === 0 || checks.every((c) => c.passed),
      checks: { deleteMany: {}, create: checks },
    },
  });

  revalidatePath('/');
  revalidatePath('/trades');
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath('/calendar');
  redirect(`/trades/${tradeId}`);
}

export async function deleteTrade(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  const trade = await db.trade.findFirst({
    where: { id, account: { userId: user.id } },
    select: { id: true },
  });
  if (!trade) redirect('/trades');

  await db.trade.delete({ where: { id } });

  revalidatePath('/');
  revalidatePath('/trades');
  revalidatePath('/calendar');
  redirect('/trades');
}
