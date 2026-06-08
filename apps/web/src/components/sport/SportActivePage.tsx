'use client';

import React from 'react';
import { Play, Pause, Minus, Plus, X } from 'lucide-react';
import { COLORS, FONT_SUB, FONT_BACK, FONT_CLOSE, FONT_BODY, FONT_HERO, FONT_STAT_SECTION, FONT_STAT_CARD, FONT_TITLE, FONT_ERROR, MET_MAP, formatPace } from '@egoless-do/core';
import type { SportItem, SportType, ExerciseSet } from '@egoless-do/core';

function fmt(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}


interface SportActivePageProps {
  sport: SportItem;
  isGpsSport: boolean;
  sportType: SportType;
  page: 'active' | 'paused';
  mode: 'free' | 'target';
  targetType: string;
  targetValue: number;
  targetProgress: number;
  sec: number;
  distKm: number;
  calories: number;
  reps: number;
  sets: ExerciseSet[];
  currentSetReps: number;
  isResting: boolean;
  restSec: number;
  holdProgress: number;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onPause: () => void;
  onContinue: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onCancel: () => void;
  setCurrentSetReps: (fn: (r: number) => number) => void;
  setSets: (fn: (prev: ExerciseSet[]) => ExerciseSet[]) => void;
  setIsResting: (v: boolean) => void;
  setRestSec: (fn: (s: number) => number) => void;
  T: (key: string) => string;
}

