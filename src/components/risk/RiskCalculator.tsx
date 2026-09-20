'use client';

import { useMemo, useState } from 'react';
import { Card, CardTitle, KeyValue, SectionLabel } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { DEFAULT_INSTRUMENTS, specFor } from '@/lib/instruments';
import { money, num, pct } from '@/lib/format';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';

function toNumber(value: string): number {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function RiskCalculator({
  balance,
  riskPerTradePct,
  dailyLossPct,
  dailyUsedPct,
}: {
  balance: number;
  riskPerTradePct: number;
  dailyLossPct: number;
  dailyUsedPct: number;
}) {
  const d = useD();
  const [symbol, setSymbol] = useState('XAUUSD');
  const [bal, setBal] = useState(balance.toFixed(2));
  const [riskPct, setRiskPct] = useState(String(riskPerTradePct));
  const [entry, setEntry] = useState('3642.10');
  const [stop, setStop] = useState('3620.40');

  const spec = useMemo(() => specFor(symbol), [symbol]);

  const calc = useMemo(() => {
    const b = toNumber(bal);
    const rp = toNumber(riskPct);
    const e = toNumber(entry);
    const s = toNumber(stop);

    const riskUsd = (b * rp) / 100;
    const distance = Math.abs(e - s);
    const pips = spec.pipSize > 0 ? distance / spec.pipSize : 0;
    const lots = pips > 0 && spec.pipValuePerLot > 0 ? riskUsd / (pips * spec.pipValuePerLot) : 0;
    const up = s <= e ? 1 : -1;
    const target = (k: number) => e + up * distance * k;

    return { riskUsd, distance, pips, lots, up, target };
  }, [bal, riskPct, entry, stop, spec]);

  const inputs: { label: string; value: string; set: (v: string) => void; suffix: string; hint?: string }[] = [
    { label: d.risk.balance, value: bal, set: setBal, suffix: 'USD' },
    {
      label: d.risk.riskPerTrade,
      value: riskPct,
      set: setRiskPct,
      suffix: '%',
      hint: d.risk.riskHint,
    },
    { label: d.risk.entryPrice, value: entry, set: setEntry, suffix: symbol },
    { label: d.risk.stopLoss, value: stop, set: setStop, suffix: symbol },
  ];

  const dailyRemaining = Math.max(0, dailyLossPct - dailyUsedPct);
  const overDaily = calc.riskUsd > 0 && toNumber(riskPct) > dailyRemaining;

  return (
    <div className="flex min-h-0 grow flex-col gap-3.5 xl:flex-row">
      <div className="w-full shrink-0 xl:w-[400px]">
        <Card>
          <CardTitle>{d.risk.inputs}</CardTitle>

          <label className="mb-3.5 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">
              {d.risk.instrument}
            </span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="box-border h-[46px] w-full appearance-none rounded-[11px] border border-line bg-card2 px-3.5 font-mono text-base font-semibold text-txt outline-none focus:border-blue"
            >
              {DEFAULT_INSTRUMENTS.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol}
                </option>
              ))}
            </select>
            <span className="text-[10.5px] text-txt4">
              {fill(d.risk.pipInfo, {
                size: num(spec.pipSize, 5),
                value: money(spec.pipValuePerLot),
              })}
            </span>
          </label>

          <div className="flex flex-col gap-3.5">
            {inputs.map((f) => (
              <label key={f.label} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{f.label}</span>
                <span className="flex h-[46px] items-center gap-2 rounded-[11px] border border-line bg-card2 px-3.5 focus-within:border-blue">
                  <input
                    inputMode="decimal"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="tnum min-w-0 grow border-0 bg-transparent font-mono text-base font-semibold text-txt outline-none"
                  />
                  <span className="shrink-0 font-mono text-[12.5px] text-txt3">{f.suffix}</span>
                </span>
                {f.hint ? <span className="text-[10.5px] text-txt4">{f.hint}</span> : null}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex min-w-0 grow flex-col gap-3.5">
        <div className="rounded-[14px] border border-blue/30 bg-blue-soft p-[22px]">
          <SectionLabel>{d.risk.suggestedSize}</SectionLabel>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="tnum font-mono text-[46px] font-semibold tracking-[-0.02em] text-txt">
              {num(calc.lots, 2)}
            </span>
            <span className="font-mono text-base font-semibold text-txt2">{d.units.lot}</span>
          </div>
          <div className="mt-2 text-[12.5px] text-txt2">
            {fill(d.risk.sizeSummary, {
              direction: calc.up > 0 ? d.trades.long : d.trades.short,
              risk: money(calc.riskUsd),
              pips: num(calc.pips, 1),
            })}
          </div>
        </div>

        <Card>
          <CardTitle>{d.risk.result}</CardTitle>
          <KeyValue label={d.risk.riskMoney} value={money(calc.riskUsd)} tone="amber" />
          <KeyValue label={d.risk.stopDistance} value={num(calc.distance, spec.priceDecimals)} />
          <KeyValue label={d.risk.inPips} value={fill(d.risk.pipsValue, { n: num(calc.pips, 1) })} />
          <KeyValue label={d.risk.oneR} value={money(calc.riskUsd)} />
          <KeyValue label={d.risk.shareOfAccount} value={pct(toNumber(riskPct), 2)} tone="amber" />
        </Card>

        <Card>
          <CardTitle>{d.risk.targets}</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="rounded-xl border border-line bg-card2 p-3.5">
                <SectionLabel>{k}R</SectionLabel>
                <div className="tnum mt-2 font-mono text-[17px] font-semibold text-txt">
                  {num(calc.target(k), spec.priceDecimals)}
                </div>
                <div className="tnum mt-1 font-mono text-xs font-bold text-win">
                  +{money(calc.riskUsd * k)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="w-full shrink-0 xl:w-[330px]">
        <Card>
          <CardTitle>{d.risk.guardrails}</CardTitle>
          <KeyValue label={d.risk.tradeRiskLimit} value={pct(riskPerTradePct, 1)} />
          <KeyValue label={d.risk.dailyLimit} value={pct(dailyLossPct, 1)} />
          <KeyValue
            label={d.risk.usedToday}
            value={pct(dailyUsedPct, 2)}
            tone={dailyUsedPct >= dailyLossPct ? 'loss' : 'amber'}
          />
          <KeyValue
            label={d.risk.leftToday}
            value={pct(dailyRemaining, 2)}
            tone={dailyRemaining <= 0 ? 'loss' : 'win'}
          />

          {overDaily ? (
            <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-amber-soft p-3 text-[11.5px] leading-relaxed text-txt2">
              <span className="shrink-0 text-amber">
                <Icon name="shield" size={15} />
              </span>
              {d.risk.overDaily}
            </p>
          ) : (
            <p className="mt-3.5 flex items-start gap-2.5 rounded-[11px] bg-blue-soft p-3 text-[11.5px] leading-relaxed text-txt2">
              <span className="shrink-0 text-blue">
                <Icon name="calc" size={15} />
              </span>
              {d.risk.hint}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
