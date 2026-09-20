'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addNote, type MentorState } from '@/actions/mentor';
import { Icon } from '@/components/ui/icons';
import { NOTE_MAX } from '@/lib/mentor.types';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';

export type ThreadNote = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  mine: boolean;
  trade: { symbol: string; direction: string; when: string } | null;
};

function Send() {
  const d = useD();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-blued bg-blued px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? d.mentor.writing : d.mentor.write}
      {pending ? null : <Icon name="chev" size={14} width={2.4} />}
    </button>
  );
}

export default function NoteThread({
  mentorshipId,
  notes,
  attachTrade,
  placeholder,
}: {
  mentorshipId: string;
  notes: ThreadNote[];
  /** Savdoga bog'lanadigan izoh — savdolar jadvalidan tanlangani. */
  attachTrade: { id: string; label: string } | null;
  placeholder: string;
}) {
  const d = useD();
  const [state, action] = useActionState<MentorState, FormData>(addNote, {});
  const [text, setText] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [notes.length]);

  useEffect(() => {
    if (state.ok) setText('');
  }, [state.ok]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex max-h-[420px] min-h-[160px] flex-col gap-2.5 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="m-auto max-w-[360px] text-center text-[12px] leading-relaxed text-txt3">
            {d.mentor.notesEmpty}
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`flex ${note.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[520px] rounded-[13px] px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  note.mine
                    ? 'border border-blue/35 bg-blue-soft text-txt'
                    : 'border border-line bg-card2 text-txt2'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-[10.5px] font-bold text-txt3">
                  <span>{note.mine ? d.mentor.you : note.authorName}</span>
                  <span className="text-txt4">{note.createdAt}</span>
                </div>

                {note.trade ? (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-[7px] bg-[#151A22] px-2 py-[3px] font-mono text-[11px] font-bold text-bluel">
                    <Icon name="list" size={11} width={2.4} />
                    {note.trade.symbol} {note.trade.direction} · {note.trade.when}
                  </div>
                ) : null}

                {note.body.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {state.error ? (
        <div className="rounded-[10px] border border-loss/35 bg-loss-soft px-3 py-2 text-[12px] text-loss">
          {state.error}
        </div>
      ) : null}

      <form ref={formRef} action={action} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={mentorshipId} />
        {attachTrade ? <input type="hidden" name="tradeId" value={attachTrade.id} /> : null}

        {attachTrade ? (
          <div className="flex items-center gap-2 rounded-[9px] border border-blue/35 bg-blue-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-bluel">
            <Icon name="link" size={12} />
            {fill(d.mentor.attachedTo, { label: attachTrade.label })}
          </div>
        ) : null}

        <div className="flex items-end gap-2.5">
          <textarea
            name="body"
            rows={3}
            maxLength={NOTE_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder={placeholder}
            className="box-border w-full grow resize-none rounded-[11px] border border-line bg-card2 px-3.5 py-3 text-[13px] leading-relaxed text-txt outline-none transition-colors focus:border-blue"
          />
          <Send />
        </div>
      </form>
    </div>
  );
}
