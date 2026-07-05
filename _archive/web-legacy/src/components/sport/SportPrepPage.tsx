'use client';

import React from 'react';
import { X } from 'lucide-react';
import { FONT_TITLE, FONT_SUB, FONT_BACK, FONT_STAT_CARD, FONT_BODY, FONT_HERO, FONT_STAT_SECTION } from '@egoless-do/core';
import type { SportItem, SportType } from '@egoless-do/core';

interface SportPrepPageProps {
  sport: SportItem;
  bg: string;
  sportType: SportType;
  presets: Record<string, { label: string; labelEn: string; value: number }[]>;
  availableTargetTypes: Array<'distance' | 'time' | 'calories' | 'reps'>;
  mode: 'free' | 'target';
  setMode: (m: 'free' | 'target') => void;
  targetType: string;
  setTargetType: (t: string) => void;
  targetValue: number;
  setTargetValue: (v: number) => void;
  onGo: () => void;
  onClose: () => void;
  T: (key: string) => string;
}

function SportPrepPageInner({
  sport,
  bg,
  sportType,
  presets,
  availableTargetTypes,
  mode,
  setMode,
  targetType,
  setTargetType,
  targetValue,
  setTargetValue,
  onGo,
  onClose,
  T,
}: SportPrepPageProps) {
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto' };

  return (
    <div style={{ ...overlayStyle, background: bg }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <span style={{ fontWeight: 700, fontSize: FONT_STAT_CARD, color: '#fff' }}>{sport.key}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: FONT_BACK, cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Mode toggle — available for all sport types */}
        <div style={{ display: 'flex', marginTop: 16, background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 3 }}>
          {(['free', 'target'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all .2s',
                background: mode === m ? 'rgba(255,255,255,.25)' : 'transparent', color: '#fff', fontWeight: mode === m ? 700 : 400, fontSize: FONT_BODY }}>
              {m === 'free'
                ? (sportType === 'repetition' ? T('exerciseFreeReps') : sportType === 'timed' ? T('exerciseFreeSport') : T('exerciseFreeRun'))
                : (sportType === 'repetition' ? T('exerciseTargetReps') : sportType === 'timed' ? T('exerciseTargetSport') : T('exerciseTargetRun'))}
            </button>
          ))}
        </div>

        {/* Target selection */}
        {mode === 'target' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {availableTargetTypes.map(t => (
                <button key={t} onClick={() => { setTargetType(t); setTargetValue((presets[t as keyof typeof presets] as any)?.[0]?.value ?? 0); }}
                  style={{ padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: FONT_SUB, transition: 'all .2s',
                    background: targetType === t ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)', color: '#fff', fontWeight: targetType === t ? 700 : 400 }}>
                  {t === 'distance' ? T('exerciseDistanceGoal') : t === 'time' ? T('exerciseTimeGoal') : t === 'calories' ? T('exerciseCalGoal') : T('exerciseRepsGoal')}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {((presets[targetType as keyof typeof presets] as any) ?? []).map((p: { label: string; labelEn: string; value: number }) => (
                <button key={p.label} onClick={() => setTargetValue(p.value)}
                  style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: FONT_BODY, transition: 'all .2s',
                    background: targetValue === p.value ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)', color: '#fff', fontWeight: targetValue === p.value ? 700 : 400 }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Big circle */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '48px 0' }}>
          <div style={{ width: 180, height: 180, borderRadius: 90, border: '4px solid rgba(255,255,255,.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {sportType === 'repetition' ? (
              <>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>0</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseReps')}</div>
              </>
            ) : sportType === 'timed' ? (
              <>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>0:00</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseMin')}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>0.00</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseKm')}</div>
              </>
            )}
          </div>
        </div>

        {/* GO button */}
        <button onClick={onGo}
          style={{ width: '100%', height: 64, borderRadius: 32, border: 'none', background: '#fff', color: bg, fontWeight: 900, fontSize: FONT_STAT_SECTION, cursor: 'pointer', letterSpacing: 4 }}>
          GO
        </button>
      </div>
    </div>
  );
}

export const SportPrepPage = React.memo(SportPrepPageInner);
