'use client';

import { useMemo } from 'react';
import { THEMES, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_TITLE, FONT_BACK } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { ChevronLeft } from 'lucide-react';

export default function MedHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const sorted = useMemo(() =>
    [...(store.medHistory ?? [])].filter(m => !m.deleted).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [store.medHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const m of sorted) {
      const key = (m.date ?? '').slice(0, 7);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const formatMonth = (key: string) => {
    const [y, mo] = key.split('-');
    return T('dateYearMonth').replace('{year}', y).replace('{month}', T(`month${parseInt(mo)}`));
  };

  const formatDay = (dateStr: string) => {
    const parts = dateStr.split('-');
    return parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : dateStr;
  };

  const weekdays = [T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'), T('weekdayThu'), T('weekdayFri'), T('weekdaySat')];
  const getWeekday = (ds: string) => {
    const [y, m, d] = ds.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? '' : weekdays[date.getDay()];
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('meditationHistory')}</div>
        </div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: TH.sub, padding: '60px 0', fontSize: FONT_BODY }}>{T('noHistory')}</div>
        )}

        {grouped.map(([monthKey, items]) => (
          <div key={monthKey} style={{ marginBottom: 24 }}>
            {/* Month header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, marginLeft: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: P, flexShrink: 0 }} />
              <span style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text }}>{formatMonth(monthKey)}</span>
              <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length} {T('fastTimes')}</span>
            </div>

            {items.map((m, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <div key={m.date ?? idx} style={{ display: 'flex', marginLeft: 4 }}>
                  {/* Timeline line + dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: P, zIndex: 1, flexShrink: 0 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: `${P}30` }} />}
                  </div>

                  {/* Content card */}
                  <div style={{
                    flex: 1, background: TH.card, borderRadius: 12, padding: '12px 14px',
                    marginBottom: 10, marginLeft: 8,
                    borderLeft: `3px solid ${P}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatDay(m.date)}</span>
                        <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('dateWeekdayPrefix')}{getWeekday(m.date)}</span>
                      </div>
                      <span style={{
                        background: `${P}15`, padding: '3px 10px', borderRadius: 8,
                        color: P, fontWeight: 700, fontSize: FONT_SUB,
                      }}>{m.dur}</span>
                    </div>
                    {m.mood && (
                      <div style={{ fontSize: FONT_BADGE, color: TH.sub }}>{m.mood}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
