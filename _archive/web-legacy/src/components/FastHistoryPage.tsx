'use client';

import { useMemo } from 'react';
import { THEMES, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_TITLE, FONT_BACK, COLORS } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { ChevronLeft } from 'lucide-react';

export default function FastHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const sorted = useMemo(() =>
    [...(store.fastingHistory ?? [])].filter(f => !f.deleted).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [store.fastingHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const f of sorted) {
      const d = new Date(f.startedAt ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return T('dateYearMonth').replace('{year}', y).replace('{month}', T(`month${parseInt(m)}`));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('fastingHistory')}</div>
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

            {items.map((f, idx) => {
              const started = f.startedAt ?? 0;
              const ended = f.endedAt ?? Date.now();
              const durSec = Math.floor((ended - started) / 1000);
              const h = Math.floor(durSec / 3600);
              const m = Math.floor((durSec % 3600) / 60);
              const isLast = idx === items.length - 1;
              return (
                <div key={f.id ?? idx} style={{ display: 'flex', marginLeft: 4 }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatTime(started)}</span>
                      <span style={{
                        background: `${P}15`, padding: '3px 10px', borderRadius: 8,
                        color: P, fontWeight: 700, fontSize: FONT_SUB,
                      }}>{h}h {m}m</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('fastTarget')}: {f.targetHours}h</span>
                      <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>~{f.estimatedKcal ?? 0} kcal</span>
                    </div>
                    {f.insight && (
                      <div style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 4, fontStyle: 'italic' }}>
                        {f.insight}
                      </div>
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
