'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_EMPTY, parseCheckinNote } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import { ChevronLeft, Shield } from 'lucide-react';

const PRACTICE_LABELS: Record<string, string> = { sit: 'checkinSit', stand: 'checkinStand', chant: 'checkinSutra' };
const PRACTICE_ICONS: Record<string, string> = { sit: '🧘', stand: '🧍', chant: '📿' };

export default function HistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const overlay = useOverlay();

  const sorted = useMemo(() =>
    (store.checkinHistory || []).filter(c => !c.deleted).sort((a, b) => {
      const ta = a.timestamp ?? new Date(a.date).getTime();
      const tb = b.timestamp ?? new Date(b.date).getTime();
      return tb - ta;
    }),
    [store.checkinHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const h of sorted) {
      const key = h.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return T('dateYearMonth').replace('{year}', y).replace('{month}', T(`month${parseInt(m)}`));
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
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text, flex: 1 }}>{T('checkinHistory')}</div>
        </div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: TH.sub, padding: '60px 0', fontSize: FONT_EMPTY }}>
            {T('checkinNoRecords')}
          </div>
        )}

        {grouped.map(([monthKey, items]) => (
          <div key={monthKey} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, marginLeft: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: P, flexShrink: 0 }} />
              <span style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text }}>{formatMonth(monthKey)}</span>
              <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length} {T('days')}</span>
            </div>

            {items.map((h, idx) => {
              const isLast = idx === items.length - 1;
              const parsed = parseCheckinNote(h.note ?? '');
              const tags: { icon: string; text: string }[] = [];
              if (parsed.fasted) tags.push({ icon: '🔥', text: T('checkinAbstinence') });
              if (parsed.waterMl > 0) tags.push({ icon: '💧', text: `${parsed.waterMl}ml` });
              if (parsed.food > 0) tags.push({ icon: '🍽️', text: `${parsed.food}kcal` });
              for (const pr of parsed.practices) {
                if (PRACTICE_LABELS[pr]) tags.push({ icon: PRACTICE_ICONS[pr], text: T(PRACTICE_LABELS[pr]) });
              }
              for (const name of parsed.habits) tags.push({ icon: '✓', text: name });
              for (const name of parsed.customs) tags.push({ icon: '✦', text: name });

              return (
                <div key={h.date ?? idx} style={{ display: 'flex', marginLeft: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 5,
                      background: h.done ? COLORS.GREEN : COLORS.RED, zIndex: 1, flexShrink: 0,
                    }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: `${P}30` }} />}
                  </div>

                  <div
                    onClick={() => overlay.open('checkinDetail', { checkinDetailDate: h.date })}
                    style={{
                      flex: 1, background: TH.card, borderRadius: 12, padding: '12px 14px',
                      marginBottom: 10, marginLeft: 8, cursor: 'pointer',
                      borderLeft: `3px solid ${h.done ? COLORS.GREEN : COLORS.RED}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatDay(h.date)}</span>
                        <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('dateWeekdayPrefix')}{getWeekday(h.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.grace && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '3px 8px', borderRadius: 8, fontSize: FONT_BADGE, fontWeight: 600,
                            background: `${COLORS.ORANGE}15`, color: COLORS.ORANGE,
                          }}>
                            <Shield size={10} />
                            {T('graceTitle')}
                          </span>
                        )}
                        <span style={{
                          padding: '3px 10px', borderRadius: 8, fontSize: FONT_BADGE, fontWeight: 600,
                          background: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)',
                          color: h.done ? COLORS.GREEN : COLORS.RED,
                        }}>
                          {h.done ? T('checkinDone') : T('checkinNotDone')}
                        </span>
                      </div>
                    </div>

                    {parsed.userNote && (
                      <div style={{ fontSize: FONT_SUB, color: TH.text, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {parsed.userNote}
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {tags.map((tag, i) => (
                          <span key={i} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: `${P}12`, padding: '3px 7px', borderRadius: 6,
                            fontSize: 10, color: TH.sub,
                          }}>
                            <span>{tag.icon}</span>
                            <span>{tag.text}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                      {h.streak > 0 && <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('checkinStreak')}: {h.streak} {T('days')}</span>}
                      {h.weight ? <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{h.weight} {T('checkinKg')}</span> : null}
                    </div>
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
