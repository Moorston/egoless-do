'use client';

import { useState, useEffect, useRef } from 'react';
import { THEMES, COLORS, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_STAT_CARD, FONT_STAT_SECTION, getSportType } from '@egoless-do/core';
import type { ExerciseEntry } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { loadAMap } from '../lib/amapLoader';
import { ChevronLeft, X } from 'lucide-react';

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function DetailCard({ e, TH, P, T }: { e: ExerciseEntry; TH: any; P: string; T: (k: string) => string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const trackCoords = e.trackPoints ?? [];
  const bestPace = (e.segmentPaces ?? []).length > 0 ? Math.min(...(e.segmentPaces ?? [])) : 0;
  const sportType = e.isGpsSport ? 'gps' as const : getSportType(e.sportKey, false);

  useEffect(() => {
    if (!mapRef.current || trackCoords.length < 2) return;
    loadAMap().then((AMap) => {
      if (!mapRef.current) return;
      const map = new AMap.Map(mapRef.current, {
        zoom: 14,
        resizeEnable: false,
        touchZoom: false,
        dragEnable: false,
      });
      const polyline = new AMap.Polyline({
        path: trackCoords.map(c => [c.lng, c.lat]),
        strokeColor: P,
        strokeWeight: 4,
        lineJoin: 'round',
      });
      map.add(polyline);
      map.setFitView([polyline], false, [20, 20, 20, 20]);
    });
  }, []);

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${TH.border}`, paddingTop: 12 }}>
      {/* Map snapshot */}
      {trackCoords.length > 1 && (
        <div ref={mapRef} style={{ height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#ddd' }} />
      )}

      {/* Data cards — dynamic based on sport type */}
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

      {/* Sets breakdown for repetition sports */}
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

      {/* Segment paces */}
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
  const log = store.exerciseLog ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalMin = Math.round(log.reduce((s, e) => s + e.durationSec, 0) / 60);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('exerciseHistory')}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 16px', marginBottom: 16 }}>
          <div style={{ flex: 1, background: TH.card, borderRadius: 16, padding: 14, textAlign: 'center', border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{totalMin}</div>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseMin')}</div>
          </div>
          <div style={{ flex: 1, background: TH.card, borderRadius: 16, padding: 14, textAlign: 'center', border: `1px solid ${TH.border}` }}>
            <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{log.length}</div>
            <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalCount')}</div>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {log.length === 0 && (
            <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: FONT_BODY }}>{T('exerciseNoHistory')}</div>
          )}
          {log.map((e) => {
            const isExpanded = expandedId === e.id;
            return (
              <div key={e.id}
                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                style={{
                  background: TH.card, borderRadius: 16, padding: 14, marginBottom: 10,
                  border: `1px solid ${TH.border}`, cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: FONT_STAT_SECTION }}>{e.sportIcon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{e.sportKey}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
                        {new Date(e.timestamp).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: P, fontSize: FONT_BODY }}>
                        {Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}
                      </div>
                      {e.reps != null ? <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{e.reps} {T('exerciseReps')}</div> : e.distanceKm ? <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{e.distanceKm.toFixed(2)} km</div> : null}
                      {e.calories ? <div style={{ fontSize: FONT_SUB, color: TH.sub }}>{e.calories} kcal</div> : null}
                    </div>
                    <button onClick={(ev) => { ev.stopPropagation(); store.deleteExercise?.(e.id); }}
                      style={{ background: 'transparent', border: 'none', color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                </div>
                {isExpanded && <DetailCard e={e} TH={TH} P={P} T={T} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
