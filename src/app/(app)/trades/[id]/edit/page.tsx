import { notFound } from 'next/navigation';
import Topbar from '@/components/ui/Topbar';
import TradeForm from '@/components/trades/TradeForm';
import { updateTrade } from '@/actions/trades';
import { getActiveAccount, getSetupOptions, getTradeDetail, getTrades } from '@/lib/account';
import { defaultChecks } from '@/lib/starter-data';
import { toLocalInput } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { isExtractionEnabled } from '@/lib/extract';

import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

const text = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  const trade = await getTradeDetail(id, user.id);
  if (!trade) notFound();

  const [setups, trades] = await Promise.all([
    getSetupOptions(user.id),
    getTrades(account.id),
  ]);

  const summary = summarize(trades, account.startingBalance);
  const checks =
    trade.checks.length > 0
      ? trade.checks.map((c) => ({ label: c.label, passed: c.passed }))
      : defaultChecks(d).map((label) => ({ label, passed: false }));

  return (
    <>
      <Topbar
        title={d.tradeForm.editTitle}
        sub={`${trade.symbol} · ${trade.id.slice(-6)}`}
        cta={null}
      />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <TradeForm
          action={updateTrade.bind(null, trade.id)}
          setups={setups}
          balance={summary.balance}
          riskPerTradePct={account.riskPerTradePct}
          screenshotEnabled={isExtractionEnabled()}
          submitLabel={d.tradeForm.saveEdit}
          cancelHref={`/trades/${trade.id}`}
          initial={{
            symbol: trade.symbol,
            direction: trade.direction,
            openedAt: toLocalInput(trade.openedAt),
            closedAt: trade.closedAt ? toLocalInput(trade.closedAt) : '',
            entryPrice: text(trade.entryPrice),
            stopPrice: text(trade.stopPrice),
            takeProfit: text(trade.takeProfit),
            exitPrice: text(trade.exitPrice),
            volume: text(trade.volume),
            commission: text(trade.commission),
            swap: text(trade.swap),
            pnlOverride: text(trade.pnlOverride),
            setupId: trade.setupId ?? '',
            session: trade.session,
            timeframe: trade.timeframe,
            tags: trade.tags.join(', '),
            notes: trade.notes,
            discipline: text(trade.discipline),
            patience: text(trade.patience),
            confidence: text(trade.confidence),
            stress: text(trade.stress),
            screenshotKey: trade.screenshotKey ?? '',
            isBacktest: trade.isBacktest,
            checks,
          }}
        />
      </div>
    </>
  );
}
