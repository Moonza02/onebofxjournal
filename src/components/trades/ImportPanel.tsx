'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Btn, Card, CardTitle, SelectField } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { useD } from '@/components/i18n/Provider';
import { fill, type Dict } from '@/lib/i18n';
import { ImportError, MAX_ROWS, parseFile, type Parsed } from '@/lib/import';
import { decodeBuffer } from '@/lib/import/decode';
import { FIELDS, type Field, type Mapping } from '@/lib/import/fields';
import { mapRows, missingFields, type IssueCode, type RowResult } from '@/lib/import/map';
import type { ImportState } from '@/actions/import';

/** Oldindan ko'rishda nechta qator chiqadi. Qolgani ham saqlanadi —
 *  shunchaki ekranga sig'masligi uchun kesiladi. */
const PREVIEW_ROWS = 40;

const FIELD_LABEL: Record<Field, (d: Dict) => string> = {
  symbol: (d) => d.import.fieldSymbol,
  direction: (d) => d.import.fieldDirection,
  openedAt: (d) => d.import.fieldOpenedAt,
  closedAt: (d) => d.import.fieldClosedAt,
  entryPrice: (d) => d.import.fieldEntryPrice,
  stopPrice: (d) => d.import.fieldStopPrice,
  takeProfit: (d) => d.import.fieldTakeProfit,
  exitPrice: (d) => d.import.fieldExitPrice,
  volume: (d) => d.import.fieldVolume,
  commission: (d) => d.import.fieldCommission,
  swap: (d) => d.import.fieldSwap,
  profit: (d) => d.import.fieldProfit,
  notes: (d) => d.import.fieldNotes,
};

const ISSUE_LABEL: Record<IssueCode, (d: Dict) => string> = {
  missingSymbol: (d) => d.import.issueMissingSymbol,
  badDirection: (d) => d.import.issueBadDirection,
  badOpenedAt: (d) => d.import.issueBadOpenedAt,
  badEntry: (d) => d.import.issueBadEntry,
  badVolume: (d) => d.import.issueBadVolume,
  noStop: (d) => d.import.issueNoStop,
  stopSide: (d) => d.import.issueStopSide,
  stopEqualsEntry: (d) => d.import.issueStopEqualsEntry,
  closedBeforeOpen: (d) => d.import.issueClosedBeforeOpen,
  halfClosed: (d) => d.import.issueHalfClosed,
  duplicate: (d) => d.import.issueDuplicate,
  existing: (d) => d.import.issueExisting,
};

const FILE_ERROR: Record<ImportError['code'], (d: Dict) => string> = {
  empty: (d) => d.import.errEmpty,
  noTable: (d) => d.import.errNoTable,
  noRows: (d) => d.import.errNoRows,
  tooBig: (d) => fill(d.import.errTooBig, { n: MAX_ROWS }),
  badFile: (d) => d.import.errBadFile,
};

