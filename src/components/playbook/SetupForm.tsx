'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Card, CardTitle, Field, SelectField, TextArea } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icons';
import type { SetupState } from '@/actions/setups';
import type { SetupRow } from '@/lib/account';
import { useD } from '@/components/i18n/Provider';
import type { Dict } from '@/lib/i18n';

type RuleBlock = {
  name: 'entryRules' | 'exitRules' | 'riskRules';
  title: string;
  icon: IconName;
  color: string;
  placeholder: string;
};

function ruleBlocks(d: Dict): RuleBlock[] {
  return [
    {
      name: 'entryRules',
      title: d.setupForm.entryRules,
      icon: 'up',
      color: 'text-blue',
      placeholder: d.setupForm.entryPlaceholder,
    },
    {
      name: 'exitRules',
      title: d.setupForm.exitRules,
      icon: 'target',
      color: 'text-win',
      placeholder: d.setupForm.exitPlaceholder,
    },
    {
      name: 'riskRules',
      title: d.setupForm.riskRules,
      icon: 'shield',
      color: 'text-amber',
      placeholder: d.setupForm.riskPlaceholder,
    },
  ];
}

export default function SetupForm({
  action,
  setup,
  submitLabel,
}: {
  action: (prev: SetupState, formData: FormData) => Promise<SetupState>;
  setup?: SetupRow;
  submitLabel: string;
}) {
  const d = useD();
  const RULE_BLOCKS = ruleBlocks(d);
  const [state, formAction, pending] = useActionState<SetupState, FormData>(action, {});

  return (
    <form action={formAction} className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
      <div className="flex min-w-0 grow flex-col gap-3.5">
        <Card>
          <CardTitle>{d.setupForm.main}</CardTitle>
          <div className="flex flex-wrap gap-3.5">
            <Field
              label={d.setupForm.name}
              name="name"
              defaultValue={setup?.name ?? ''}
              mono={false}
              required
              className="basis-[240px]"
            />
            <SelectField
              label={d.setupForm.status}
              name="status"
              defaultValue={setup?.status ?? 'ACTIVE'}
              className="basis-[160px]"
            >
              <option value="ACTIVE">{d.playbook.statusActive}</option>
              <option value="TESTING">{d.playbook.statusTesting}</option>
              <option value="ARCHIVED">{d.playbook.statusArchived}</option>
            </SelectField>
            <Field
              label={d.setupForm.timeframes}
              name="timeframes"
              defaultValue={setup?.timeframes.join(', ') ?? ''}
              mono={false}
              hint={d.setupForm.timeframesHint}
              className="basis-[180px]"
            />
            <Field
              label={d.setupForm.sessions}
              name="sessions"
              defaultValue={setup?.sessions.join(', ') ?? ''}
              mono={false}
              hint={d.setupForm.sessionsHint}
              className="basis-[220px]"
            />
          </div>

          <div className="mt-3.5">
            <TextArea
              label={d.setupForm.description}
              name="description"
              rows={3}
              defaultValue={setup?.description ?? ''}
              placeholder={d.setupForm.descriptionHint}
            />
          </div>
        </Card>

        {RULE_BLOCKS.map((block) => (
          <Card key={block.name}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className={block.color}>
                <Icon name={block.icon} size={15} />
              </span>
              <span className="grow text-xs font-bold tracking-[0.06em] text-txt">{block.title}</span>
              <span className="text-[11px] text-txt3">{d.setupForm.ruleHint}</span>
            </div>
            <TextArea
              name={block.name}
              rows={5}
              defaultValue={setup?.[block.name].join('\n') ?? ''}
              placeholder={block.placeholder}
            />
          </Card>
        ))}
      </div>

      <div className="w-full shrink-0 xl:w-[320px]">
        <Card padding="p-4">
          {state.error ? (
            <p role="alert" className="mb-3 rounded-[10px] bg-loss-soft px-3 py-2.5 text-[12px] font-semibold text-loss">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-blued text-[13px] font-bold text-white transition-colors hover:bg-blueh disabled:opacity-60"
          >
            <Icon name="check" size={16} width={2.2} />
            {pending ? d.common.saving : submitLabel}
          </button>

          <Link
            href={setup ? `/playbook?s=${setup.id}` : '/playbook'}
            className="mt-2.5 flex h-10 w-full items-center justify-center rounded-[10px] border border-line bg-card2 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {d.common.cancel}
          </Link>

          <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
            <span className="shrink-0 text-blue">
              <Icon name="target" size={15} />
            </span>
            {d.setupForm.checklistNote}
          </p>
        </Card>
      </div>
    </form>
  );
}
