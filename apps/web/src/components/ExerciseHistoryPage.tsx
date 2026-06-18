'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { THEMES, COLORS, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_STAT_CARD, FONT_STAT_SECTION, getSportType, formatPace } from '@egoless-do/core';
import type { ExerciseEntry } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { loadAMap } from '../lib/amapLoader';
import { ChevronLeft, X } from 'lucide-react';

function DetailCard({ e, TH, P, T }: { e: ExerciseEntry; TH: any; P: string; T: (k: string) => string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const trackCoords = useMemo(() => e.trackPoints ?? [], [e.trackPoints]);
  const bestPace = (e.segmentPaces ?? []).length > 0 ? Math.min(...(e.segmentPaces ?? [])) : 0;
  const sportType = e.isGpsSport ? 'gps' as const : getSportType(e.sportKey, false);

  useEffect(() => {
    if (!mapRef.current || trackCoords.length < 2) return;
    let map: any = null;
    let cancelled = false;
    loadAMap().then((AMap) => {
      if (cancelled || !mapRef.current) return;
      map = new AMap.Map(mapRef.current, { zoom: 14, resizeEnable: false, touchZoom: false, dragEnable: false });
      const polyline = new AMap.Polyline({ path: trackCoords.map(c => [c.lng, c.lat]), strokeColor: P, strokeWeight: 4, lineJoin: 'round' });
      map.add(polyline);
      map.setFitView([polyline], false, [20, 20, 20, 20]);
    }).catch(err => console.warn('[AMap] load failed:', err));
    return () => { cancelled = true; if (map) { map.destroy(); map = null; } };
  }, [trackCoords, P]);

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${TH.border}`, paddingTop: 12 }}>
      {trackCoords.length > 1 && <div ref={mapRef} style={{ height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#ddd' }} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {sportType === 'gps' && e.distanceKm ? (
          <div style={{ width: 'calc(50% - 4px)', background: `${P}15`, borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseDistance')}</div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: TH.text }}>{e.distanceKm.toFixed(2)} km</div>
          </div>
        ) : null}
        {sportType === 'repetition' && e.reps != null ? (
          <div style={{ width: 'calc(50% - 4px)', background: `${P}15`, borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalReps')}</div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: TH.text }}>{e.reps}</div>
          </div>
        ) : null}
        <div style={{ width: 'calc(50% - 4px)', background: `${P}15`, borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTime')}</div>
          <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: TH.text }}>{Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}</div>
        </div>
        {sportType === 'gps' && e.avgPace ? (
          <div style={{ width: 'calc(50% - 4px)', background: `${P}15`, borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseAvgPace')}</div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: TH.text }}>{formatPace(e.avgPace)}</div>
          </div>
        ) : null}
        {e.calories ? (
          <div style={{ width: 'calc(50% - 4px)', background: `${P}15`, borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalCal')}</div>
            <div style={{ fontSize: FONT_TITLE, fontWeight: 800, color: TH.text }}>{e.calories} kcal</div>
          </div>
        ) : null}
      </div>
      {(e.sets ?? []).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text, marginBottom: 6 }}>{T('exerciseSets')}</div>
          <div style={{ background: `${P}10`, borderRadius: 10, padding: 10 }}>
            {(e.sets ?? []).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < (e.sets ?? []).length - 1 ? `1px solid ${TH.border}` : 'none' }}>
                <span style={{ fontSize: FONT_SUB, color: TH.text }}>{T('exerciseSet').replace('{n}', String(i + 1))}</span>
                <span style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text }}>{s.reps} {T('exerciseReps')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(e.segmentPaces ?? []).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text, marginBottom: 6 }}>{T('exerciseSegmentPace')}</div>
          <div style={{ background: `${P}10`, borderRadius: 10, padding: 10 }}>
            {(e.segmentPaces ?? []).map((p, i) => {
              const isBest = p === bestPace;
              const c = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < (e.segmentPaces ?? []).length - 1 ? `1px solid ${TH.border}` : 'none' }}>
                  <span style={{ fontSize: FONT_SUB, color: TH.text }}>{i + 1} km</span>
                  <span style={{ fontSize: FONT_SUB, fontWeight: 700, color: c }}>{formatPace(p)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExerciseHistoryPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const sorted = useMemo(() =>
    (store.exerciseLog ?? []).filter(e => !e.deleted).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [store.exerciseLog]
  );

  const sportKeys = useMemo(() => {
    const map = new Map<string, { icon: string; count: number }>();
    for (const e of sorted) {
      const cur = map.get(e.sportKey);
      if (cur) cur.count++;
      else map.set(e.sportKey, { icon: e.sportIcon, count: 1 });
    }
    return Array.from(map.entries());
  }, [sorted]);

  const filtered = useMemo(() =>
    selectedSport ? sorted.filter(e => e.sportKey === selectedSport) : sorted,
    [sorted, selectedSport]
  );

  const monthlyStats = useMemo(() => {
    const map = new Map<string, { min: number; count: number }>();
    for (const e of filtered) {
      const d = new Date(e.timestamp ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key);
      if (cur) { cur.min += Math.round(e.durationSec / 60); cur.count++; }
      else map.set(key, { min: Math.round(e.durationSec / 60), count: 1 });
    }
    return Array.from(map.entries());
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const d = new Date(e.timestamp ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalMin = Math.round(filtered.reduce((s, e) => s + e.durationSec, 0) / 60);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return T('dateYearMonth').replace('{year}', y).replace('{month}', T(`month${parseInt(m)}`));
  };

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}${T('exerciseMin')}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('exerciseHistory')}</div>
        </div>

        {/* Overall stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: TH.card, borderRadius: 16, padding: 14, textAlign: 'center', border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{totalMin}</div>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseMin')}</div>
          </div>
          <div style={{ flex: 1, background: TH.card, borderRadius: 16, padding: 14, textAlign: 'center', border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{filtered.length}</div>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalCount')}</div>
          </div>
        </div>

        {/* Sport category filter */}
        {sportKeys.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setSelectedSport(null)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${!selectedSport ? P : TH.border}`,
                background: !selectedSport ? P : TH.card, color: !selectedSport ? '#fff' : TH.sub,
                fontSize: FONT_SUB, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{T('allStatus')}</button>
            {sportKeys.map(([key, { icon, count }]) => {
              const active = selectedSport === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedSport(active ? null : key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? P : TH.border}`,
                    background: active ? P : TH.card, color: active ? '#fff' : TH.text,
                    fontSize: FONT_SUB, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >{icon} {key} ({count})</button>
              );
            })}
          </div>
        )}

        {/* Monthly time stats */}
        {monthlyStats.length > 1 && (
          <div style={{ background: TH.card, borderRadius: 16, padding: 14, marginBottom: 14, border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text, marginBottom: 10 }}>{T('exerciseTotalTime')}</div>
            {monthlyStats.map(([monthKey, stats]) => {
              const maxMin = Math.max(...monthlyStats.map(([, s]) => s.min));
              const pct = maxMin > 0 ? (stats.min / maxMin * 100) : 0;
              return (
                <div key={monthKey} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatMonth(monthKey)}</span>
                    <span style={{ fontSize: FONT_BADGE, color: TH.text, fontWeight: 600 }}>{formatDuration(stats.min)} · {stats.count}{T('exerciseWorkouts')}</span>
                  </div>
                  <div style={{ height: 6, background: `${P}20`, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: 6, width: `${pct}%`, background: P, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: TH.sub, padding: '60px 0', fontSize: FONT_BODY }}>{T('exerciseNoHistory')}</div>
        )}

        {/* Timeline grouped by month */}
        {grouped.map(([monthKey, items]) => (
          <div key={monthKey} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, marginLeft: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: P, flexShrink: 0 }} />
              <span style={{ fontSize: FONT_SUB, fontWeight: 700, color: TH.text }}>{formatMonth(monthKey)}</span>
              <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length} {T('exerciseWorkouts')}</span>
            </div>
            {items.map((e, idx) => {
              const isLast = idx === items.length - 1;
              const isExpanded = expandedId === e.id;
              const durMin = Math.floor(e.durationSec / 60);
              const durSec = e.durationSec % 60;
              return (
                <div key={e.id} style={{ display: 'flex', marginLeft: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: P, zIndex: 1, flexShrink: 0 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: `${P}30` }} />}
                  </div>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    style={{
                      flex: 1, background: TH.card, borderRadius: 12, padding: '12px 14px',
                      marginBottom: 10, marginLeft: 8, cursor: 'pointer',
                      borderLeft: `3px solid ${P}`, position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: FONT_STAT_SECTION }}>{e.sportIcon}</span>
                        <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatTime(e.timestamp)}</span>
                      </div>
                      <span style={{ background: `${P}15`, padding: '3px 10px', borderRadius: 8, color: P, fontWeight: 700, fontSize: FONT_SUB }}>{durMin}:{String(durSec).padStart(2, '0')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{e.sportKey}</span>
                      {e.reps != null ? <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.reps} {T('exerciseReps')}</span> : e.distanceKm ? <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.distanceKm.toFixed(2)} km</span> : null}
                      {e.calories ? <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>{e.calories} kcal</span> : null}
                    </div>
                    {isExpanded && <DetailCard e={e} TH={TH} P={P} T={T} />}
                    <button onClick={(ev) => { ev.stopPropagation(); store.deleteExercise?.(e.id); }} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }}><X size={16} /></button>
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
