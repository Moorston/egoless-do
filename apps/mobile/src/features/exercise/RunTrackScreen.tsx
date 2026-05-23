import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { fmt, COLORS } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';

type Route = RouteProp<RootStackParamList, 'RunTrack'>;

export default function RunTrackScreen() {
  const nav   = useNavigation();
  const route = useRoute<Route>();
  const { key: sportName, icon, color } = route.params;

  const [sec,     setSec]     = useState(0);
  const [active,  setActive]  = useState(false);
  const [coords,  setCoords]  = useState<{ latitude:number; longitude:number }[]>([]);
  const [region,  setRegion]  = useState({
    latitude: 39.9042, longitude: 116.4074,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });

  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const locationSub = useRef<Location.LocationSubscription|null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion(r => ({
          ...r,
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
    })();
    return () => {
      if (timerRef.current)   clearInterval(timerRef.current);
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  const startTracking = async () => {
    setActive(true);
    timerRef.current = setInterval(() => setSec(s => s+1), 1000);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        loc => {
          const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords(arr => [...arr, c]);
          setRegion(r => ({ ...r, ...c }));
        }
      );
    }
  };

  const stopTracking = () => {
    setActive(false);
    if (timerRef.current)    clearInterval(timerRef.current);
    if (locationSub.current)  locationSub.current.remove();
    nav.goBack();
  };

  const pauseTracking = () => {
    setActive(false);
    if (timerRef.current)    clearInterval(timerRef.current);
    if (locationSub.current)  locationSub.current.remove();
  };

  const distKm = coords.length > 1
    ? coords.reduce((total, c, i) => {
        if (i===0) return 0;
        const prev = coords[i-1];
        const dlat = (c.latitude  - prev.latitude)  * Math.PI/180;
        const dlng = (c.longitude - prev.longitude) * Math.PI/180;
        const a = Math.sin(dlat/2)**2 + Math.cos(prev.latitude*Math.PI/180) *
                  Math.cos(c.latitude*Math.PI/180) * Math.sin(dlng/2)**2;
        return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }, 0)
    : 0;

  return (
    <View style={{ flex:1, backgroundColor:'#111' }}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex:1 }}
        region={region}
        showsUserLocation
        followsUserLocation={active}
      >
        {coords.length > 1 && (
          <Polyline coordinates={coords} strokeColor={color} strokeWidth={4} />
        )}
      </MapView>

      {/* Top overlay */}
      <View style={[styles.topOverlay]}>
        <TouchableOpacity onPress={() => nav.goBack()}
          style={styles.backBtn}>
          <Text style={{ color:'#fff', fontSize:20, fontWeight:'600' }}>← 返回</Text>
        </TouchableOpacity>
        <View style={styles.gpsTag}>
          <View style={{ width:8, height:8, borderRadius:4,
            backgroundColor: active ? COLORS.GREEN : '#888' }} />
          <Text style={{ color:'#333', fontSize:16, marginLeft:4 }}>
            {active ? 'GPS 记录中' : 'GPS 未开始'}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.panel}>
        <View style={{ flexDirection:'row', justifyContent:'space-around', marginBottom:16 }}>
          {[
            { val: distKm > 0 ? distKm.toFixed(2) : '--', label:'距离 (km)' },
            { val: fmt(sec),  label:'时间' },
            { val: sec > 0 && distKm > 0
                ? `${(sec/60/distKm).toFixed(1)}'`
                : "--'--\"",
              label:'配速 (min/km)' },
          ].map(({ val, label }) => (
            <View key={label} style={{ alignItems:'center' }}>
              <Text style={{ fontWeight:'800', fontSize:26, color:'#fff',
                fontVariant:['tabular-nums'] }}>{val}</Text>
              <Text style={{ fontSize:16, color:'#aaa', marginTop:3 }}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection:'row', gap:10 }}>
          {!active ? (
            <TouchableOpacity onPress={startTracking}
              style={[styles.btn, { backgroundColor: color, flex:1 }]}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>
                {coords.length>0 ? '▶ 继续' : `开始 ${sportName}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={pauseTracking}
                style={[styles.btn, { backgroundColor:'#FF9800', flex:1 }]}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>⏸ 暂停</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopTracking}
                style={[styles.btn, { backgroundColor:COLORS.RED, flex:1 }]}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>⏹ 结束</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position:'absolute', top:56, left:0, right:0,
    flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', paddingHorizontal:16,
  },
  backBtn: {
    backgroundColor:'rgba(0,0,0,.6)', paddingHorizontal:14,
    paddingVertical:8, borderRadius:20,
  },
  gpsTag: {
    backgroundColor:'rgba(255,255,255,.9)', paddingHorizontal:12,
    paddingVertical:6, borderRadius:20, flexDirection:'row', alignItems:'center',
  },
  panel: {
    backgroundColor:'#1a1a1a', padding:20, paddingBottom:40,
  },
  btn: {
    padding:16, borderRadius:12, alignItems:'center',
  },
});
