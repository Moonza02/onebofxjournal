'use client';

import { useActionState, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardTitle,
  Chip,
  Field,
  KeyValue,
  SelectField,
  TextArea,
} from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import ScreenshotPanel from './ScreenshotPanel';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';
import { DEFAULT_INSTRUMENTS, SESSIONS, TIMEFRAMES, specFor } from '@/lib/instruments';
import { money, num, pct } from '@/lib/format';
import type { TradeFormState } from '@/actions/trades';
import type { ExtractedTrade } from '@/lib/extract';

export type SetupChoice = { id: string; name: string; entryRules: string[] };

export type TradeFormValues = {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt: string;
  entryPrice: string;
  stopPrice: string;
  takeProfit: string;
  exitPrice: string;
  volume: string;
  commission: string;
  swap: string;
  pnlOverride: string;
  setupId: string;
  session: string;
  timeframe: string;
  tags: string;
  notes: string;
  discipline: string;
  patience: string;
  confidence: string;
  stress: string;
  screenshotKey: string;
  isBacktest: boolean;
  checks: { label: string; passed: boolean }[];
};

const RATINGS = [
  { name: 'discipline', key: 'discipline' },
  { name: 'patience', key: 'patience' },
  { name: 'confidence', key: 'confidence' },
  { name: 'stress', key: 'stress' },
] as const;

