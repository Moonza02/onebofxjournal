import Topbar from '@/components/ui/Topbar';
import TradeForm from '@/components/trades/TradeForm';
import { createTrade } from '@/actions/trades';
import { getActiveAccount, getSetupOptions, getTrades } from '@/lib/account';
import { defaultChecks } from '@/lib/starter-data';
import { toLocalInput } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { isExtractionEnabled } from '@/lib/extract';

import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function NewTradePage() {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  const [setups, trades] = await Promise.all([
    getSetupOptions(user.id),
    getTrades(account.id),
  ]);

  const summary = summarize(trades, account.startingBalance);

  return (
    <>
      <Topbar title={d.tradeForm.newTitle} sub={d.tradeForm.newSub} cta={null} />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <TradeForm
          action={createTrade}
          setups={setups}
          balance={summary.balance}
          riskPerTradePct={account.riskPerTradePct}
          screenshotEnabled={isExtractionEnabled()}
          submitLabel={d.tradeForm.saveNew}
          cancelHref="/trades"
          initial={{
            symbol: 'XAUUSD',
            direction: 'LONG',
            openedAt: toLocalInput(new Date()),
            closedAt: '',
            entryPrice: '',
            stopPrice: '',
            takeProfit: '',
            exitPrice: '',
            volume: '',
            commission: '',
            swap: '',
            pnlOverride: '',
            setupId: '',
            session: '',
            timeframe: '',
            tags: '',
            notes: '',
            discipline: '',
            patience: '',
            confidence: '',
            stress: '',
            screenshotKey: '',
            isBacktest: false,
            checks: defaultChecks(d).map((label) => ({ label, passed: false })),
          }}
        />
      </div>
    </>
  );
}
