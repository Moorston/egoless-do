'use client';

import React from 'react';
import { COLORS, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_CLOSE } from '@egoless-do/core';
import type { SportItem, SportType, ExerciseSet } from '@egoless-do/core';

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmt(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface SportReportPageProps {
  sport: SportItem;
  isGpsSport: boolean;
  sportType: SportType;
  sec: number;
  distKm: number;
  calories: number;
  totalRepsForProgress: number;
  sets: ExerciseSet[];
  segmentPaces: number[];
  coords: { lat: number; lng: number; ts: number }[];
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onSave: () => void;
  T: (key: string) => string;
}

function SportReportPageInner({
  sport,
  isGpsSport,
  sportType,
  sec,
  distKm,
  calories,
  totalRepsForProgress,
  sets,
  segmentPaces,
  coords,
  mapContainerRef,
  onSave,
  T,
}: SportReportPageProps) {
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto' };
  const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;

  return (
    <div style={{ ...overlayStyle, background: '#f5f5f5' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 20px 16px', background: '#fff' }}>
          <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: '#333' }}>{T('exerciseReport')}</div>
          <div style={{ fontSize: FONT_SUB, color: '#888', marginTop: 4 }}>{sport.key} · {new Date().toLocaleDateString('zh-CN')}</div>
        </div>

        {/* Static map */}
        {isGpsSport && coords.length > 1 && (
          <div ref={mapContainerRef} style={{ height: 200, margin: 16, borderRadius: 16, overflow: 'hidden', background: '#ddd' }} />
        )}

        {/* Data cards — dynamic based on sport type */}
        <div style={{ display: 'flex', flexWrap: 'wrap', padding: 16, gap: 12 }}>
          {[
            ...(sportType === 'gps' ? [{ label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km` }] : []),
            ...(sportType === 'repetition' ? [{ label: T('exerciseTotalReps'), value: `${totalRepsForProgress}` }] : []),
            { label: T('exerciseTime'), value: fmt(sec) },
            ...(sportType === 'gps' ? [{ label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) }] : []),
            { label: T('exerciseTotalCal'), value: `${calories} kcal` },
          ].map(d => (
            <div key={d.label} style={{ width: 'calc(50% - 6px)', background: '#fff', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: FONT_SUB, color: '#888' }}>{d.label}</div>
              <div style={{ fontSize: FONT_CLOSE, fontWeight: 800, color: '#333', marginTop: 4 }}>{d.value}</div>
            </div>
          ))}
        </div>

        {/* Sets breakdown for repetition sports */}
        {sets.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: FONT_BODY, fontWeight: 700, color: '#333', marginBottom: 8 }}>{T('exerciseSets')}</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
              {sets.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < sets.length - 1 ? '1px solid #eee' : 'none' }}>
                  <span style={{ fontSize: FONT_BODY, color: '#333' }}>{T('exerciseSet').replace('{n}', String(i + 1))}</span>
                  <span style={{ fontSize: FONT_BODY, fontWeight: 700, color: '#333' }}>{s.reps} {T('exerciseReps')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segment paces */}
        {segmentPaces.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: FONT_BODY, fontWeight: 700, color: '#333', marginBottom: 8 }}>{T('exerciseSegmentPace')}</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
              {segmentPaces.map((p, i) => {
                const isBest = p === bestPace;
                const c = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < segmentPaces.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ fontSize: FONT_BODY, color: '#333' }}>{i + 1} km</span>
                    <span style={{ fontSize: FONT_BODY, fontWeight: 700, color: c }}>{formatPace(p)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ padding: 16 }}>
          <button onClick={onSave}
            style={{ width: '100%', height: 56, borderRadius: 28, background: COLORS.GREEN, border: 'none', color: '#fff', fontWeight: 700, fontSize: FONT_TITLE, cursor: 'pointer' }}>
            {T('exerciseSave')}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SportReportPage = React.memo(SportReportPageInner);
