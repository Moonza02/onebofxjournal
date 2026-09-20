'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendCoachMessage, type CoachState } from '@/actions/coach';
import { Icon } from '@/components/ui/icons';
import { MESSAGE_MAX, MOODS, type ChatRow } from '@/lib/coach.types';
import { useD } from '@/components/i18n/Provider';

function Send() {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-blued bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? d.coach.sending : d.coach.send}
      {pending ? null : <Icon name="chev" size={14} width={2.4} />}
    </button>
  );
}

function Bubble({ row }: { row: ChatRow }) {
  const d = useD();
  const mine = row.role === 'USER';
  const mood = MOODS.find((m) => m.key === row.moodTag);

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[560px] rounded-[14px] px-4 py-3 text-[13px] leading-relaxed ${
          mine
            ? 'border border-blue/35 bg-blue-soft text-txt'
            : 'border border-line bg-card2 text-txt2'
        }`}
      >
        {mood ? (
          <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.06em] text-bluel">
            {d.coach[mood.label].toUpperCase()}
          </div>
        ) : null}
        {row.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CoachChat({ rows }: { rows: ChatRow[] }) {
  const d = useD();
  const [state, action] = useActionState<CoachState, FormData>(sendCoachMessage, {});
  const [mood, setMood] = useState('');
  const [text, setText] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Yangi xabar kelganda pastga tushamiz.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [rows.length]);

  // Javob kelgach maydon bo'shaydi; xato bo'lsa matn joyida qoladi.
  useEffect(() => {
    if (state.ok) {
      setText('');
      setMood('');
    }
  }, [state.ok]);

  return (
    <div className="flex min-h-0 grow flex-col gap-3">
      <div className="flex min-h-[260px] grow flex-col gap-3 overflow-y-auto rounded-[14px] border border-line bg-card p-4">
        {rows.length === 0 ? (
          <div className="m-auto max-w-[460px] text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[13px] bg-blue-soft text-bluel">
              <Icon name="brain" size={20} />
            </div>
            <div className="text-[13.5px] font-bold text-txt2">{d.coach.emptyTitle}</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-txt3">{d.coach.emptyBody}</p>
          </div>
        ) : (
          rows.map((row) => <Bubble key={row.id} row={row} />)
        )}
        <div ref={endRef} />
      </div>

      {state.error ? (
        <div className="rounded-[11px] border border-amber/35 bg-amber-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-amber">
          {state.error}
        </div>
      ) : null}

      <form ref={formRef} action={action} className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => {
            const on = mood === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMood(on ? '' : m.key)}
                className={`h-[30px] cursor-pointer rounded-[8px] border px-2.5 text-[11.5px] font-semibold transition-colors ${
                  on
                    ? 'border-blue bg-blue-soft text-txt'
                    : 'border-line bg-card2 text-txt3 hover:text-txt2'
                }`}
              >
                {d.coach[m.label]}
              </button>
            );
          })}
        </div>

        <input type="hidden" name="mood" value={mood} />

        <div className="flex items-end gap-2.5">
          <textarea
            name="message"
            rows={3}
            maxLength={MESSAGE_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder={d.coach.placeholder}
            className="box-border w-full grow resize-none rounded-[11px] border border-line bg-card2 px-3.5 py-3 text-[13px] leading-relaxed text-txt outline-none transition-colors focus:border-blue"
          />
          <Send />
        </div>
        <div className="text-[10.5px] text-txt4">
          {d.coach.sendHint}
        </div>
      </form>
    </div>
  );
}
