'use client';

import { useEffect, useState } from 'react';
import { Chip } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { getEconomicBrief, type EconomicBrief } from '@/actions/brief';
import { useD } from '@/components/i18n/Provider';
import { fill } from '@/lib/i18n';

/** Iqtisodiy qism alohida yuklanadi — panel uni kutib turmaydi. */
export default function EconomicSection() {
  const d = useD();
  const [data, setData] = useState<EconomicBrief | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getEconomicBrief()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;

  if (!data) {
    return (
      <div className="flex items-center gap-2 border-t border-line2 pt-3 text-[12px] text-txt3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-blue" />
        {d.brief.loading}
      </div>
    );
  }

  if (!data.enabled) return null;

  const released = data.yesterday.filter((e) => e.actual);

  if (released.length === 0 && data.today.length === 0) {
    return (
      <div className="border-t border-line2 pt-3 text-[12px] text-txt3">
        {data.error ? fill(d.brief.calendarError, { error: data.error }) : d.brief.noEvents}
      </div>
    );
  }

  return (
    <div className="border-t border-line2 pt-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-blue">
          <Icon name="chart" size={15} />
        </span>
        <span className="text-[11px] font-bold tracking-[0.06em] text-txt">{d.brief.economy}</span>
        <span className="grow" />
        <Chip tone="neutral" className="text-[10px]">
          {d.brief.approxTag}
        </Chip>
      </div>

      {released.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr>
                {[d.brief.colTime, d.brief.colEvent, d.brief.colForecast, d.brief.colActual].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line2 pb-2 text-[10px] font-bold tracking-[0.08em] text-txt3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {released.slice(0, 5).map((e) => (
                <tr key={e.id}>
                  <td className="border-b border-line2 py-2 font-mono text-[11.5px] text-txt3">
                    {e.time || '—'}
                  </td>
                  <td className="border-b border-line2 py-2 pr-3 text-[12px] text-txt2">
                    <span className="mr-1.5 font-mono text-[11px] font-bold text-txt3">
                      {e.currency}
                    </span>
                    {e.title}
                  </td>
                  <td className="border-b border-line2 py-2 font-mono text-[11.5px] text-txt3">
                    {e.forecast || '—'}
                  </td>
                  <td className="border-b border-line2 py-2 font-mono text-[11.5px] font-semibold text-txt">
                    {e.actual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data.text ? (
        <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-txt2">
          {data.text}
        </p>
      ) : null}

      {data.today.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-[0.06em] text-txt3">{d.brief.expectedToday}</span>
          {data.today.slice(0, 4).map((e) => (
            <Chip key={e.id} tone={e.importance >= 3 ? 'amber' : 'neutral'} className="text-[10.5px]">
              {e.time || '—'} {e.currency} · {e.title.slice(0, 34)}
            </Chip>
          ))}
        </div>
      ) : null}

      {data.error ? (
        <p className="mt-2 text-[11px] text-txt3">{fill(d.brief.note, { error: data.error })}</p>
      ) : null}
    </div>
  );
}
