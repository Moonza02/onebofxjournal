'use client';

import { useActionState, useState } from 'react';
import { Card, CardTitle, Field, SelectField } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { updateAccount, type AccountFormState } from '@/actions/accounts';
import { useD } from '@/components/i18n/Provider';

const PRESETS = {
  HYPER_GROWTH: { label: 'The5ers — Hyper Growth', daily: 3, max: 6, target: 10 },
  HIGH_STAKES: { label: 'The5ers — High Stakes', daily: 5, max: 10, target: 8 },
  BOOTCAMP: { label: 'The5ers — Bootcamp', daily: 0, max: 5, target: 6 },
  CUSTOM: { label: '', daily: 3, max: 6, target: 10 },
} as const;

type ProgramKey = keyof typeof PRESETS;

export default function AccountForm({
  account,
}: {
  account: {
    id: string;
    name: string;
    broker: string;
    startingBalance: number;
    program: ProgramKey;
    dailyLossPct: number;
    maxDrawdownPct: number;
    profitTargetPct: number;
    riskPerTradePct: number;
  };
}) {
  const d = useD();
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateAccount.bind(null, account.id),
    {},
  );

  const [program, setProgram] = useState<ProgramKey>(account.program);
  const [daily, setDaily] = useState(String(account.dailyLossPct));
  const [max, setMax] = useState(String(account.maxDrawdownPct));
  const [target, setTarget] = useState(String(account.profitTargetPct));

  function pickProgram(next: ProgramKey) {
    setProgram(next);
    if (next !== 'CUSTOM') {
      setDaily(String(PRESETS[next].daily));
      setMax(String(PRESETS[next].max));
      setTarget(String(PRESETS[next].target));
    }
  }

  return (
    <form action={action}>
      <Card>
        <CardTitle>{d.accounts.settings}</CardTitle>

        <div className="flex flex-wrap gap-3.5">
          <Field
            label={d.accounts.fieldName}
            name="name"
            defaultValue={account.name}
            mono={false}
            required
          />
          <Field label={d.accounts.fieldBroker} name="broker" defaultValue={account.broker} mono={false} />
          <Field
            label={d.accounts.fieldBalance}
            name="startingBalance"
            inputMode="decimal"
            defaultValue={String(account.startingBalance)}
            required
          />
        </div>

        <div className="mt-3.5 border-t border-line2 pt-3.5">
          <div className="flex flex-wrap gap-3.5">
            <SelectField
              label={d.accounts.fieldProgram}
              name="program"
              value={program}
              onChange={(e) => pickProgram(e.target.value as ProgramKey)}
              className="basis-[230px]"
            >
              {(Object.keys(PRESETS) as ProgramKey[]).map((k) => (
                <option key={k} value={k}>
                  {k === 'CUSTOM' ? d.accounts.programCustom : PRESETS[k].label}
                </option>
              ))}
            </SelectField>

            <Field
              label={d.accounts.fieldDaily}
              name="dailyLossPct"
              inputMode="decimal"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className="basis-[140px]"
            />
            <Field
              label={d.accounts.fieldDrawdown}
              name="maxDrawdownPct"
              inputMode="decimal"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="basis-[160px]"
            />
            <Field
              label={d.accounts.fieldTarget}
              name="profitTargetPct"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="basis-[150px]"
            />
            <Field
              label={d.accounts.fieldRisk}
              name="riskPerTradePct"
              inputMode="decimal"
              defaultValue={String(account.riskPerTradePct)}
              className="basis-[140px]"
            />
          </div>

          <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
            <span className="shrink-0 text-blue">
              <Icon name="shield" size={15} />
            </span>
            {d.accounts.presetNote}
          </p>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:opacity-60"
          >
            <Icon name="check" size={15} width={2.2} />
            {pending ? d.common.saving : d.common.save}
          </button>

          {state.ok ? (
            <span className="text-[12px] font-semibold text-win">{d.accounts.saved}</span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-[12px] font-semibold text-loss">
              {state.error}
            </span>
          ) : null}
        </div>
      </Card>
    </form>
  );
}