function toNumber(value: string): number {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** AI qaytargan ISO satrni datetime-local inputga moslaydi. */
function toLocalInputValue(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return '';
  const [, y, m, d, hh, mm] = match;
  return `${y}-${m}-${d}T${hh ?? '00'}:${mm ?? '00'}`;
}

export default function TradeForm({
  action,
  initial,
  setups,
  balance,
  riskPerTradePct,
  submitLabel,
  cancelHref,
  screenshotEnabled,
}: {
  action: (prev: TradeFormState, formData: FormData) => Promise<TradeFormState>;
  initial: TradeFormValues;
  setups: SetupChoice[];
  balance: number;
  riskPerTradePct: number;
  submitLabel: string;
  cancelHref: string;
  screenshotEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<TradeFormState, FormData>(action, {});
  const d = useD();
  const [v, setV] = useState<TradeFormValues>(initial);

  const set = useCallback(
    <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) =>
      setV((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const spec = useMemo(() => specFor(v.symbol), [v.symbol]);

  /** Setup tanlanganda checklist uning kirish qoidalaridan to'ldiriladi. */
  function pickSetup(setupId: string) {
    const setup = setups.find((s) => s.id === setupId);
    setV((prev) => ({
      ...prev,
      setupId,
      checks:
        setup && setup.entryRules.length > 0
          ? setup.entryRules.map((label) => ({ label, passed: false }))
          : prev.checks,
    }));
  }

  const applyExtraction = useCallback((fields: ExtractedTrade) => {
    setV((prev) => {
      const next = { ...prev };
      if (fields.symbol.value) next.symbol = fields.symbol.value;
      if (fields.direction.value) next.direction = fields.direction.value;
      if (fields.entryPrice.value !== null) next.entryPrice = String(fields.entryPrice.value);
      if (fields.stopPrice.value !== null) next.stopPrice = String(fields.stopPrice.value);
      if (fields.takeProfit.value !== null) next.takeProfit = String(fields.takeProfit.value);
      if (fields.exitPrice.value !== null) next.exitPrice = String(fields.exitPrice.value);
      if (fields.volume.value !== null) next.volume = String(fields.volume.value);
      if (fields.timeframe.value) next.timeframe = fields.timeframe.value.toUpperCase();
      if (fields.openedAt.value) {
        const local = toLocalInputValue(fields.openedAt.value);
        if (local) next.openedAt = local;
      }
      if (fields.closedAt.value) {
        const local = toLocalInputValue(fields.closedAt.value);
        if (local) next.closedAt = local;
      }
      return next;
    });
  }, []);

  const calc = useMemo(() => {
    const e = toNumber(v.entryPrice);
    const s = toNumber(v.stopPrice);
    const t = toNumber(v.takeProfit);
    const vol = toNumber(v.volume);

    const pips = spec.pipSize > 0 ? Math.abs(e - s) / spec.pipSize : 0;
    const risk = pips * spec.pipValuePerLot * vol;
    const riskPct = balance > 0 ? (risk / balance) * 100 : 0;
    const rr = Math.abs(e - s) > 0 && t > 0 ? Math.abs(t - e) / Math.abs(e - s) : 0;

    const targetRisk = (balance * riskPerTradePct) / 100;
    const suggested = pips > 0 ? targetRisk / (pips * spec.pipValuePerLot) : 0;

    return { pips, risk, riskPct, rr, reward: risk * rr, suggested };
  }, [v.entryPrice, v.stopPrice, v.takeProfit, v.volume, spec, balance, riskPerTradePct]);

  const entryNum = toNumber(v.entryPrice);
  const stopNum = toNumber(v.stopPrice);
  const stopWarning =
    entryNum !== 0 &&
    stopNum !== 0 &&
    ((v.direction === 'LONG' && stopNum > entryNum) ||
      (v.direction === 'SHORT' && stopNum < entryNum));

  function toggleCheck(index: number) {
    setV((prev) => ({
      ...prev,
      checks: prev.checks.map((c, i) => (i === index ? { ...c, passed: !c.passed } : c)),
    }));
  }

  return (
    <form action={formAction} className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
      <div className="flex min-w-0 grow flex-col gap-3.5">
        <Card>
          <CardTitle
            right={<span className="text-[11px] text-txt3">{d.tradeForm.requiredNote}</span>}
          >
            {d.tradeForm.step1}
          </CardTitle>

          <div className="flex flex-wrap items-end gap-3.5">
            <SelectField
              label={d.tradeForm.instrument}
              name="symbol"
              value={v.symbol}
              onChange={(e) => set('symbol', e.target.value)}
              className="grow-0 basis-[170px]"
            >
              {DEFAULT_INSTRUMENTS.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol}
                </option>
              ))}
              {DEFAULT_INSTRUMENTS.every((i) => i.symbol !== v.symbol) && v.symbol ? (
                <option value={v.symbol}>{v.symbol}</option>
              ) : null}
            </SelectField>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
                {d.tradeForm.direction}
              </span>
              <div className="inline-flex gap-[3px] rounded-[10px] border border-line bg-card2 p-[3px]">
                {(['LONG', 'SHORT'] as const).map((dir) => {
                  const on = v.direction === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => set('direction', dir)}
                      className={`h-8 cursor-pointer rounded-lg px-4 text-[12.5px] font-bold transition-colors ${
                        on
                          ? dir === 'LONG'
                            ? 'bg-win-soft text-win'
                            : 'bg-loss-soft text-loss'
                          : 'text-txt2'
                      }`}
                    >
                      {dir === 'LONG' ? d.trades.long : d.trades.short}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="direction" value={v.direction} />
            </div>

            <Field
              label={d.tradeForm.openedAt}
              name="openedAt"
              type="datetime-local"
              value={v.openedAt}
              onChange={(e) => set('openedAt', e.target.value)}
              required
              className="grow-0 basis-[210px]"
            />
            <Field
              label={d.tradeForm.closedAt}
              name="closedAt"
              type="datetime-local"
              value={v.closedAt}
              onChange={(e) => set('closedAt', e.target.value)}
              hint={d.tradeForm.closedHint}
              className="grow-0 basis-[210px]"
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
                {d.tradeForm.mode}
              </span>
              <div className="inline-flex gap-[3px] rounded-[10px] border border-line bg-card2 p-[3px]">
                {[
                  { value: false, label: d.tradeForm.modeReal },
                  { value: true, label: d.tradeForm.modeBacktest },
                ].map((mode) => (
                  <button
                    key={String(mode.value)}
                    type="button"
                    onClick={() => set('isBacktest', mode.value)}
                    className={`h-8 cursor-pointer rounded-lg px-3.5 text-[12.5px] font-bold transition-colors ${
                      v.isBacktest === mode.value ? 'bg-blue-soft text-bluel' : 'text-txt2'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {v.isBacktest ? (
                <input type="hidden" name="isBacktest" value="on" />
              ) : null}
            </div>
          </div>

          {v.isBacktest ? (
            <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
              <span className="shrink-0 text-blue">
                <Icon name="book" size={15} />
              </span>
              {d.tradeForm.backtestNote}
            </p>
          ) : null}
        </Card>

        <Card>
          <CardTitle>{d.tradeForm.step2}</CardTitle>
          <div className="flex flex-wrap gap-3.5">
            <Field
              label={d.tradeForm.entry}
              name="entryPrice"
              inputMode="decimal"
              value={v.entryPrice}
              onChange={(e) => set('entryPrice', e.target.value)}
              required
              className="basis-[140px]"
            />
            <Field
              label={d.tradeForm.stopLoss}
              name="stopPrice"
              inputMode="decimal"
              value={v.stopPrice}
              onChange={(e) => set('stopPrice', e.target.value)}
              required
              hint={calc.pips > 0 ? `${num(calc.pips, 1)} punkt` : undefined}
              className="basis-[140px]"
            />
            <Field
              label={d.tradeForm.takeProfit}
              name="takeProfit"
              inputMode="decimal"
              value={v.takeProfit}
              onChange={(e) => set('takeProfit', e.target.value)}
              hint={calc.rr > 0 ? fill(d.tradeForm.rrHint, { rr: num(calc.rr, 2) }) : undefined}
              className="basis-[140px]"
            />
            <Field
              label={d.tradeForm.exit}
              name="exitPrice"
              inputMode="decimal"
              value={v.exitPrice}
              onChange={(e) => set('exitPrice', e.target.value)}
              className="basis-[140px]"
            />
            <Field
              label={d.tradeForm.volume}
              name="volume"
              inputMode="decimal"
              value={v.volume}
              onChange={(e) => set('volume', e.target.value)}
              required
              className="basis-[120px]"
            />
          </div>

          {stopWarning ? (
            <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-loss-soft p-3 text-[11.5px] leading-relaxed text-txt2">
              <span className="shrink-0 text-loss">
                <Icon name="x" size={15} />
              </span>
              {v.direction === 'LONG' ? d.tradeForm.stopWarnLong : d.tradeForm.stopWarnShort}
            </p>
          ) : null}

          <div className="mt-3.5 flex flex-wrap gap-3.5 border-t border-line2 pt-3.5">
            <Field
              label={d.tradeForm.commission}
              name="commission"
              inputMode="decimal"
              value={v.commission}
              onChange={(e) => set('commission', e.target.value)}
              className="basis-[130px]"
            />
            <Field
              label={d.tradeForm.swap}
              name="swap"
              inputMode="decimal"
              value={v.swap}
              onChange={(e) => set('swap', e.target.value)}
              className="basis-[130px]"
            />
            <Field
              label={d.tradeForm.brokerPnl}
              name="pnlOverride"
              inputMode="decimal"
              value={v.pnlOverride}
              onChange={(e) => set('pnlOverride', e.target.value)}
              hint={d.tradeForm.brokerPnlHint}
              className="basis-[220px]"
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{d.tradeForm.step3}</CardTitle>
          <div className="flex flex-wrap gap-3.5">
            <SelectField
              label={d.tradeForm.setup}
              name="setupId"
              value={v.setupId}
              onChange={(e) => pickSetup(e.target.value)}
              hint={d.tradeForm.setupHint}
              className="basis-[200px]"
            >
              <option value="">— tanlanmagan —</option>
              {setups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={d.tradeForm.session}
              name="session"
              value={v.session}
              onChange={(e) => set('session', e.target.value)}
              className="basis-[150px]"
            >
              <option value="">— avtomatik —</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={d.tradeForm.timeframe}
              name="timeframe"
              value={v.timeframe}
              onChange={(e) => set('timeframe', e.target.value)}
              className="basis-[130px]"
            >
              <option value="">—</option>
              {TIMEFRAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {TIMEFRAMES.every((t) => t !== v.timeframe) && v.timeframe ? (
                <option value={v.timeframe}>{v.timeframe}</option>
              ) : null}
            </SelectField>
            <Field
              label={d.tradeForm.tags}
              name="tags"
              value={v.tags}
              onChange={(e) => set('tags', e.target.value)}
              mono={false}
              hint={d.tradeForm.tagsHint}
              className="basis-[240px]"
            />
          </div>
        </Card>

        <Card>
          <CardTitle
            right={
              <Chip tone={v.checks.every((c) => c.passed) ? 'win' : 'amber'}>
                {v.checks.filter((c) => c.passed).length}/{v.checks.length}
              </Chip>
            }
          >
            {d.tradeForm.step4}
          </CardTitle>

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 grow">
              {v.checks.map((check, i) => (
                <label key={check.label} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
                  <input type="hidden" name="checkLabel" value={check.label} />
                  <input
                    type="checkbox"
                    name={`checkPassed-${i}`}
                    checked={check.passed}
                    onChange={() => toggleCheck(i)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      check.passed ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss'
                    }`}
                  >
                    <Icon name={check.passed ? 'check' : 'x'} size={12} width={2.6} />
                  </span>
                  <span
                    className={`grow text-[12.5px] font-medium ${check.passed ? 'text-txt2' : 'text-txt'}`}
                  >
                    {check.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="w-full shrink-0 lg:w-[300px]">
              {RATINGS.map((r) => (
                <div key={r.name} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-[84px] shrink-0 text-xs text-txt3">
                    {d.tradeForm[r.key]}
                  </span>
                  <SelectField
                    label=""
                    name={r.name}
                    value={v[r.name]}
                    onChange={(e) => set(r.name, e.target.value)}
                    className="grow"
                  >
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
          </div>
        </Card>

        <Card>
          <CardTitle>{d.tradeForm.step5}</CardTitle>
          <TextArea
            name="notes"
            rows={4}
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={d.tradeForm.notesHint}
          />
        </Card>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[336px]">
        <ScreenshotPanel
          enabled={screenshotEnabled}
          onApply={applyExtraction}
          onKeyChange={(key) => set('screenshotKey', key)}
          initialKey={initial.screenshotKey || undefined}
        />
        <input type="hidden" name="screenshotKey" value={v.screenshotKey} />

        <Card>
          <CardTitle>{d.tradeForm.liveAccount}</CardTitle>
          <KeyValue label={d.tradeForm.stopDistance} value={`${num(calc.pips, 1)} punkt`} />
          <KeyValue label={d.tradeForm.riskMoney} value={money(calc.risk)} tone="amber" />
          <KeyValue
            label={d.tradeForm.riskOfAccount}
            value={pct(calc.riskPct, 2)}
            tone={calc.riskPct > riskPerTradePct ? 'loss' : 'amber'}
          />
          <KeyValue label={d.tradeForm.rr} value={calc.rr > 0 ? `1 : ${num(calc.rr, 2)}` : '—'} tone="win" />
          <KeyValue
            label={d.tradeForm.potentialProfit}
            value={calc.reward > 0 ? `+${money(calc.reward)}` : '—'}
            tone="win"
          />
          <KeyValue label={d.tradeForm.potentialLoss} value={`−${money(calc.risk)}`} tone="loss" />

          {calc.suggested > 0 ? (
            <div className="mt-3.5 rounded-[11px] bg-blue-soft p-3">
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 text-blue">
                  <Icon name="calc" size={15} />
                </span>
                <p className="text-[11.5px] leading-relaxed text-txt2">
                  {pct(riskPerTradePct, 1)} risk uchun tavsiya etilgan hajm —{' '}
                  <b className="font-mono text-txt">{num(calc.suggested, 2)} lot</b>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => set('volume', calc.suggested.toFixed(2))}
                className="mt-2.5 h-8 w-full cursor-pointer rounded-lg border border-blue/40 text-[12px] font-bold text-bluel transition-colors hover:bg-blue/15"
              >
                {d.tradeForm.useThisSize}
              </button>
            </div>
          ) : null}

          {calc.riskPct > riskPerTradePct * 1.05 ? (
            <p className="mt-3 rounded-[11px] bg-loss-soft p-3 text-[11.5px] leading-relaxed text-txt2">
              Bu savdodagi risk {pct(calc.riskPct, 2)} — o‘zingiz qo‘ygan {pct(riskPerTradePct, 1)}{' '}
              chegaradan yuqori.
            </p>
          ) : null}
        </Card>

        <Card padding="p-4">
          {state.error ? (
            <p
              role="alert"
              className="mb-3 rounded-[10px] bg-loss-soft px-3 py-2.5 text-[12px] font-semibold text-loss"
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-blued text-[13px] font-bold text-white transition-colors hover:bg-blueh disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="check" size={16} width={2.2} />
            {pending ? d.common.saving : submitLabel}
          </button>

          <Link
            href={cancelHref}
            className="mt-2.5 flex h-10 w-full items-center justify-center rounded-[10px] border border-line bg-card2 text-[12.5px] font-bold text-txt2 transition-colors hover:text-txt"
          >
            Bekor qilish
          </Link>

          <p className="mt-3 text-[11px] leading-relaxed text-txt3">
            {d.tradeForm.savedNote}
          </p>
        </Card>
      </div>
    </form>
  );
}
