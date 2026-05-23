import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme, useT } from '../../components/UI';
import { SPORT_BG_COLORS, fmt, COLORS } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';

type Route = RouteProp<RootStackParamList, 'Sport'>;

const GPS_SPORTS = new Set(['行走', '跑步', '骑行']);

export default function SportPage() {
  const nav   = useNavigation();
  const route = useRoute<Route>();
  const TH    = useTheme();
  const T     = useT();
  const { key: sportName, icon, color } = route.params;

  const [page, setPage]     = useState<'prep' | 'active'>('prep');
  const [sec, setSec]       = useState(0);
  const [active, setActive] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [region, setRegion] = useState({
    latitude: 39.9042, longitude: 116.4074,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const isGpsSport  = GPS_SPORTS.has(sportName);

  useEffect(() => {
    if (isGpsSport) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setRegion(r => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
        }
      })();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      locationSub.current?.remove();
    };
  }, []);

  const startTracking = async () => {
    setActive(true);
    timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    if (isGpsSport) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        locationSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
          loc => {
            const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCoords(arr => [...arr, c]);
            setRegion(r => ({ ...r, ...c }));
          },
        );
      }
    }
  };

  const pauseTracking = () => {
    setActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    locationSub.current?.remove();
  };

  const stopTracking = () => {
    pauseTracking();
    nav.goBack();
  };

  const distKm = coords.length > 1
    ? coords.reduce((total, c, i) => {
        if (i === 0) return 0;
        const prev = coords[i - 1];
        const dlat = (c.latitude - prev.latitude) * Math.PI / 180;
        const dlng = (c.longitude - prev.longitude) * Math.PI / 180;
        const a = Math.sin(dlat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) *
                  Math.cos(c.latitude * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
        return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }, 0)
    : 0;

  const bg = SPORT_BG_COLORS[sportName] || color || '#4CAF50';

  // ── GPS Active Page ──
  if (page === 'active' && isGpsSport) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          region={region}
          showsUserLocation
          followsUserLocation={active}
        >
          {coords.length > 1 && (
            <Polyline coordinates={coords} strokeColor={color} strokeWidth={4} />
          )}
        </MapView>

        {/* Top overlay */}
        <View style={styles.topOverlay}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }}>{T('exerciseBack')}</Text>
          </TouchableOpacity>
          <View style={styles.gpsTag}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? COLORS.GREEN : '#888' }} />
            <Text style={{ color: '#333', fontSize: 12, marginLeft: 4 }}>
              {active ? T('exerciseGpsActive') : T('exerciseGpsInactive')}
            </Text>
          </View>
        </View>

        {/* Data panel */}
        <View style={styles.dataPanel}>
          {[
            { val: distKm > 0 ? distKm.toFixed(2) : '--', label: T('exerciseDistance') },
            { val: fmt(sec), label: T('exerciseTime') },
            { val: sec > 0 && distKm > 0 ? `${Math.floor(sec / 60 / distKm)}:${String(Math.floor((sec / distKm) % 60)).padStart(2, '0')}` : '--:--', label: T('exercisePace') },
          ].map(({ val, label }) => (
            <View key={label} style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 26, color: '#fff', fontVariant: ['tabular-nums'] }}>{val}</Text>
              <Text style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomPanel}>
          {!active ? (
            <TouchableOpacity onPress={startTracking}
              style={[styles.gpsGoBtn, { backgroundColor: color }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {coords.length > 0 ? `▶ ${T('exerciseResume')}` : `${T('exerciseStart')} ${sportName}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={pauseTracking}
                style={[styles.gpsBtn, { backgroundColor: '#FF9800' }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⏸ {T('exercisePause')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopTracking}
                style={[styles.gpsBtn, { backgroundColor: COLORS.RED }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⏹ {T('exerciseEnd')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Non-GPS Active Page ──
  if (page === 'active') {
    return (
      <View style={{ flex: 1, backgroundColor: '#2a2835' }}>
        <View style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.08)', paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>{icon}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#bbb' }}>{sportName}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={{ color: '#aaa' }}>❤️</Text>
              <Text style={{ color: '#22C55E' }}>↗</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 28, paddingTop: 32 }}>
            <Text style={{ fontSize: 88, fontWeight: '900', color: '#fff' }}>{Math.floor(sec / 60) || 0}</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginTop: 6, marginBottom: 48 }}>{T('exerciseTotalBurn')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 38, fontWeight: '800', color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{T('exerciseTotalDuration')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          <TouchableOpacity onPress={() => setActive(v => !v)}
            style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, color: '#333' }}>{active ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.goBack()}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Prep Page ──
  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
            <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>{sportName}</Text>
          </View>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ color: TH.sub, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <View style={{
            width: '100%', borderRadius: 18, overflow: 'hidden', height: 260,
            backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 72 }}>{icon}</Text>
            <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(255,255,255,.85)', borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={{ fontSize: 12, color: '#333', lineHeight: 18, flex: 1 }}>
                {isGpsSport ? `${sportName}${T('exerciseTip')}` : `${sportName}${T('exerciseTip')}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => { setSec(0); setCoords([]); setPage('active'); startTracking(); }}
            style={{
              width: '100%', height: 64, borderRadius: 32, backgroundColor: bg,
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: 2 }}>GO</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ color: TH.sub, fontSize: 13 }}>{T('exerciseBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute', top: 56, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,.6)', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20,
  },
  gpsTag: {
    backgroundColor: 'rgba(255,255,255,.9)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center',
  },
  dataPanel: {
    position: 'absolute', top: 100, left: 16, right: 16,
    flexDirection: 'row', gap: 12, zIndex: 400,
  },
  bottomPanel: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 24,
  },
  gpsGoBtn: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
  },
  gpsBtn: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
  },
});
