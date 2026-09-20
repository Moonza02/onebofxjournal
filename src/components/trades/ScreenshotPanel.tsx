'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Card, CardTitle, Chip } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { readScreenshot, type ScreenshotState } from '@/actions/screenshot';
import type { ExtractedTrade } from '@/lib/extract';
import { useD } from '@/components/i18n/Provider';
import type { Dict } from '@/lib/i18n';

function labels(d: Dict): Record<keyof ExtractedTrade, string> {
  return {
    symbol: d.screenshot.fieldSymbol,
    direction: d.screenshot.fieldDirection,
    entryPrice: d.screenshot.fieldEntry,
    stopPrice: d.screenshot.fieldStop,
    takeProfit: d.screenshot.fieldTake,
    exitPrice: d.screenshot.fieldExit,
    volume: d.screenshot.fieldVolume,
    timeframe: d.screenshot.fieldTimeframe,
    openedAt: d.screenshot.fieldOpened,
    closedAt: d.screenshot.fieldClosed,
  };
}

export default function ScreenshotPanel({
  enabled,
  onApply,
  onKeyChange,
  initialKey,
}: {
  enabled: boolean;
  onApply: (fields: ExtractedTrade) => void;
  onKeyChange: (key: string) => void;
  initialKey?: string;
}) {
  const d = useD();
  const LABELS = labels(d);
  const [state, action, pending] = useActionState<ScreenshotState, FormData>(readScreenshot, {});
  const [preview, setPreview] = useState<string | null>(
    initialKey ? `/api/screenshot/${initialKey}` : null,
  );
  const [applied, setApplied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.key) onKeyChange(state.key);
  }, [state.key, onKeyChange]);

  // ⌘V bilan qo'yish — skrinshot olib, to'g'ridan-to'g'ri yopishtirish uchun.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (!file || !file.type.startsWith('image/') || !inputRef.current) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
      setPreview(URL.createObjectURL(file));
      setApplied(false);
      formRef.current?.requestSubmit();
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setApplied(false);
    formRef.current?.requestSubmit();
  }

  const fields = state.fields;
  const readCount = fields
    ? (Object.keys(fields) as (keyof ExtractedTrade)[]).filter((k) => fields[k].value !== null).length
    : 0;

  return (
    <Card>
      <CardTitle
        right={
          enabled ? (
            <Chip tone="blue">{d.screenshot.aiRead}</Chip>
          ) : (
            <Chip tone="neutral">{d.screenshot.saveOnly}</Chip>
          )
        }
      >
        {d.screenshot.title}
      </CardTitle>

      <form ref={formRef} action={action}>
        <input
          ref={inputRef}
          type="file"
          name="screenshot"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="sr-only"
          id="screenshot-input"
        />

        {preview ? (
          <div className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={d.screenshot.uploaded} className="block max-h-[220px] w-full object-cover" />
          </div>
        ) : (
          <label
            htmlFor="screenshot-input"
            className="flex h-[148px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-panel transition-colors hover:border-blue/50"
          >
            <span className="text-[#4A5464]">
              <Icon name="img" size={26} width={1.5} />
            </span>
            <span className="text-[12.5px] font-bold text-txt2">{d.screenshot.pick}</span>
            <span className="text-[11px] text-txt3">{d.screenshot.pickHint}</span>
          </label>
        )}

        <div className="mt-2.5 flex gap-2">
          <label
            htmlFor="screenshot-input"
            className="flex h-8 cursor-pointer items-center rounded-lg border border-line bg-card2 px-3 text-[12px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            {preview ? d.screenshot.another : d.screenshot.choose}
          </label>
          {pending ? (
            <span className="flex h-8 items-center gap-2 rounded-lg bg-blue-soft px-3 text-[12px] font-bold text-bluel">
              {d.screenshot.reading}
            </span>
          ) : null}
        </div>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 rounded-[10px] bg-loss-soft px-3 py-2.5 text-[11.5px] font-semibold text-loss">
          {state.error}
        </p>
      ) : null}

      {state.warnings?.map((w) => (
        <p
          key={w}
          className="mt-2 flex items-start gap-2 rounded-[10px] bg-amber-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-txt2"
        >
          <span className="shrink-0 text-amber">
            <Icon name="shield" size={14} />
          </span>
          {w}
        </p>
      ))}

      {fields ? (
        <div className="mt-3.5 border-t border-line2 pt-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
              {d.screenshot.extracted}
            </span>
            <span className="grow" />
            <Chip tone={readCount > 4 ? 'win' : 'amber'}>
              {readCount} / {Object.keys(LABELS).length}
            </Chip>
          </div>

          <div className="flex flex-col">
            {(Object.keys(LABELS) as (keyof ExtractedTrade)[]).map((key) => {
              const field = fields[key];
              const ok = field.value !== null;
              return (
                <div key={key} className="flex items-center gap-2 border-b border-line2 py-[7px] last:border-b-0">
                  <span className="grow text-[11.5px] text-txt3">{LABELS[key]}</span>
                  <span
                    className={`tnum font-mono text-[12px] font-semibold ${ok ? 'text-txt' : 'text-txt4'}`}
                  >
                    {ok ? String(field.value) : field.confidence === 'low' ? 'shubhali' : '—'}
                  </span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      ok ? 'bg-win' : field.confidence === 'low' ? 'bg-amber' : 'bg-[#2A3240]'
                    }`}
                    title={
                      ok
                        ? d.screenshot.confident
                        : field.confidence === 'low'
                          ? d.screenshot.doubtful
                          : d.screenshot.notRead
                    }
                  />
                </div>
              );
            })}
          </div>

          {state.note ? (
            <p className="mt-2.5 text-[11px] leading-relaxed text-txt3">{state.note}</p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onApply(fields);
              setApplied(true);
            }}
            disabled={readCount === 0}
            className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-blue/40 bg-blue-soft text-[12.5px] font-bold text-bluel transition-colors hover:bg-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="check" size={15} width={2.2} />
            {applied ? d.screenshot.applied : d.screenshot.apply}
          </button>

          <p className="mt-2.5 text-[11px] leading-relaxed text-txt3">
            {d.screenshot.note}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
