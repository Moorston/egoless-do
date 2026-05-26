'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SPORT_BG_COLORS, THEMES, COLORS } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { loadAMap } from '../lib/amapLoader';

const TARGET_PRESETS = {
  distance: [
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
  ],
  time: [
    { label: '30 min', value: 30 * 60 },
    { label: '60 min', value: 60 * 60 },
  ],
  calories: [
    { label: '300 kcal', value: 300 },
    { label: '500 kcal', value: 500 },
  ],
};

function estimateCalories(sportKey: string, durationSec: number, weight = 70): number {
  const metMap: Record<string, number> = { '行走': 3.5, '跑步': 7, '骑行': 6, '户外骑行': 6, 'Walk': 3.5, 'Run': 7, 'Cycle': 6 };
  const met = metMap[sportKey] ?? 4;
  return Math.round(met * weight * (durationSec / 3600));
}

function computeDistance(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 2) return 0;
  return coords.reduce((total, c, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    const dlat = (c.lat - prev.lat) * Math.PI / 180;
    const dlng = (c.lng - prev.lng) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) *
              Math.cos(c.lat * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
}

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

type Page = 'prep' | 'countdown' | 'active' | 'paused' | 'report';

export default function SportPage({ sport, onClose }: { sport: SportItem; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const isGpsSport = sport.gps ?? false;
  const weight = store.userProfile?.weight ?? 70;
  const bg = SPORT_BG_COLORS[sport.key] || sport.color || '#4CAF50';

  // ── State ──
  const [page, setPage]             = useState<Page>('prep');
  const [mode, setMode]             = useState<'free' | 'target'>('free');
  const [targetType, setTargetType] = useState<'distance' | 'time' | 'calories'>('distance');
  const [targetValue, setTargetValue] = useState(5);
  const [sec, setSec]               = useState(0);
  const [active, setActive]         = useState(false);
  const [coords, setCoords]         = useState<{ lat: number; lng: number; ts: number }[]>([]);
  const [countdown, setCountdown]   = useState(3);
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const [lastKmMark, setLastKmMark] = useState(0);
  const [lastKmTs, setLastKmTs]     = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef      = useRef<number | null>(null);
  const mapRef        = useRef<any>(null);
  const polylineRef   = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef  = useRef(0);

  const distKm = computeDistance(coords);
  const calories = estimateCalories(sport.key, sec, weight);

  // ── Timer ──
  useEffect(() => {
    if (page === 'active' && active) {
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [page, active]);

  // ── Countdown ──
  useEffect(() => {
    if (page !== 'countdown') return;
    if (countdown <= 0) {
      setPage('active');
      setActive(true);
      if (isGpsSport) startGpsTracking();
      return;
    }
    // Vibrate on countdown
    if (navigator.vibrate) navigator.vibrate(50);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [page, countdown]);

  // ── Init map when entering active GPS page or report ──
  useEffect(() => {
    if ((page === 'active' || page === 'report') && isGpsSport && mapContainerRef.current) {
      loadAMap().then((AMap) => {
        if (!mapContainerRef.current) return;
        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 16,
          resizeEnable: true,
          touchZoom: page !== 'report',
          dragEnable: page !== 'report',
        });
        mapRef.current = map;
        if (coords.length >= 2) {
          const polyline = new AMap.Polyline({
            path: coords.map(c => [c.lng, c.lat]),
            strokeColor: sport.color || P,
            strokeWeight: 4,
            lineJoin: 'round',
          });
          map.add(polyline);
          polylineRef.current = polyline;
          map.setFitView([polyline], false, [40, 40, 40, 40]);
        }
      });
    }
  }, [page]);

  // ── Update polyline when coords change ──
  useEffect(() => {
    if (coords.length < 2 || !mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.setPath(coords.map(c => [c.lng, c.lat]));
    } else {
      // Polyline wasn't created at init (coords were < 2), create it now
      loadAMap().then((AMap) => {
        if (!mapRef.current) return;
        const polyline = new AMap.Polyline({
          path: coords.map(c => [c.lng, c.lat]),
          strokeColor: sport.color || P,
          strokeWeight: 4,
          lineJoin: 'round',
        });
        mapRef.current.add(polyline);
        polylineRef.current = polyline;
      });
    }
  }, [coords]);

  // ── Segment pace tracking ──
  useEffect(() => {
    if (!isGpsSport || page !== 'active') return;
    const currentKm = Math.floor(distKm);
    if (currentKm > lastKmMark && lastKmMark >= 0) {
      const segTime = sec - lastKmTs;
      setSegmentPaces(prev => [...prev, segTime]);
      setLastKmMark(currentKm);
      setLastKmTs(sec);
    }
  }, [distKm]);

  // ── Target progress check ──
  useEffect(() => {
    if (mode !== 'target' || page !== 'active' || !active) return;
    let reached = false;
    if (targetType === 'distance' && distKm >= targetValue) reached = true;
    if (targetType === 'time' && sec >= targetValue) reached = true;
    if (targetType === 'calories' && calories >= targetValue) reached = true;
    if (reached && navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, [sec, distKm, calories]);

  // ── GPS tracking ──
  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
        setCoords(prev => [...prev, point]);
        if (mapRef.current) {
          mapRef.current.setCenter([point.lng, point.lat]);
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => stopGpsTracking();
  }, []);

  // ── Controls ──
  const handleGo = () => { setCountdown(3); setPage('countdown'); };

  const handlePause = () => {
    setActive(false);
    stopGpsTracking();
    setPage('paused');
  };

  const handleContinue = () => {
    setPage('active');
    setActive(true);
    if (isGpsSport) startGpsTracking();
  };

  const handleHoldStart = () => {
    holdStartRef.current = Date.now();
    setHoldProgress(0);
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / 3000, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
        if (navigator.vibrate) navigator.vibrate(100);
        setPage('report');
      }
    }, 50);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldProgress(0);
  };

  const handleSave = () => {
    stopGpsTracking();
    if (sec > 0) {
      store.addExercise({
        sportKey: sport.key,
        sportIcon: sport.icon,
        durationSec: sec,
        timestamp: Date.now(),
        isGpsSport: isGpsSport,
        distanceKm: isGpsSport ? distKm : undefined,
        calories,
        avgPace: isGpsSport && distKm > 0 ? sec / distKm : undefined,
        trackPoints: isGpsSport ? coords.map(c => ({ lat: c.lat, lng: c.lng, ts: c.ts })) : undefined,
        segmentPaces: segmentPaces.length > 0 ? segmentPaces : undefined,
        mode,
        target: mode === 'target' ? { type: targetType, value: targetValue } : undefined,
      });
    }
    onClose();
  };

  const targetProgress = mode === 'target' ? (() => {
    if (targetType === 'distance') return Math.min(distKm / targetValue, 1);
    if (targetType === 'time') return Math.min(sec / targetValue, 1);
    if (targetType === 'calories') return Math.min(calories / targetValue, 1);
    return 0;
  })() : 0;

  // ── Shared styles ──
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto' };

  // ── PREP PAGE ──
  if (page === 'prep') {
    return (
      <div style={{ ...overlayStyle, background: bg }}>
        <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontWeight: 700, fontSize: 22, color: '#fff' }}>{sport.key}</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', marginTop: 16, background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 3 }}>
            {(['free', 'target'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all .2s',
                  background: mode === m ? 'rgba(255,255,255,.25)' : 'transparent', color: '#fff', fontWeight: mode === m ? 700 : 400, fontSize: 15 }}>
                {m === 'free' ? T('exerciseFreeRun') : T('exerciseTargetRun')}
              </button>
            ))}
          </div>

          {/* Target selection */}
          {mode === 'target' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['distance', 'time', 'calories'] as const).map(t => (
                  <button key={t} onClick={() => { setTargetType(t); setTargetValue(TARGET_PRESETS[t][0].value); }}
                    style={{ padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, transition: 'all .2s',
                      background: targetType === t ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)', color: '#fff', fontWeight: targetType === t ? 700 : 400 }}>
                    {t === 'distance' ? T('exerciseDistanceGoal') : t === 'time' ? T('exerciseTimeGoal') : T('exerciseCalGoal')}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {TARGET_PRESETS[targetType].map(p => (
                  <button key={p.label} onClick={() => setTargetValue(p.value)}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, transition: 'all .2s',
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
              <div style={{ fontSize: 52, fontWeight: 900, color: '#fff' }}>0.00</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>km</div>
            </div>
          </div>

          {/* GO button */}
          <button onClick={handleGo}
            style={{ width: '100%', height: 64, borderRadius: 32, border: 'none', background: '#fff', color: bg, fontWeight: 900, fontSize: 28, cursor: 'pointer', letterSpacing: 4 }}>
            GO
          </button>
        </div>
      </div>
    );
  }

  // ── COUNTDOWN PAGE ──
  if (page === 'countdown') {
    return (
      <div style={{ ...overlayStyle, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: '#fff' }}>{countdown}</div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{T('exerciseCountdown')}</div>
      </div>
    );
  }

  // ── PAUSED PAGE ──
  if (page === 'paused') {
    const circumference = 2 * Math.PI * 40;
    const dashOffset = circumference * (1 - holdProgress);
    return (
      <div style={{ ...overlayStyle, background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#fff' }}>{isGpsSport ? distKm.toFixed(2) : Math.floor(sec / 60)}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{isGpsSport ? 'km' : 'min'}</div>
        <div style={{ fontSize: 20, color: 'rgba(255,255,255,.7)', marginTop: 16 }}>{fmt(sec)}</div>

        <div style={{ display: 'flex', marginTop: 60, gap: 20, alignItems: 'center' }}>
          {/* Continue */}
          <button onClick={handleContinue}
            style={{ width: 64, height: 64, borderRadius: 32, background: COLORS.GREEN, border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ▶
          </button>

          {/* Hold to finish */}
          <button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            style={{ width: 88, height: 88, borderRadius: 44, border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,.15)' }}>
            <svg width="88" height="88" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(239,68,68,.3)" strokeWidth="4" />
              <circle cx="44" cy="44" r="40" fill="none" stroke={COLORS.RED} strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
            </svg>
            <span style={{ fontSize: 13, color: COLORS.RED, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{T('exerciseFinishConfirm')}</span>
          </button>

          {/* Cancel */}
          <button onClick={() => { stopGpsTracking(); onClose(); }}
            style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── REPORT PAGE ──
  if (page === 'report') {
    const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;
    return (
      <div style={{ ...overlayStyle, background: '#f5f5f5' }}>
        <div style={{ maxWidth: 390, margin: '0 auto' }}>
          <div style={{ padding: '20px 20px 16px', background: '#fff' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>{T('exerciseReport')}</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{sport.key} · {new Date().toLocaleDateString('zh-CN')}</div>
          </div>

          {/* Static map */}
          {isGpsSport && coords.length > 1 && (
            <div ref={mapContainerRef} style={{ height: 200, margin: 16, borderRadius: 16, overflow: 'hidden', background: '#ddd' }} />
          )}

          {/* Data cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', padding: 16, gap: 12 }}>
            {[
              { label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km` },
              { label: T('exerciseTime'), value: fmt(sec) },
              { label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) },
              { label: T('exerciseTotalCal'), value: `${calories} kcal` },
            ].map(d => (
              <div key={d.label} style={{ width: 'calc(50% - 6px)', background: '#fff', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: '#888' }}>{d.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#333', marginTop: 4 }}>{d.value}</div>
              </div>
            ))}
          </div>

          {/* Segment paces */}
          {segmentPaces.length > 0 && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 8 }}>{T('exerciseSegmentPace')}</div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
                {segmentPaces.map((p, i) => {
                  const isBest = p === bestPace;
                  const c = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < segmentPaces.length - 1 ? '1px solid #eee' : 'none' }}>
                      <span style={{ fontSize: 15, color: '#333' }}>{i + 1} km</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: c }}>{formatPace(p)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ padding: 16 }}>
            <button onClick={handleSave}
              style={{ width: '100%', height: 56, borderRadius: 28, background: COLORS.GREEN, border: 'none', color: '#fff', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>
              {T('exerciseSave')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE PAGE (GPS) ──
  if (page === 'active' && isGpsSport) {
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
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
                  {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
                </div>
              </div>
            )}

            {/* Main data row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flex: 1, alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{distKm.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>km</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseTime')}</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{formatPace(distKm > 0 ? sec / distKm : 0)}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exercisePace')}</div>
              </div>
            </div>

            {/* Calories */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 18, color: COLORS.ORANGE, fontWeight: 700 }}>{calories} kcal</span>
            </div>

            {/* Pause button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={handlePause}
                style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', border: 'none', fontSize: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                ⏸
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE PAGE (Non-GPS) ──
  return (
    <div style={{ ...overlayStyle, background: '#1a1a2e' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{sport.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#bbb' }}>{sport.key}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', minHeight: 'calc(100vh - 200px)' }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: '#fff' }}>{Math.floor(sec / 60) || 0}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseTotalBurn')}</div>
        <div style={{ fontSize: 20, color: COLORS.ORANGE, marginTop: 8 }}>{calories} kcal</div>

        <div style={{ display: 'flex', marginTop: 40, gap: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{T('exerciseTotalDuration')}</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 48, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24 }}>
        <button onClick={() => setActive(v => !v)}
          style={{ width: 76, height: 76, borderRadius: 38, background: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          {active ? '⏸' : '▶'}
        </button>
        <button onClick={handleSave}
          style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  );
}
