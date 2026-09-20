import Topbar from '@/components/ui/Topbar';
import { Bar, Btn, Card, CardTitle, Chip, KeyValue } from '@/components/ui/primitives';
import AccountForm from '@/components/accounts/AccountForm';
import TimezoneForm from '@/components/accounts/TimezoneForm';
import { activateAccount, createAccount } from '@/actions/accounts';
import { getAccounts, getActiveAccount, getTrades } from '@/lib/account';
import { programShort } from '@/lib/i18n/labels';
import { money, num, pct, signedMoney } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { getDict } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const { user, account } = await getActiveAccount();
  const d = await getDict(user.locale);
  const [accounts, trades] = await Promise.all([getAccounts(user.id), getTrades(account.id)]);

  const summary = summarize(trades, account.startingBalance);
  const growth =
    account.startingBalance > 0 ? (summary.netPnl / account.startingBalance) * 100 : 0;
  const ddRatio =
    account.maxDrawdownPct > 0 ? (summary.maxDrawdownPct / account.maxDrawdownPct) * 100 : 0;
  const targetRatio = account.profitTargetPct > 0 ? (growth / account.profitTargetPct) * 100 : 0;

  return (
    <>
      <Topbar title={d.accounts.title} sub={fill(d.accounts.sub, { n: accounts.length })} cta={null} />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px]">
        <div className="grid gap-3.5 lg:grid-cols-3">
          {accounts.map((a) => {
            const on = a.id === account.id;
            return (
              <Card key={a.id} className={on ? 'border-blue' : ''}>
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 grow">
                    <div className="truncate text-[13.5px] font-bold text-txt">{a.name}</div>
                    <div className="truncate text-[11px] text-txt3">
                      {a.broker || d.accounts.noBroker}
                    </div>
                  </div>
                  <Chip tone={on ? 'win' : 'neutral'}>
                    {on ? d.accounts.active : d.accounts.inactive}
                  </Chip>
                </div>

                <div className="tnum mt-4 font-mono text-2xl font-semibold text-txt">
                  {money(on ? summary.balance : a.startingBalance)}
                </div>
                <div
                  className={`tnum mt-1 font-mono text-[12.5px] font-bold ${
                    on && summary.netPnl >= 0 ? 'text-win' : on ? 'text-loss' : 'text-txt3'
                  }`}
                >
                  {on
                    ? signedMoney(summary.netPnl)
                    : fill(d.accounts.startingBalance, { amount: money(a.startingBalance) })}
                </div>

                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line2 pt-3">
                  <Chip tone="blue">{programShort(a.program, d)}</Chip>
                  <Chip tone="neutral">
                    {fill(d.accounts.daily, { pct: pct(a.dailyLossPct, 0) })}
                  </Chip>
                  <Chip tone="neutral">DD {pct(a.maxDrawdownPct, 0)}</Chip>
                </div>

                {!on ? (
                  <form action={activateAccount} className="mt-3">
                    <input type="hidden" name="id" value={a.id} />
                    <Btn type="submit" className="w-full">
                      {d.accounts.switchTo}
                    </Btn>
                  </form>
                ) : null}
              </Card>
            );
          })}

          <form action={createAccount}>
            <Card className="flex h-full flex-col justify-center border-dashed">
              <input
                name="name"
                placeholder={d.accounts.newName}
                className="mb-3 h-10 w-full rounded-[10px] border border-line bg-card2 px-3 text-[13px] text-txt outline-none focus:border-blue"
              />
              <Btn type="submit" icon="plus" className="w-full">
                {d.accounts.addAccount}
              </Btn>
            </Card>
          </form>
        </div>

        <div className="flex flex-col gap-3.5 xl:flex-row">
          <div className="min-w-0 grow">
            <AccountForm
              account={{
                id: account.id,
                name: account.name,
                broker: account.broker,
                startingBalance: account.startingBalance,
                program: account.program,
                dailyLossPct: account.dailyLossPct,
                maxDrawdownPct: account.maxDrawdownPct,
                profitTargetPct: account.profitTargetPct,
                riskPerTradePct: account.riskPerTradePct,
              }}
            />
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[360px]">
            <TimezoneForm current={user.timezone} />

            <Card>
              <CardTitle>{d.accounts.limitsState}</CardTitle>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="text-txt3">{d.accounts.totalDrawdown}</span>
                  <span className="font-mono font-semibold text-txt2">
                    {pct(summary.maxDrawdownPct)} / {pct(account.maxDrawdownPct, 0)}
                  </span>
                </div>
                <Bar value={ddRatio} tone={ddRatio >= 80 ? 'loss' : ddRatio >= 50 ? 'amber' : 'blue'} />
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="text-txt3">{d.accounts.profitTarget}</span>
                  <span className="font-mono font-semibold text-txt2">
                    {pct(growth)} / {pct(account.profitTargetPct, 0)}
                  </span>
                </div>
                <Bar value={Math.max(0, targetRatio)} tone="win" />
              </div>

              <div className="border-t border-line2 pt-3">
                <KeyValue label={d.accounts.closedTrades} value={String(summary.count)} />
                <KeyValue
                  label={d.accounts.profitFactor}
                  value={summary.profitFactor === null ? '∞' : num(summary.profitFactor, 2)}
                />
                <KeyValue
                  label={d.accounts.maxDrawdown}
                  value={summary.maxDrawdown > 0 ? `−${money(summary.maxDrawdown)}` : '—'}
                  tone="loss"
                />
                <KeyValue
                  label={d.accounts.compliance}
                  value={pct(summary.ruleCompliance, 0)}
                  tone="win"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
