'use client';

import { useActionState } from 'react';
import { Card, CardTitle, Chip, SelectField, TextArea } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icons';
import { saveJournalEntry, type JournalState } from '@/actions/journal';
import type { JournalEntryRow } from '@/lib/journal';
import { useD } from '@/components/i18n/Provider';
import type { Dict } from '@/lib/i18n';

const RATINGS = [
  { name: 'discipline', key: 'discipline' },
  { name: 'patience', key: 'patience' },
  { name: 'focus', key: 'focus' },
  { name: 'stress', key: 'stress' },
] as const;

/** Odat yorliqlari bazada o'zbekcha saqlanadi (ular yozuvning bir qismi),
 *  shuning uchun ko'rsatishda tartib raqami bo'yicha tarjima qilinadi.
 */
function habitLabel(d: Dict, index: number): string {
  const keys = ['habit1', 'habit2', 'habit3', 'habit4', 'habit5'] as const;
  return d.journal[keys[index]] ?? '';
}

type Block = {
  name: 'plan' | 'notes' | 'review';
  title: string;
  icon: IconName;
  color: string;
  placeholder: string;
};

function blocks(d: Dict): Block[] {
  return [
    {
      name: 'plan',
      title: d.journal.plan,
      icon: 'target',
      color: 'text-blue',
      placeholder: d.journal.planHint,
    },
    {
      name: 'notes',
      title: d.journal.notes,
      icon: 'pen',
      color: 'text-txt2',
      placeholder: d.journal.notesHint,
    },
    {
      name: 'review',
      title: d.journal.review,
      icon: 'brain',
      color: 'text-win',
      placeholder: d.journal.reviewHint,
    },
  ];
}

export default function JournalEditor({
  dateKey,
  title,
  entry,
  habits,
  dayPnl,
  tradeCount,
}: {
  dateKey: string;
  title: string;
  entry: JournalEntryRow | null;
  habits: string[];
  dayPnl: string;
  tradeCount: number;
}) {
  const d = useD();
  const BLOCKS = blocks(d);
  const [state, action, pending] = useActionState<JournalState, FormData>(saveJournalEntry, {});

  return (
    <form action={action} className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
      <input type="hidden" name="date" value={dateKey} />

      <div className="flex min-w-0 grow flex-col gap-3.5">
        <Card padding="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-txt">{title}</h2>
              <p className="mt-1 text-[11.5px] text-txt3">
                {tradeCount} savdo · natija {dayPnl}
              </p>
            </div>
            <span className="grow" />
            {entry ? <Chip tone="win" icon="check">{d.journal.hasEntry}</Chip> : <Chip tone="neutral">{d.journal.newEntry}</Chip>}
          </div>

          <div className="flex flex-col gap-5">
            {BLOCKS.map((b) => (
              <div key={b.name} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={b.color}>
                    <Icon name={b.icon} size={15} />
                  </span>
                  <span className="text-xs font-bold tracking-[0.06em] text-txt">{b.title}</span>
                </div>
                <TextArea
                  name={b.name}
                  rows={b.name === 'notes' ? 5 : 4}
                  defaultValue={entry?.[b.name] ?? ''}
                  placeholder={b.placeholder}
                />
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-amber">
                  <Icon name="flame" size={15} />
                </span>
                <span className="text-xs font-bold tracking-[0.06em] text-txt">{d.journal.lessons}</span>
                <span className="text-[11px] text-txt3">— har bir xulosa alohida qatorda</span>
              </div>
              <TextArea
                name="lessons"
                rows={4}
                defaultValue={entry?.lessons.join('\n') ?? ''}
                placeholder={d.journal.lessonsHint}
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{d.journal.tags}</span>
              <input
                name="tags"
                defaultValue={entry?.tags.join(', ') ?? ''}
                placeholder={d.journal.tagsHint}
                className="box-border h-10 w-full rounded-[10px] border border-line bg-card2 px-3 text-[13px] text-txt outline-none transition-colors focus:border-blue"
              />
            </label>
          </div>
        </Card>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[320px]">
        <Card>
          <CardTitle>{d.journal.moodTitle}</CardTitle>
          <div className="flex flex-col gap-2">
            {RATINGS.map((r) => (
              <div key={r.name} className="flex items-center gap-2.5">
                <span className="w-[72px] shrink-0 text-xs text-txt3">{d.journal[r.key]}</span>
                <SelectField label="" name={r.name} defaultValue={entry?.[r.name] ?? ''} className="grow">
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </SelectField>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{d.journal.habits}</CardTitle>
          <div className="flex flex-col">
            {habits.map((habit, i) => {
              const done = entry?.habitsDone.includes(habit) ?? false;
              return (
                <label key={habit} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
                  <input
                    type="checkbox"
                    name={`habit-${i}`}
                    defaultChecked={done}
                    className="peer sr-only"
                  />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#1B212B] text-[#3C4553] peer-checked:bg-win-soft peer-checked:text-win">
                    <Icon name="check" size={12} width={2.6} />
                  </span>
                  <span className="grow text-[12.5px] font-medium text-txt2">{habitLabel(d, i)}</span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card padding="p-4">
          {state.error ? (
            <p role="alert" className="mb-3 rounded-[10px] bg-loss-soft px-3 py-2.5 text-[12px] font-semibold text-loss">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="mb-3 rounded-[10px] bg-win-soft px-3 py-2.5 text-[12px] font-semibold text-win">
              {d.journal.saved}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-blued text-[13px] font-bold text-white transition-colors hover:bg-blueh disabled:opacity-60"
          >
            <Icon name="check" size={16} width={2.2} />
            {pending ? d.common.saving : d.journal.save}
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-txt3">
            {d.journal.oneNote}
          </p>
        </Card>
      </div>
    </form>
  );
}
