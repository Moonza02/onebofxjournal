import Link from 'next/link';
import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, KeyValue } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import ReferenceForm from '@/components/billing/ReferenceForm';
import { cancelPayment } from '@/actions/billing';
import { requireUser } from '@/lib/session';
import { getPayment } from '@/lib/payments';
import { sum } from '@/lib/billing';
import { shortDate } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function ManualPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);

  const payment = await getPayment(id);
  if (!payment || payment.userId !== user.id) notFound();

  const card = process.env.MANUAL_CARD_NUMBER || '';
  const holder = process.env.MANUAL_CARD_HOLDER || '';
  const contact = process.env.MANUAL_CONTACT || '';

  return (
    <>
      <Topbar
        title={d.billing.manualTitle}
        sub={fill(d.billing.manualSub, {
          plan: d.plans[payment.plan].name,
          months: payment.months,
          amount: sum(payment.amount, d.billing.currency),
        })}
        actions={
          <Link
            href="/tarif"
            className="flex h-9 shrink-0 items-center rounded-[9px] border border-line bg-card2 px-3 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {d.billing.toPlans}
          </Link>
        }
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="flex min-w-0 grow flex-col gap-3.5">
          {payment.status === 'PAID' ? (
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-win-soft text-win">
                  <Icon name="check" size={18} width={2.6} />
                </span>
                <div>
                  <div className="text-[13.5px] font-bold text-txt">{d.billing.paidTitle}</div>
                  <p className="text-[12px] text-txt3">
                    {fill(d.billing.paidBody, { plan: d.plans[payment.plan].name })}
                  </p>
                </div>
              </div>
            </Card>
          ) : payment.status === 'CANCELLED' ? (
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-loss-soft text-loss">
                  <Icon name="x" size={18} width={2.6} />
                </span>
                <div>
                  <div className="text-[13.5px] font-bold text-txt">{d.billing.cancelledTitle}</div>
                  <p className="text-[12px] text-txt3">{d.billing.cancelledBody}</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <CardTitle right={<Chip tone="amber">{d.billing.waiting}</Chip>}>
                  {d.billing.howTo}
                </CardTitle>
                <ol className="flex flex-col gap-3">
                  {[
                    card
                      ? fill(d.billing.step1Card, {
                          amount: sum(payment.amount, d.billing.currency),
                        })
                      : fill(d.billing.step1NoCard, {
                          amount: sum(payment.amount, d.billing.currency),
                        }),
                    d.billing.step2,
                    d.billing.step3,
                    d.billing.step4,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md bg-blue-soft font-mono text-[11px] font-bold text-bluel">
                        {i + 1}
                      </span>
                      <span className="text-[12.5px] leading-relaxed text-txt2">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card>
                <CardTitle>{d.billing.referenceTitle}</CardTitle>
                <ReferenceForm id={payment.id} current={payment.reference} />
                {payment.reference ? (
                  <p className="mt-3 border-t border-line2 pt-3 text-[11.5px] text-txt3">
                    {fill(d.billing.referenceSent, { reference: payment.reference })}
                  </p>
                ) : null}
              </Card>
            </>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[320px]">
          <Card>
            <CardTitle>{d.billing.paymentInfo}</CardTitle>
            <KeyValue label={d.billing.paymentId} value={payment.id.slice(-10).toUpperCase()} />
            <KeyValue label={d.billing.plan} value={d.plans[payment.plan].name} mono={false} />
            <KeyValue
              label={d.billing.period}
              value={fill(d.billing.monthsShort, { n: payment.months })}
            />
            <KeyValue label={d.billing.amount} value={sum(payment.amount, d.billing.currency)} />
            <KeyValue label={d.billing.created} value={shortDate(payment.createdAt, locale)} />
          </Card>

          {card ? (
            <Card>
              <CardTitle>{d.billing.card}</CardTitle>
              <div className="tnum rounded-[11px] border border-line bg-card2 px-3.5 py-3 font-mono text-[16px] font-semibold tracking-[0.08em] text-txt">
                {card}
              </div>
              {holder ? (
                <p className="mt-2 text-[12px] text-txt2">{holder}</p>
              ) : null}
              {contact ? (
                <p className="mt-2 text-[11.5px] text-txt3">
                  {fill(d.billing.contact, { contact })}
                </p>
              ) : null}
            </Card>
          ) : (
            <Card>
              <div className="flex items-start gap-2.5">
                <span className="mt-px shrink-0 text-amber">
                  <Icon name="shield" size={15} />
                </span>
                <p className="text-[11.5px] leading-relaxed text-txt3">
                  {d.billing.cardMissing}
                </p>
              </div>
            </Card>
          )}

          {payment.status === 'PENDING' ? (
            <Card>
              <form action={cancelPayment}>
                <input type="hidden" name="id" value={payment.id} />
                <button
                  type="submit"
                  className="inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[9px] border border-line bg-card2 px-3 text-[12px] font-bold text-txt3 transition-colors hover:text-loss"
                >
                  <Icon name="x" size={12} width={2.4} />
                  {d.billing.cancelPayment}
                </button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