export default function ImportPanel({
  action,
}: {
  action: (prev: ImportState, formData: FormData) => Promise<ImportState>;
}) {
  const d = useD();
  const [state, formAction] = useActionState<ImportState, FormData>(action, {});

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [keepStopless, setKeepStopless] = useState(false);
  const [fileError, setFileError] = useState('');
  // Import tugagandan keyin yana yuklash uchun: sahifani qayta
  // yuklamasdan natija kartasi yopiladi.
  const [dismissed, setDismissed] = useState(false);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fayl brauzerda o'qiladi: serverga faqat tasdiqlangandan keyin
  // boradi va oraliqda hech narsa saqlanmaydi.
  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setReading(true);
    setFileError('');
    setParsed(null);

    try {
      // `file.text()` har doim UTF-8 deb o'qiydi — MetaTrader esa
      // terminal kodlashida saqlaydi.
      const text = decodeBuffer(await file.arrayBuffer());
      const result = parseFile(text);
      setParsed(result);
      setMapping(result.mapping);
      setFileName(file.name);
    } catch (error) {
      const code = error instanceof ImportError ? error.code : 'badFile';
      setFileError(FILE_ERROR[code](d));
      setFileName('');
    } finally {
      setReading(false);
      // Bir xil faylni qayta tanlash ham ishlashi uchun.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const missing = useMemo(() => missingFields(mapping), [mapping]);

  const result = useMemo(() => {
    if (!parsed || missing.length > 0) return null;
    return mapRows(parsed.rows, mapping, { keepStopless });
  }, [parsed, mapping, keepStopless, missing.length]);

  function reset() {
    setParsed(null);
    setMapping({});
    setFileName('');
    setFileError('');
  }

  /* --------------------------------------------------------------- tugadi */

  function submit(formData: FormData) {
    setDismissed(false);
    formAction(formData);
  }

  if (state.added !== undefined && !dismissed) {
    return (
      <Card className="border-win/30">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-win-soft text-win">
            <Icon name="check" size={17} width={3} />
          </span>
          <h2 className="font-display text-[16px] font-semibold text-txt">
            {d.import.doneTitle}
          </h2>
        </div>

        <p className="mt-3 text-[13px] text-txt2">
          {fill(d.import.doneAdded, { n: state.added })}
        </p>
        {state.skipped ? (
          <p className="mt-1 text-[12.5px] text-txt3">
            {fill(d.import.doneSkipped, { n: state.skipped })}
          </p>
        ) : null}
        {state.trimmed ? (
          <p className="mt-1 text-[12.5px] text-amber">
            {fill(d.import.doneTrimmed, { n: state.trimmed })}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/trades"
            className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-blued bg-blued px-4 text-[13px] font-bold text-white transition-colors hover:bg-blueh"
          >
            {d.import.doneCta}
            <Icon name="chev" size={14} width={2.4} />
          </Link>
          <Btn
            type="button"
            onClick={() => {
              setDismissed(true);
              reset();
            }}
          >
            {d.import.doneMore}
          </Btn>
        </div>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- fayl */

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <CardTitle>{d.import.pickTitle}</CardTitle>
        <p className="text-[12.5px] leading-relaxed text-txt3">{d.import.pickBody}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-card2 px-4 text-[13px] font-bold text-txt2 transition-colors hover:text-txt">
            <Icon name="dl" size={15} />
            {reading ? d.import.reading : d.import.pickCta}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt,.htm,.html,text/csv,text/html,text/plain"
              className="hidden"
              onChange={onPick}
            />
          </label>

          {parsed ? (
            <>
              <span className="text-[12.5px] text-txt2">
                <span className="text-txt3">{d.import.fileLabel}: </span>
                {fileName} · {fill(d.import.rowsFound, { n: parsed.rows.length })}
              </span>
              <Btn type="button" onClick={reset}>
                {d.import.another}
              </Btn>
            </>
          ) : null}
        </div>

        {fileError ? (
          <p className="mt-3 rounded-[10px] border border-loss/30 bg-loss-soft px-3 py-2 text-[12.5px] text-loss">
            {fileError}
          </p>
        ) : (
          <p className="mt-3 text-[11.5px] text-txt4">{d.import.pickHint}</p>
        )}
      </Card>

      {parsed ? (
        <>
          <Card>
            <CardTitle>{d.import.mapTitle}</CardTitle>
            <p className="text-[12.5px] leading-relaxed text-txt3">{d.import.mapBody}</p>

            <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((field) => (
                <SelectField
                  key={field}
                  label={FIELD_LABEL[field](d)}
                  value={mapping[field] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMapping((prev) => {
                      const next = { ...prev };
                      if (value === '') delete next[field];
                      else next[field] = Number(value);
                      return next;
                    });
                  }}
                >
                  <option value="">{d.import.mapNone}</option>
                  {parsed.headers.map((header, i) => (
                    <option key={`${header}-${i}`} value={i}>
                      {header}
                    </option>
                  ))}
                </SelectField>
              ))}
            </div>

            {missing.length > 0 ? (
              <p className="mt-3.5 rounded-[10px] border border-amber/30 bg-amber-soft px-3 py-2 text-[12.5px] text-amber">
                {fill(d.import.mapMissing, {
                  fields: missing.map((f) => FIELD_LABEL[f](d).replace(' *', '')).join(', '),
                })}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>{d.import.optionsTitle}</CardTitle>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={keepStopless}
                onChange={(e) => setKeepStopless(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#3B82F6]"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-txt">
                  {d.import.keepStopless}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-txt4">
                  {d.import.keepStoplessHint}
                </span>
              </span>
            </label>
          </Card>

          {result ? (
            <Preview
              d={d}
              result={result}
              parsed={parsed}
              mapping={mapping}
              keepStopless={keepStopless}
              formAction={submit}
              error={state.error}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- ko'rinish */

function Preview({
  d,
  result,
  parsed,
  mapping,
  keepStopless,
  formAction,
  error,
}: {
  d: Dict;
  result: ReturnType<typeof mapRows>;
  parsed: Parsed;
  mapping: Mapping;
  keepStopless: boolean;
  formAction: (formData: FormData) => void;
  error?: string;
}) {
  const shown = result.rows.slice(0, PREVIEW_ROWS);

  return (
    <Card>
      <CardTitle>{d.import.previewTitle}</CardTitle>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-win-soft px-2.5 py-1 text-[11.5px] font-bold text-win">
          {fill(d.import.previewReady, { n: result.ready })}
        </span>
        {result.skipped > 0 ? (
          <span className="rounded-full bg-amber-soft px-2.5 py-1 text-[11.5px] font-bold text-amber">
            {fill(d.import.previewSkipped, { n: result.skipped })}
          </span>
        ) : null}
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-line text-[10.5px] font-bold tracking-[0.06em] text-txt3">
              <th className="px-2 py-2 text-left">{d.import.colLine}</th>
              <th className="px-2 py-2 text-left">{d.import.colSymbol}</th>
              <th className="px-2 py-2 text-left">{d.import.colDirection}</th>
              <th className="px-2 py-2 text-left">{d.import.colOpened}</th>
              <th className="px-2 py-2 text-right">{d.import.colEntry}</th>
              <th className="px-2 py-2 text-right">{d.import.colStop}</th>
              <th className="px-2 py-2 text-right">{d.import.colVolume}</th>
              <th className="px-2 py-2 text-left">{d.import.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <Row key={row.line} d={d} row={row} mapping={mapping} />
            ))}
          </tbody>
        </table>
      </div>

      {result.rows.length > shown.length ? (
        <p className="mt-2.5 text-[11.5px] text-txt4">
          {fill(d.import.previewShowing, { n: shown.length })}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-[10px] border border-loss/30 bg-loss-soft px-3 py-2 text-[12.5px] text-loss">
          {error}
        </p>
      ) : null}

      <form action={formAction} className="mt-4">
        {/* Serverga faqat xom qatorlar va moslama boradi — tayyor savdo
            emas. Server hammasini qaytadan tekshiradi. */}
        <input
          type="hidden"
          name="payload"
          value={JSON.stringify({ rows: parsed.rows, mapping, keepStopless })}
        />
        <Submit d={d} disabled={result.ready === 0} />
      </form>
    </Card>
  );
}

/** Jadval qatori.
 *
 *  Qiymatlar fayldan qanday bo'lsa shunday ko'rsatiladi: bu — «men
 *  faylingizdan shuni o'qidim» degani. Ustun noto'g'ri moslangan
 *  bo'lsa ham shu yerda darrov ko'rinadi (masalan, Stop ustunida sana).
 *  O'tkazib yuborilgan qator ham bo'sh qolmaydi.
 */
function Row({ d, row, mapping }: { d: Dict; row: RowResult; mapping: Mapping }) {
  const ok = row.trade !== null;
  const notes = [...row.errors, ...row.warnings].map((code) => ISSUE_LABEL[code](d));

  const raw = (field: Field): string => {
    const index = mapping[field];
    if (index === undefined) return '—';
    return row.raw[index]?.trim() || '—';
  };

  const direction = row.trade?.direction;

  return (
    <tr className={`border-b border-line2 text-[12px] ${ok ? 'text-txt2' : 'text-txt4'}`}>
      <td className="px-2 py-2 font-mono text-txt4">{row.line}</td>
      <td className="px-2 py-2 font-bold uppercase">{raw('symbol')}</td>
      <td className="px-2 py-2">
        {direction ? (
          <span className={direction === 'LONG' ? 'text-win' : 'text-loss'}>{direction}</span>
        ) : (
          raw('direction')
        )}
      </td>
      <td className="px-2 py-2 font-mono tnum whitespace-nowrap">{raw('openedAt')}</td>
      <td className="px-2 py-2 text-right font-mono tnum">{raw('entryPrice')}</td>
      <td className="px-2 py-2 text-right font-mono tnum">{raw('stopPrice')}</td>
      <td className="px-2 py-2 text-right font-mono tnum">{raw('volume')}</td>
      <td className="px-2 py-2">
        <span className={`font-bold ${ok ? 'text-win' : 'text-txt3'}`}>
          {ok ? d.import.statusOk : d.import.statusSkip}
        </span>
        {notes.length > 0 ? (
          <span className="ml-1.5 text-[11px] text-txt4">· {notes.join(', ')}</span>
        ) : null}
      </td>
    </tr>
  );
}

function Submit({ d, disabled }: { d: Dict; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-[42px] items-center gap-2 rounded-[11px] border border-blued bg-blued px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? d.import.submitting : d.import.submit}
      {pending ? null : <Icon name="check" size={14} width={2.6} />}
    </button>
  );
}
