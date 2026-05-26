'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS } from '@egoless-do/core';
import { useTheme, useT, cs, LinkWorldBtn, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';

export default function FastingTab() {
  const overlay = useOverlay();
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [elapsed, setElapsed] = useState(0);
  const [showDur, setShowDur] = useState(false);
  const [tmpDur, setTmpDur] = useState(8);
  const [agreed, setAgreed] = useState(false);
  const ref = useRef<number | null>(null);
  const bellPlayedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBell = useCallback(async () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const res = await fetch('/sounds/temple_bell.mp3');
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      gain.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.start();
    } catch (e) { console.warn('Bell sound failed:', e); }
  }, []);

  useEffect(() => {
    if (store.activeFasting) {
      bellPlayedRef.current = false;
      const startedAt = store.activeFasting.startedAt;
      ref.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    } else { if (ref.current !== null) window.clearInterval(ref.current); ref.current = null; setElapsed(0); }
    return () => { if (ref.current !== null) window.clearInterval(ref.current); };
  }, [store.activeFasting]);

  const pct = useMemo(() =>
    store.activeFasting ? Math.min(elapsed / (store.activeFasting.targetHours * 3600), 1) : 0,
    [store.activeFasting, elapsed]
  );

  useEffect(() => {
    if (pct >= 1 && !bellPlayedRef.current) {
      bellPlayedRef.current = true;
      playBell();
    }
  }, [pct, playBell]);
  
  const kcal = useMemo(() => {
    const hours = elapsed / 3600;
    return Math.round((store.userProfile.weight ?? 70) * hours * 0.9);
  }, [elapsed, store.userProfile]);
  
  const kg = useMemo(() => (kcal / 7700).toFixed(2), [kcal]);

  const totalFastHours = useMemo(() => {
    const totalSec = store.fastingHistory.reduce((sum, f) => {
      if (f.endedAt && f.startedAt) return sum + (f.endedAt - f.startedAt) / 1000;
      return sum;
    }, 0);
    return Math.round(totalSec / 3600);
  }, [store.fastingHistory]);

  const fastingDates = useMemo(() => {
    if (!store.fastingHistory.length) return [] as string[];
    return [...new Set(store.fastingHistory.map(f => {
      const d = new Date(f.startedAt);
      return d.toISOString().slice(0, 10);
    }))].sort();
  }, [store.fastingHistory]);

  const currentFastingStreak = useMemo(() => {
    if (!fastingDates.length) return 0;
    const reversed = [...fastingDates].reverse();
    let streak = 1;
    for (let i = 1; i < reversed.length; i++) {
      const prev = new Date(reversed[i - 1]);
      const curr = new Date(reversed[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.1) streak++;
      else break;
    }
    return streak;
  }, [fastingDates]);

  const longestStreak = useMemo(() => {
    if (fastingDates.length === 0) return 0;
    let max = 1, cur = 1;
    for (let i = 1; i < fastingDates.length; i++) {
      const prev = new Date(fastingDates[i - 1]);
      const curr = new Date(fastingDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.1) { cur++; max = Math.max(max, cur); }
      else if (diff > 1) cur = 1;
    }
    return max;
  }, [fastingDates]);

  const statsData = useMemo(() => [
    { icon: '⏳', label: T('fastTotal'), value: `${store.fastingHistory.length} ${T('fastTimes')}`, bg: '#EF9A9A' },
    { icon: '⏰', label: T('fastTotalHours'), value: `${totalFastHours} ${T('fastHours')}`, bg: COLORS.GREEN },
    { icon: '🔥', label: T('fastStreak'), value: `${currentFastingStreak} ${T('days')}`, bg: '#FF8A65' },
    { icon: '🏆', label: T('fastLongest'), value: `${longestStreak} ${T('days')}`, bg: '#9C27B0' },
  ], [store.fastingHistory.length, currentFastingStreak, T, totalFastHours, longestStreak]);

  const cardStyle = useCachedStyle(() => cs(TH), [TH]);

  const handleStopFasting = () => {
    store.stopFasting(store.userProfile.weight, store.userProfile.gender, store.userProfile.age);
  };

  return (
    <>
      <div style={{ ...cardStyle, textAlign: 'center' } as React.CSSProperties}>
        {store.activeFasting ? (
          <>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 16px' }}>
              <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={80} cy={80} r={68} fill="none" stroke={TH.border} strokeWidth={10} />
                <circle cx={80} cy={80} r={68} fill="none" stroke={P} strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: P }}>{Math.floor(elapsed / 3600)}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</div>
                <div style={{ fontSize: 16, color: TH.sub }}>{T('fastTarget')} {store.activeFasting.targetHours}h</div>
              </div>
            </div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 16 }}>{T('fastActive')} 🔥 {Math.round(pct * 100)}%</div>
            <button onClick={handleStopFasting} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: COLORS.RED, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('stopFasting')}</button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('startFasting')}</button>
            <button onClick={() => store.startFasting(8)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: COLORS.GREEN, color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>{T('quickStart')}</button>
          </div>
        )}
      </div>

      <LinkWorldBtn label={T('globalFasting')} onClick={() => overlay.open('globalMap', { globalMapTitle: `${T('linkWorld')} — ${T('globalFasting')}` })} />

      <div onClick={() => overlay.open('fastHistory')} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 18 }}>⏱</span>
        <span style={{ fontSize: 16, color: TH.text }}>{T('fastingHistory')}</span>
        <span style={{ marginLeft: 'auto', color: TH.sub }}>›</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10, color: TH.text }}>{T('fastYourStats')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {statsData.map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 26 }}>{s.icon}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{s.label}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: COLORS.ORANGE, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 26 }}>🔥</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{T('fastKcalSaved')}</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{kcal} <span style={{ fontSize: 16, fontWeight: 400 }}>kcal</span></div>
        </div>
        <div style={{ background: COLORS.GREEN, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 26 }}>⚖️</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{T('fastWeightLoss')}</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{kg} <span style={{ fontSize: 16, fontWeight: 400 }}>{T('fastKg')}</span></div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.YELLOW }}>{T('healthWarning')}</span>
        </div>
        {[T('fastTips'), T('fastTip2'), T('fastTip3'), T('fastTip4')].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 3 ? 8 : 0 }}>
            <span style={{ color: TH.sub, fontSize: 16 }}>•</span>
            <span style={{ fontSize: 16, color: TH.sub, lineHeight: 1.5 }}>{tip.trim()}</span>
          </div>
        ))}
      </div>

      {showDur && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 18, textAlign: 'center', marginBottom: 20, color: TH.text }}>{T('durationSelect')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 4, 6, 8, 10, 12].map((d) => (
                <button key={d} onClick={() => setTmpDur(d)}
                  style={{ width: 72, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, background: tmpDur === d ? P : TH.card, color: tmpDur === d ? '#fff' : TH.text }}>{d}h</button>
              ))}
            </div>
            <div style={{ background: 'rgba(255,248,200,.08)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', gap: 8 }}>
              <span>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#FCD34D', marginBottom: 4 }}>{T('warmReminder')}</div>
                <div style={{ fontSize: 16, color: TH.sub }}>{T('bodyWarning')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }} onClick={() => setAgreed((v) => !v)}>
              <div style={{ width: 18, height: 18, border: `2px solid ${agreed ? P : TH.border}`, borderRadius: 4, background: agreed ? P : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {agreed && <span style={{ color: '#fff', fontSize: 16 }}>✓</span>}
              </div>
              <span style={{ fontSize: 16, color: TH.text }}>{T('understand')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDur(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
              <button disabled={!agreed} onClick={() => { store.startFasting(tmpDur); setShowDur(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', cursor: agreed ? 'pointer' : 'not-allowed', background: agreed ? P : 'rgba(128,128,128,.2)', color: '#fff', fontWeight: 600, fontSize: 16 }}>{T('start')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