function SportActivePageInner({
  sport,
  isGpsSport,
  sportType,
  page,
  mode,
  targetType,
  targetValue,
  targetProgress,
  sec,
  distKm,
  calories,
  reps,
  sets,
  currentSetReps,
  isResting,
  restSec,
  holdProgress,
  mapContainerRef,
  onPause,
  onContinue,
  onHoldStart,
  onHoldEnd,
  onCancel,
  setCurrentSetReps,
  setSets,
  setIsResting,
  setRestSec,
  T,
}: SportActivePageProps) {
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto' };

  // ── PAUSED PAGE ──
  if (page === 'paused') {
    const circumference = 2 * Math.PI * 40;
    const dashOffset = circumference * (1 - holdProgress);
    const pausedReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    return (
      <div style={{ ...overlayStyle, background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>{isGpsSport ? distKm.toFixed(2) : sportType === 'repetition' ? pausedReps : Math.floor(sec / 60)}</div>
        <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{isGpsSport ? 'km' : sportType === 'repetition' ? T('exerciseReps') : 'min'}</div>
        <div style={{ fontSize: FONT_STAT_CARD, color: 'rgba(255,255,255,.7)', marginTop: 16 }}>{fmt(sec)}</div>

        <div style={{ display: 'flex', marginTop: 60, gap: 20, alignItems: 'center' }}>
          {/* Continue */}
          <button onClick={onContinue}
            style={{ width: 64, height: 64, borderRadius: 32, background: COLORS.GREEN, border: 'none', color: '#fff', fontSize: FONT_CLOSE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={24} />
          </button>

          {/* Hold to finish */}
          <button
            onMouseDown={onHoldStart}
            onMouseUp={onHoldEnd}
            onMouseLeave={onHoldEnd}
            onTouchStart={onHoldStart}
            onTouchEnd={onHoldEnd}
            style={{ width: 88, height: 88, borderRadius: 44, border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,.15)' }}>
            <svg width="88" height="88" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(239,68,68,.3)" strokeWidth="4" />
              <circle cx="44" cy="44" r="40" fill="none" stroke={COLORS.RED} strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
            </svg>
            <span style={{ fontSize: FONT_ERROR, color: COLORS.RED, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{T('exerciseFinishConfirm')}</span>
          </button>

          {/* Cancel */}
          <button onClick={onCancel}
            style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: FONT_BACK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE PAGE (GPS) ──
  if (isGpsSport) {
    return (
      <div style={{ ...overlayStyle, background: '#000' }}>
        <div style={{ maxWidth: 390, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Map area (40%) */}
          <div ref={mapContainerRef} style={{ flex: '4', minHeight: 0 }} />

          {/* Data area (60%) */}
          <div style={{ flex: '6', background: '#1a1a2e', padding: 20, display: 'flex', flexDirection: 'column' }}>
            {/* Target progress */}
            {mode === 'target' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: 6, width: `${targetProgress * 100}%`, background: COLORS.GREEN, borderRadius: 3, transition: 'width .5s' }} />
                </div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
                  {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
                </div>
              </div>
            )}

            {/* Main data row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flex: 1, alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{distKm.toFixed(2)}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>km</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseTime')}</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{formatPace(distKm > 0 ? sec / distKm : 0)}</div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exercisePace')}</div>
              </div>
            </div>

            {/* Calories */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: FONT_TITLE, color: COLORS.ORANGE, fontWeight: 700 }}>{calories} kcal</span>
            </div>

            {/* Pause button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={onPause}
                style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', border: 'none', fontSize: FONT_STAT_SECTION, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                <Pause size={32} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE PAGE (Non-GPS) ──
  const currentSet = sets.length + 1;
  const displayReps = reps || (sets.reduce((s, set) => s + set.reps, 0) + currentSetReps);

  return (
    <div style={{ ...overlayStyle, background: '#1a1a2e' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: FONT_CLOSE }}>{sport.icon}</span>
            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: '#bbb' }}>{sport.key}</span>
          </div>
          {sportType === 'repetition' && (
            <span style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
              {T('exerciseSet').replace('{n}', String(currentSet))} · {sets.reduce((s, set) => s + set.reps, 0)} {T('exerciseReps')}
            </span>
          )}
        </div>
      </div>

      {/* Rest timer overlay */}
      {isResting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(0,0,0,.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: COLORS.ORANGE }}>{restSec}</div>
          <div style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.7)', marginTop: 8 }}>{T('exerciseRestTime')}</div>
          <button onClick={() => { setIsResting(false); setRestSec(() => 0); }}
            style={{ marginTop: 24, padding: '12px 24px', borderRadius: 20, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
            {T('exerciseSkip')}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', minHeight: 'calc(100vh - 200px)' }}>
        {/* Main display */}
        {sportType === 'repetition' ? (
          <>
            <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>{currentSetReps}</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseReps')}</div>
            {/* Rep controls */}
            <div style={{ display: 'flex', marginTop: 20, gap: 16, alignItems: 'center' }}>
              <button onClick={() => setCurrentSetReps(r => Math.max(0, r - 1))}
                style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: FONT_TITLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={24} />
              </button>
              <button onClick={() => setCurrentSetReps(r => r + 1)}
                style={{ width: 72, height: 72, borderRadius: 36, background: COLORS.GREEN, border: 'none', color: '#fff', fontSize: FONT_HERO, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={32} />
              </button>
              <button onClick={() => setCurrentSetReps(r => r + 5)}
                style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontWeight: 700, fontSize: FONT_TITLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                +5
              </button>
            </div>
            {/* Complete set button */}
            {currentSetReps > 0 && (
              <button onClick={() => {
                setSets(prev => [...prev, { reps: currentSetReps, restSec: 60 }]);
                setCurrentSetReps(() => 0);
                setIsResting(true);
                setRestSec(() => 60);
              }}
                style={{ marginTop: 20, padding: '14px 32px', borderRadius: 24, background: `${COLORS.GREEN}30`, border: `1px solid ${COLORS.GREEN}`, color: COLORS.GREEN, fontSize: FONT_BODY, fontWeight: 700, cursor: 'pointer' }}>
                {T('exerciseSetComplete')}
              </button>
            )}
            {/* Target progress for reps */}
            {mode === 'target' && targetType === 'reps' && (
              <div style={{ marginTop: 16, width: '100%', maxWidth: 300 }}>
                <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: 6, width: `${targetProgress * 100}%`, background: COLORS.GREEN, borderRadius: 3, transition: 'width .5s' }} />
                </div>
                <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
                  {displayReps} / {targetValue} {T('exerciseReps')}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: FONT_HERO, fontWeight: 900, color: '#fff' }}>{Math.floor(sec / 60) || 0}</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseTotalBurn')}</div>
            <div style={{ fontSize: FONT_STAT_CARD, color: COLORS.ORANGE, marginTop: 8 }}>{calories} kcal</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.3)', marginTop: 6 }}>{MET_MAP[sport.key] ?? 4} {T('exerciseMet')}</div>
            {mode === 'target' && targetType === 'time' && sec < targetValue && (
              <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseEstRemaining')} {fmt(targetValue - sec)}</div>
            )}
          </>
        )}

        <div style={{ display: 'flex', marginTop: 40, gap: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{T('exerciseTotalDuration')}</div>
          </div>
        </div>

        {/* Target progress for time/calories */}
        {mode === 'target' && targetType !== 'reps' && (
          <div style={{ marginTop: 16, width: '100%', maxWidth: 300 }}>
            <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${targetProgress * 100}%`, background: COLORS.GREEN, borderRadius: 3, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
              {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Pause button — routes to paused page with hold-to-finish confirmation */}
      <div style={{ position: 'fixed', bottom: 48, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <button onClick={onPause}
          style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', border: 'none', fontSize: FONT_STAT_SECTION, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          <Pause size={32} />
        </button>
      </div>
    </div>
  );
}

export const SportActivePage = React.memo(SportActivePageInner);
