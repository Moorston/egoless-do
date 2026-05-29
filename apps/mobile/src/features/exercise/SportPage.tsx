import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MapView, Polyline } from 'react-native-amap3d';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme, useT } from '../../components/UI';
import { SPORT_BG_COLORS, fmt, COLORS, getSportType, TARGET_PRESETS, estimateCalories, MET_MAP, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_HERO, FONT_CLOSE, FONT_BADGE, FONT_BACK } from '@egoless-do/core';
import type { SportType, ExerciseSet } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import { X, Play, Pause, Minus, Plus } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation';

type Route = RouteProp<RootStackParamList, 'Sport'>;
type Page = 'prep' | 'countdown' | 'active' | 'paused' | 'report';

function computeDistance(coords: { latitude: number; longitude: number }[]): number {
  if (coords.length < 2) return 0;
  return coords.reduce((total, c, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    const dlat = (c.latitude - prev.latitude) * Math.PI / 180;
    const dlng = (c.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) *
              Math.cos(c.latitude * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
}

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SportPage() {
  const nav   = useNavigation();
  const route = useRoute<Route>();
  const TH    = useTheme();
  const T     = useT();
  const store = useAppStore();
  const { key: sportName, icon, color, gps: gpsParam } = route.params;

  const isGpsSport = gpsParam ?? false;
  const weight = store.userProfile?.weight ?? 70;

  // Determine sport type
  const sportType = getSportType(sportName, isGpsSport);
  const presets = TARGET_PRESETS[sportType];

  // Mode labels based on sport type
  const modeLabels = {
    free: sportType === 'repetition' ? T('exerciseFreeReps') : sportType === 'timed' ? T('exerciseFreeSport') : T('exerciseFreeRun'),
    target: sportType === 'repetition' ? T('exerciseTargetReps') : sportType === 'timed' ? T('exerciseTargetSport') : T('exerciseTargetRun'),
  };

  // Available target types for this sport
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;

  // ── State ──
  const [page, setPage]           = useState<Page>('prep');
  const [mode, setMode]           = useState<'free' | 'target'>('free');
  const [targetType, setTargetType] = useState<string>(availableTargetTypes[0]);
  const [targetValue, setTargetValue] = useState(presets[availableTargetTypes[0]]?.[0]?.value ?? 0);
  const [sec, setSec]             = useState(0);
  const [pausedSec, setPausedSec] = useState(0);
  const [active, setActive]       = useState(false);
  const [reps, setReps]           = useState(0);
  const [coords, setCoords]       = useState<{ latitude: number; longitude: number; ts: number }[]>([]);
  const [initialPos, setInitialPos] = useState({ latitude: 39.9042, longitude: 116.4074 });
  const [countdown, setCountdown] = useState(3);
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const [lastKmMark, setLastKmMark] = useState(0);
  const [lastKmTs, setLastKmTs]     = useState(0);
  const [sets, setSets]             = useState<ExerciseSet[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [isResting, setIsResting]   = useState(false);
  const [restSec, setRestSec]       = useState(0);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const mapRef      = useRef<any>(null);
  const holdAnim    = useRef(new Animated.Value(0)).current;

  const distKm = computeDistance(coords);
  const calories = estimateCalories(sportName, sec, weight);
  const bg = SPORT_BG_COLORS[sportName] || color || '#4CAF50';

  useKeepAwake();

  // ── Init GPS position ──
  useEffect(() => {
    if (isGpsSport) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setInitialPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      })();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      locationSub.current?.remove();
    };
  }, []);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [page, countdown]);

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
    const totalReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    let reached = false;
    if (targetType === 'distance' && distKm >= targetValue) reached = true;
    if (targetType === 'time' && sec >= targetValue) reached = true;
    if (targetType === 'calories' && calories >= targetValue) reached = true;
    if (targetType === 'reps' && totalReps >= targetValue) reached = true;
    if (reached) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [sec, distKm, calories, reps, currentSetReps, sets]);

  // ── GPS tracking ──
  const startGpsTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      loc => {
        const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, ts: Date.now() };
        setCoords(arr => [...arr, c]);
        mapRef.current?.moveCamera({ target: c, zoom: 16 }, 300);
      },
    );
  };

  const stopGpsTracking = () => {
    locationSub.current?.remove();
    locationSub.current = null;
  };

  // ── Controls ──
  const handleGo = () => { setCountdown(3); setPage('countdown'); };

  const handlePause = () => {
    setActive(false);
    setPausedSec(sec);
    stopGpsTracking();
    setPage('paused');
  };

  const handleContinue = () => {
    setPage('active');
    setActive(true);
    if (isGpsSport) startGpsTracking();
  };

  const handleHoldStart = () => {
    holdAnim.setValue(0);
    holdAnim.removeAllListeners();
    const anim = Animated.timing(holdAnim, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.addListener(({ value }) => {
      if (value >= 1) {
        holdAnim.removeAllListeners();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPage('report');
      }
    });
    anim.start();
  };

  const handleHoldEnd = () => {
    holdAnim.removeAllListeners();
    holdAnim.stopAnimation(() => holdAnim.setValue(0));
  };

  const handleSave = () => {
    stopGpsTracking();
    const finalReps = sportType === 'repetition' ? (reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps) : undefined;
    if (sec > 0 || (finalReps && finalReps > 0)) {
      const entry = {
        sportKey: sportName, sportIcon: icon, durationSec: sec,
        timestamp: Date.now(), isGpsSport: isGpsSport,
        distanceKm: isGpsSport ? distKm : undefined,
        calories,
        avgPace: isGpsSport && distKm > 0 ? sec / distKm : undefined,
        trackPoints: isGpsSport ? coords.map(c => ({ lat: c.latitude, lng: c.longitude, ts: c.ts })) : undefined,
        segmentPaces: segmentPaces.length > 0 ? segmentPaces : undefined,
        mode,
        target: mode === 'target' ? { type: targetType, value: targetValue } : undefined,
        reps: finalReps,
        sets: sets.length > 0 ? sets : undefined,
        met: MET_MAP[sportName],
      };
      store.addExercise(entry);
      if (useAppStore.getState().healthSyncEnabled) {
        import('../health/HealthService').then(({ writeWorkout }) => {
          writeWorkout({ ...entry, id: '', updatedAt: 0 }).catch(e => console.warn('[Health] write failed:', e));
        });
      }
    }
    nav.goBack();
  };

  const totalRepsForProgress = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
  const targetProgress = mode === 'target' ? (() => {
    if (targetType === 'distance') return Math.min(distKm / targetValue, 1);
    if (targetType === 'time') return Math.min(sec / targetValue, 1);
    if (targetType === 'calories') return Math.min(calories / targetValue, 1);
    if (targetType === 'reps') return Math.min(totalRepsForProgress / targetValue, 1);
    return 0;
  })() : 0;

  // Target type labels
  const targetTypeLabels: Record<string, string> = {
    distance: T('exerciseDistanceGoal'),
    time: T('exerciseTimeGoal'),
    calories: T('exerciseCalGoal'),
    reps: T('exerciseRepsGoal'),
  };

  // ── PREP PAGE ──
  if (page === 'prep') {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{sportName}</Text>
            <TouchableOpacity onPress={() => nav.goBack()}>
              <X size={22} color="rgba(255,255,255,.6)" />
            </TouchableOpacity>
          </View>

          {/* Mode toggle — available for all sport types */}
          <View style={{ flexDirection: 'row', marginTop: 24, backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 3 }}>
            {(['free', 'target'] as const).map(m => (
              <TouchableOpacity key={m} onPress={() => setMode(m)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === m ? 'rgba(255,255,255,.25)' : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: mode === m ? '700' : '400', fontSize: FONT_BODY }}>
                  {modeLabels[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target selection */}
          {mode === 'target' && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {availableTargetTypes.map(t => (
                  <TouchableOpacity key={t} onPress={() => { setTargetType(t); setTargetValue(presets[t]?.[0]?.value ?? 0); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: targetType === t ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                    <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: targetType === t ? '700' : '400' }}>
                      {targetTypeLabels[t] ?? t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(presets[targetType as keyof typeof presets] ?? []).map((p: { label: string; value: number }) => (
                  <TouchableOpacity key={p.label} onPress={() => setTargetValue(p.value)}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: targetValue === p.value ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                    <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: targetValue === p.value ? '700' : '400' }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Big circle */}
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
            <View style={{ width: 180, height: 180, borderRadius: 90, borderWidth: 4, borderColor: 'rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center' }}>
              {sportType === 'repetition' ? (
                <>
                  <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseReps')}</Text>
                </>
              ) : sportType === 'timed' ? (
                <>
                  <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0:00</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseMin')}</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0.00</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>km</Text>
                </>
              )}
            </View>
          </View>

          {/* GO button */}
          <TouchableOpacity onPress={handleGo}
            style={{ height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: bg, letterSpacing: 4 }}>GO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── COUNTDOWN PAGE ──
  if (page === 'countdown') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{countdown}</Text>
        <Text style={{ fontSize: FONT_TITLE, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{T('exerciseCountdown')}</Text>
      </View>
    );
  }

  // ── PAUSED PAGE ──
  if (page === 'paused') {
    const circumference = 2 * Math.PI * 40;
    const pausedReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{isGpsSport ? distKm.toFixed(2) : sportType === 'repetition' ? pausedReps : Math.floor(sec / 60)}</Text>
        <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{isGpsSport ? 'km' : sportType === 'repetition' ? T('exerciseReps') : 'min'}</Text>
        <Text style={{ fontSize: FONT_STAT_CARD, color: 'rgba(255,255,255,.7)', marginTop: 16 }}>{fmt(sec)}</Text>

        <View style={{ flexDirection: 'row', marginTop: 60, gap: 20, alignItems: 'center' }}>
          {/* Continue */}
          <TouchableOpacity onPress={handleContinue}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={24} color="#fff" />
          </TouchableOpacity>

          {/* Hold to finish */}
          <TouchableOpacity
            onPressIn={handleHoldStart}
            onPressOut={handleHoldEnd}
            activeOpacity={0.8}
            style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: COLORS.RED, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,.15)' }}>
            <Animated.View
              style={{
                position: 'absolute', top: -4, left: -4,
                width: 88, height: 88,
                transform: [{ rotate: '-90deg' }],
              }}
              collapsable={false}
            >
              <Animated.View
                style={{
                  width: 88, height: 88,
                  borderRadius: 44,
                  borderWidth: 4,
                  borderColor: 'transparent',
                  borderTopColor: COLORS.RED,
                  borderRightColor: COLORS.RED,
                  transform: [{
                    rotate: holdAnim.interpolate({
                      inputRange: [0, 1], outputRange: ['0deg', '360deg'],
                    }),
                  }],
                }}
              />
            </Animated.View>
            <Text style={{ fontSize: FONT_SUB, color: COLORS.RED, fontWeight: '700', textAlign: 'center' }}>{T('exerciseFinishConfirm')}</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={() => { stopGpsTracking(); nav.goBack(); }}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Linear progress bar */}
        <View style={{ marginTop: 32, width: 200, height: 4, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, backgroundColor: COLORS.RED, borderRadius: 2, width: holdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
      </View>
    );
  }

  // ── REPORT PAGE ──
  if (page === 'report') {
    const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#333' }}>{T('exerciseReport')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: '#888', marginTop: 4 }}>{sportName} · {new Date().toLocaleDateString('zh-CN')}</Text>
        </View>

        {/* Map snapshot (static) */}
        {isGpsSport && coords.length > 1 && (
          <View style={{ height: 200, margin: 16, borderRadius: 16, overflow: 'hidden' }}>
            <MapView
              style={{ flex: 1 }}
              initialCameraPosition={{ target: initialPos, zoom: 14 }}
              myLocationEnabled={false}
              zoomGesturesEnabled={false}
              scrollGesturesEnabled={false}
            >
              <Polyline points={coords} color={color} width={4} />
            </MapView>
          </View>
        )}

        {/* Data cards — dynamic based on sport type */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
          {[
            ...(sportType === 'gps' ? [{ label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km` }] : []),
            ...(sportType === 'repetition' ? [{ label: T('exerciseTotalReps'), value: `${displayReps}` }] : []),
            { label: T('exerciseTime'), value: fmt(sec) },
            ...(sportType === 'gps' ? [{ label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) }] : []),
            { label: T('exerciseTotalCal'), value: `${calories} kcal` },
          ].map(d => (
            <View key={d.label} style={{ width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: FONT_SUB, color: '#888' }}>{d.label}</Text>
              <Text style={{ fontSize: FONT_CLOSE, fontWeight: '800', color: '#333', marginTop: 4 }}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Sets breakdown for repetition sports */}
        {sets.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#333', marginBottom: 8 }}>{T('exerciseSets')}</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
              {sets.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < sets.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                  <Text style={{ fontSize: FONT_BODY, color: '#333' }}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#333' }}>{s.reps} {T('exerciseReps')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Segment paces */}
        {segmentPaces.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#333', marginBottom: 8 }}>{T('exerciseSegmentPace')}</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
              {segmentPaces.map((p, i) => {
                const isBest = p === bestPace;
                const color = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
                return (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < segmentPaces.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                    <Text style={{ fontSize: FONT_BODY, color: '#333' }}>{i + 1} km</Text>
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color }}>{formatPace(p)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Save button */}
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={handleSave}
            style={{ height: 56, borderRadius: 28, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>{T('exerciseSave')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ACTIVE PAGE (GPS) ──
  if (page === 'active' && isGpsSport) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Map area (40%) */}
        <View style={{ flex: 4 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialCameraPosition={{ target: initialPos, zoom: 16 }}
            myLocationEnabled
          >
            {coords.length > 1 && <Polyline points={coords} color={color} width={4} />}
          </MapView>
        </View>

        {/* Data area (60%) */}
        <View style={{ flex: 6, backgroundColor: '#1a1a2e', padding: 20 }}>
          {/* Target progress */}
          {mode === 'target' && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${targetProgress * 100}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
                {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
              </Text>
            </View>
          )}

          {/* Main data row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{distKm.toFixed(2)}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>km</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseTime')}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{formatPace(distKm > 0 ? sec / distKm : 0)}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exercisePace')}</Text>
            </View>
          </View>

          {/* Calories */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: FONT_TITLE, color: COLORS.ORANGE, fontWeight: '700' }}>{calories} kcal</Text>
          </View>

          {/* Pause button */}
          <TouchableOpacity onPress={handlePause}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Pause size={32} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ACTIVE PAGE (Non-GPS) ──
  const currentSet = sets.length + 1;
  const displayReps = reps || (sets.reduce((s, set) => s + set.reps, 0) + currentSetReps);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: FONT_CLOSE }}>{icon}</Text>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#bbb' }}>{sportName}</Text>
          </View>
          {sportType === 'repetition' && (
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
              {T('exerciseSet').replace('{n}', String(currentSet))} · {sets.reduce((s, set) => s + set.reps, 0)} {T('exerciseReps')}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        {/* Rest timer overlay */}
        {isResting && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: COLORS.ORANGE }}>{restSec}</Text>
            <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.7)', marginTop: 8 }}>{T('exerciseRestTime')}</Text>
            <TouchableOpacity onPress={() => { setIsResting(false); setRestSec(0); }}
              style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.15)' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '600' }}>{T('exerciseSkip')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main display */}
        {sportType === 'repetition' ? (
          <>
            <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{currentSetReps}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseReps')}</Text>
            {/* Rep controls */}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 16, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setCurrentSetReps(r => Math.max(0, r - 1))}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentSetReps(r => r + 1)}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentSetReps(r => r + 5)}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_TITLE }}>+5</Text>
              </TouchableOpacity>
            </View>
            {/* Complete set button */}
            {currentSetReps > 0 && (
              <TouchableOpacity onPress={() => {
                setSets(prev => [...prev, { reps: currentSetReps, restSec: 60 }]);
                setCurrentSetReps(0);
                setIsResting(true);
                setRestSec(60);
              }}
                style={{ marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: `${COLORS.GREEN}30`, borderWidth: 1, borderColor: COLORS.GREEN }}>
                <Text style={{ color: COLORS.GREEN, fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseSetComplete')}</Text>
              </TouchableOpacity>
            )}
            {/* Target progress for reps */}
            {mode === 'target' && targetType === 'reps' && (
              <View style={{ marginTop: 16, width: '100%', paddingHorizontal: 20 }}>
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 6, width: `${targetProgress * 100}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
                  {displayReps} / {targetValue} {T('exerciseReps')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{Math.floor(sec / 60) || 0}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseTotalBurn')}</Text>
            <Text style={{ fontSize: FONT_STAT_CARD, color: COLORS.ORANGE, marginTop: 8 }}>{calories} kcal</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.3)', marginTop: 6 }}>{MET_MAP[sportName] ?? 4} {T('exerciseMet')}</Text>
            {mode === 'target' && targetType === 'time' && sec < targetValue && (
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseEstRemaining')} {fmt(targetValue - sec)}</Text>
            )}
          </>
        )}

        <View style={{ flexDirection: 'row', marginTop: 40, gap: 40 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{T('exerciseTotalDuration')}</Text>
          </View>
        </View>

        {/* Target progress for time/calories */}
        {mode === 'target' && targetType !== 'reps' && (
          <View style={{ marginTop: 16, width: '100%', paddingHorizontal: 40 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${targetProgress * 100}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
              {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* Pause button — routes to paused page with hold-to-finish confirmation */}
      <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' }}>
        <TouchableOpacity onPress={handlePause}
          style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Pause size={32} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
