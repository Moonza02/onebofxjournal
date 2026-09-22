'use server';

import { z } from 'zod';
import { getActiveAccount, getTrades } from '@/lib/account';
import { buildWeeklyReport, reportHighlights } from '@/lib/report';
import { renderWeeklyPdf } from '@/lib/pdf';
import { isMailConfigured, reportEmail, sendMail } from '@/lib/mail';
import { rateLimit } from '@/lib/ratelimit';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getDict, getLocale } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';
import { needsVerification } from '@/lib/verify';

export type ReportState = { error?: string; ok?: string };

const schema = z.object({
  week: z.coerce.number().int().min(0).max(52),
  to: z.string().email().optional().or(z.literal('')),
});

/** Hisobot faqat shu yerdan, foydalanuvchi so'ragandagina jo'natiladi.
 *  Avtomatik haftalik jo'natish yo'q — foydalanuvchi shunday xohlagan.
 */
export async function emailWeeklyReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = schema.safeParse({
    week: formData.get('week') ?? 1,
    to: formData.get('to') ?? '',
  });
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  // Namuna hisobdan begona manzilga xat ketmasin.
  if (user.isDemo) return { error: d.demo.blocked };

  // Tasdiqlanmagan manzil bilan ham: bu forma istalgan manzilga PDF
  // jo'natadi, demak tasdiqlanmagan hisob xat tarqatish vositasiga
  // aylanib qolmasligi kerak.
  if (needsVerification('weeklyReport', user)) return { error: d.verify.needVerified };

  if (!parsed.success) return { error: d.report.errEmail };

  const billing = await getBilling(user);
  if (!has(billing.plan, 'report')) {
    return { error: d.billing.lockedReport };
  }

  if (!isMailConfigured()) {
    return {
      error: d.report.errSmtp,
    };
  }

  // Soatiga 5 ta xat — tasodifiy bosishlardan va suiiste’moldan himoya.
  const limit = await rateLimit(`report:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: d.report.errTooMany };
  }

  const trades = await getTrades(account.id);
  const report = await buildWeeklyReport({
    userId: user.id,
    userName: user.name,
    account,
    trades,
    timeZone: user.timezone,
    offset: parsed.data.week,
    locale: await getLocale(user.locale),
  });

  const pdf = await renderWeeklyPdf(report, d);
  const to = parsed.data.to || user.email;
  const { subject, text, html } = reportEmail({
    userName: user.name,
    label: report.label,
    lines: reportHighlights(report, d),
    d,
  });

  const result = await sendMail({
    to,
    subject,
    text,
    html,
    tag: 'report',
    attachments: [
      {
        filename: `onebo-fx-${report.label.replace(/\s|—/g, '')}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  if (!result.ok) return { error: result.error ?? d.report.errSend };
  return { ok: fill(d.report.okSent, { to }) };
}
