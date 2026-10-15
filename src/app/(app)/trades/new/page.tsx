import Topbar from '@/components/ui/Topbar';
import TradeForm from '@/components/trades/TradeForm';
import { createTrade } from '@/actions/trades';
import { getAccounts, getActiveAccount, getSetupOptions, getTrades } from '@/lib/account';
import { defaultChecks } from '@/lib/starter-data';
import { toLocalInput } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { isExtractionEnabled } from '@/lib/extract';

import { getDict } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function NewTradePage() {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);

  const [setups, trades, all] = await Promise.all([
    getSetupOptions(user.id),
    getTrades(account.id),
    getAccounts(user.id),
  ]);

  const summary = summarize(trades, account.startingBalance);

  // Har bir hisobning hozirgi kapitali. Tanlagich bilan birga risk
  // foizi ham qayta hisoblanishi kerak: uchta funded hisobda kapital
  // ham, risk qoidasi ham har xil bo'ladi.
  //
  // Faol hisob uchun yuqoridagi natija qayta ishlatiladi — bir xil
  // so'rovni ikki marta yubormaymiz.
  const open = all.filter((a) => !a.isArchived);
  const choices = await Promise.all(
    open.map(async (a) => ({
      id: a.id,
      name: a.name,
      riskPerTradePct: a.riskPerTradePct,
      balance:
        a.id === account.id
          ? summary.balance
          : summarize(await getTrades(a.id), a.startingBalance).balance,
    })),
  );

  return (
    <>
      <Topbar title={d.tradeForm.newTitle} sub={d.tradeForm.newSub} cta={null} />
      <div className="flex grow flex-col p-5 sm:p-[22px] sm:px-[26px]">
        <TradeForm
          action={createTrade}
          setups={setups}
          balance={summary.balance}
          riskPerTradePct={account.riskPerTradePct}
          accounts={choices}
          defaultAccountId={account.id}
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
