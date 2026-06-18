'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SPORT_BG_COLORS, THEMES, getSportType, TARGET_PRESETS as ALL_TARGET_PRESETS, estimateCalories, MET_MAP } from '@egoless-do/core';
import type { SportItem, SportType, ExerciseSet } from '@egoless-do/core';
import { useWebStore } from '../store/useWebStore';
import { useT } from './helpers';
import { loadAMap } from '../lib/amapLoader';
import { SportPrepPage } from './sport/SportPrepPage';
import { SportActivePage } from './sport/SportActivePage';
import { SportReportPage } from './sport/SportReportPage';

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

type Page = 'prep' | 'countdown' | 'active' | 'paused' | 'report';

export default function SportPage({ sport, onClose }: { sport: SportItem; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const isGpsSport = sport.gps ?? false;
  const weight = store.userProfile?.weight ?? 70;
  const bg = SPORT_BG_COLORS[sport.key] || sport.color || '#4CAF50';
  const sportType = getSportType(sport.key, isGpsSport);
  const presets = ALL_TARGET_PRESETS[sportType];
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;

  // ── State ──
  const [page, setPage]             = useState<Page>('prep');
  const [mode, setMode]             = useState<'free' | 'target'>('free');
  const [targetType, setTargetType] = useState<string>(availableTargetTypes[0]);
  const [targetValue, setTargetValue] = useState(presets[availableTargetTypes[0] as keyof typeof presets]?.[0]?.value ?? 0);
  const [sec, setSec]               = useState(0);
  const [active, setActive]         = useState(false);
  const [coords, setCoords]         = useState<{ lat: number; lng: number; ts: number }[]>([]);
  const [countdown, setCountdown]   = useState(3);
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const [lastKmMark, setLastKmMark] = useState(0);
  const [lastKmTs, setLastKmTs]     = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [reps, setReps]             = useState(0);
  const [sets, setSets]             = useState<ExerciseSet[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [isResting, setIsResting]   = useState(false);
  const [restSec, setRestSec]       = useState(0);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef      = useRef<number | null>(null);
  const mapRef        = useRef<any>(null);
  const polylineRef   = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef  = useRef(0);
  const secRef        = useRef(0);
  const lastKmMarkRef = useRef(0);
  const lastKmTsRef   = useRef(0);
  secRef.current = sec;
  lastKmMarkRef.current = lastKmMark;
  lastKmTsRef.current = lastKmTs;

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
    if (navigator.vibrate) navigator.vibrate(50);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [page, countdown, isGpsSport, startGpsTracking]);

  // ── Init map when entering active GPS page or report ──
  useEffect(() => {
    let cancelled = false;
    if ((page === 'active' || page === 'report') && isGpsSport && mapContainerRef.current) {
      loadAMap().then((AMap) => {
        if (cancelled || !mapContainerRef.current) return;
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
      }).catch(err => console.warn('AMap load failed:', err));
    }
    return () => {
      cancelled = true;
      polylineRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [page, isGpsSport, sport.color, P]);

  // ── Update polyline when coords change ──
  useEffect(() => {
    if (coords.length < 2 || !mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.setPath(coords.map(c => [c.lng, c.lat]));
    } else {
      let cancelled = false;
      loadAMap().then((AMap) => {
        if (cancelled || !mapRef.current) return;
        const polyline = new AMap.Polyline({
          path: coords.map(c => [c.lng, c.lat]),
          strokeColor: sport.color || P,
          strokeWeight: 4,
          lineJoin: 'round',
        });
        mapRef.current.add(polyline);
        polylineRef.current = polyline;
      }).catch(err => console.warn('AMap load failed:', err));
      return () => { cancelled = true; };
    }
  }, [coords]);

  // ── Segment pace tracking ──
  useEffect(() => {
    if (!isGpsSport || page !== 'active') return;
    const currentKm = Math.floor(distKm);
    if (currentKm > lastKmMarkRef.current && lastKmMarkRef.current >= 0) {
      const segTime = secRef.current - lastKmTsRef.current;
      setSegmentPaces(prev => [...prev, segTime]);
      setLastKmMark(currentKm);
      setLastKmTs(secRef.current);
    }
  }, [distKm, isGpsSport, page]);

  // ── Rest timer ──
  useEffect(() => {
    if (!isResting) return;
    if (restSec <= 0) {
      setIsResting(false);
      return;
    }
    const t = setTimeout(() => setRestSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isResting, restSec]);

  // ── Target progress check ──
  useEffect(() => {
    if (mode !== 'target' || page !== 'active' || !active) return;
    const totalReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    let reached = false;
    if (targetType === 'distance' && distKm >= targetValue) reached = true;
    if (targetType === 'time' && sec >= targetValue) reached = true;
    if (targetType === 'calories' && calories >= targetValue) reached = true;
    if (targetType === 'reps' && totalReps >= targetValue) reached = true;
    if (reached && navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, [mode, page, active, targetType, targetValue, sec, distKm, calories, reps, currentSetReps, sets]);

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
      (err) => console.warn('GPS error:', err),
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
  const handleGo = useCallback(() => { setCountdown(3); setPage('countdown'); }, []);

  const handlePause = useCallback(() => {
    setActive(false);
    stopGpsTracking();
    setPage('paused');
  }, [stopGpsTracking]);

  const handleContinue = useCallback(() => {
    setPage('active');
    setActive(true);
    if (isGpsSport) startGpsTracking();
  }, [isGpsSport, startGpsTracking]);

  const handleHoldStart = useCallback(() => {
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
  }, []);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => { if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; } };
  }, []);

  const handleCancel = useCallback(() => { stopGpsTracking(); onClose(); }, [stopGpsTracking, onClose]);

  const handleSave = useCallback(() => {
    stopGpsTracking();
    const finalReps = sportType === 'repetition' ? (reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps) : undefined;
    if (sec > 0 || (finalReps && finalReps > 0)) {
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
        target: mode === 'target' ? { type: targetType as 'distance' | 'time' | 'calories' | 'reps', value: targetValue } : undefined,
        reps: finalReps,
        sets: sets.length > 0 ? sets : undefined,
        met: MET_MAP[sport.key],
      });
    }
    onClose();
  }, [stopGpsTracking, sportType, reps, sets, currentSetReps, sec, sport, isGpsSport, distKm, calories, coords, segmentPaces, mode, targetType, targetValue, store, onClose]);

  const totalRepsForProgress = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
  const targetProgress = mode === 'target' ? (() => {
    if (targetType === 'distance') return Math.min(distKm / targetValue, 1);
    if (targetType === 'time') return Math.min(sec / targetValue, 1);
    if (targetType === 'calories') return Math.min(calories / targetValue, 1);
    if (targetType === 'reps') return Math.min(totalRepsForProgress / targetValue, 1);
    return 0;
  })() : 0;

  // ── Countdown page (kept inline — very small) ──
  if (page === 'countdown') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: '#fff' }}>{countdown}</div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{T('exerciseCountdown')}</div>
      </div>
    );
  }

  // ── Prep page ──
  if (page === 'prep') {
    return (
      <SportPrepPage
        sport={sport}
        bg={bg}
        sportType={sportType}
        presets={presets as any}
        availableTargetTypes={availableTargetTypes}
        mode={mode}
        setMode={setMode}
        targetType={targetType}
        setTargetType={setTargetType}
        targetValue={targetValue}
        setTargetValue={setTargetValue}
        onGo={handleGo}
        onClose={onClose}
        T={T}
      />
    );
  }

  // ── Active / Paused page ──
  if (page === 'active' || page === 'paused') {
    return (
      <SportActivePage
        sport={sport}
        isGpsSport={isGpsSport}
        sportType={sportType}
        page={page}
        mode={mode}
        targetType={targetType}
        targetValue={targetValue}
        targetProgress={targetProgress}
        sec={sec}
        distKm={distKm}
        calories={calories}
        reps={reps}
        sets={sets}
        currentSetReps={currentSetReps}
        isResting={isResting}
        restSec={restSec}
        holdProgress={holdProgress}
        mapContainerRef={mapContainerRef}
        onPause={handlePause}
        onContinue={handleContinue}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
        onCancel={handleCancel}
        setCurrentSetReps={setCurrentSetReps}
        setSets={setSets}
        setIsResting={setIsResting}
        setRestSec={setRestSec}
        T={T}
      />
    );
  }

  // ── Report page ──
  return (
    <SportReportPage
      sport={sport}
      isGpsSport={isGpsSport}
      sportType={sportType}
      sec={sec}
      distKm={distKm}
      calories={calories}
      totalRepsForProgress={totalRepsForProgress}
      sets={sets}
      segmentPaces={segmentPaces}
      coords={coords}
      mapContainerRef={mapContainerRef}
      onSave={handleSave}
      T={T}
    />
  );
}
