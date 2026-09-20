'use client';

import { useActionState } from 'react';
import { Card, CardTitle, SelectField } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { updateTimezone, type SettingsState } from '@/actions/settings';
import { TIMEZONES } from '@/lib/tz';
import { useD } from '@/components/i18n/Provider';

export default function TimezoneForm({ current }: { current: string }) {
  const d = useD();
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateTimezone, {});
  const known = TIMEZONES.includes(current);

  return (
    <form action={action}>
      <Card>
        <CardTitle>{d.accounts.timezone}</CardTitle>

        <SelectField label={d.accounts.timezoneField} name="timezone" defaultValue={current}>
          {!known ? <option value={current}>{current}</option> : null}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </SelectField>

        <p className="mt-3 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
          <span className="shrink-0 text-blue">
            <Icon name="clock" size={15} />
          </span>
          {d.accounts.timezoneNote}
        </p>

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
