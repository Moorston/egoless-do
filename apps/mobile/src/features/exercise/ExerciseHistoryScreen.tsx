import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MapView, Polyline } from 'react-native-amap3d';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, getSportType } from '@egoless-do/core';
import type { ExerciseEntry } from '@egoless-do/core';

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function DetailCard({ e, TH, P, T }: { e: ExerciseEntry; TH: any; P: string; T: (k: string) => string }) {
  const trackCoords = (e.trackPoints ?? []).map(p => ({ latitude: p.lat, longitude: p.lng }));
  const center = trackCoords.length > 0 ? trackCoords[0] : { latitude: 39.9042, longitude: 116.4074 };
  const bestPace = (e.segmentPaces ?? []).length > 0 ? Math.min(...(e.segmentPaces ?? [])) : 0;
  const sportType = e.isGpsSport ? 'gps' as const : getSportType(e.sportKey, false);

  return (
    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: TH.border, paddingTop: 12 }}>
      {/* Map snapshot */}
      {trackCoords.length > 1 && (
        <View style={{ height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <MapView
            style={{ flex: 1 }}
            initialCameraPosition={{ target: center, zoom: 14 }}
            myLocationEnabled={false}
            zoomGesturesEnabled={false}
            scrollGesturesEnabled={false}
          >
            <Polyline points={trackCoords} color={P} width={4} />
          </MapView>
        </View>
      )}

      {/* Data cards — dynamic based on sport type */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {sportType === 'gps' && e.distanceKm ? (
          <View style={{ width: '47%', backgroundColor: `${P}15`, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseDistance')}</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{e.distanceKm.toFixed(2)} km</Text>
          </View>
        ) : null}
        {sportType === 'repetition' && e.reps != null ? (
          <View style={{ width: '47%', backgroundColor: `${P}15`, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalReps')}</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{e.reps}</Text>
          </View>
        ) : null}
        <View style={{ width: '47%', backgroundColor: `${P}15`, borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTime')}</Text>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}</Text>
        </View>
        {sportType === 'gps' && e.avgPace ? (
          <View style={{ width: '47%', backgroundColor: `${P}15`, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseAvgPace')}</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{formatPace(e.avgPace)}</Text>
          </View>
        ) : null}
        {e.calories ? (
          <View style={{ width: '47%', backgroundColor: `${P}15`, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('exerciseTotalCal')}</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{e.calories} kcal</Text>
          </View>
        ) : null}
      </View>

      {/* Sets breakdown for repetition sports */}
      {(e.sets ?? []).length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 6 }}>{T('exerciseSets')}</Text>
          <View style={{ backgroundColor: `${P}10`, borderRadius: 10, padding: 10 }}>
            {(e.sets ?? []).map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: i < (e.sets ?? []).length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{s.reps} {T('exerciseReps')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Segment paces */}
      {(e.segmentPaces ?? []).length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text, marginBottom: 6 }}>{T('exerciseSegmentPace')}</Text>
          <View style={{ backgroundColor: `${P}10`, borderRadius: 10, padding: 10 }}>
            {(e.segmentPaces ?? []).map((p, i) => {
              const isBest = p === bestPace;
              const c = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: i < (e.segmentPaces ?? []).length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{i + 1} km</Text>
                  <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: c }}>{formatPace(p)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export default function ExerciseHistoryScreen() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const log = store.exerciseLog ?? [];
  const totalMin = Math.round(log.reduce((s, e) => s + e.durationSec, 0) / 60);
  const totalCount = log.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <ScreenHeader title={T('exerciseHistory')} onBack={() => nav.goBack()} />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card style={{ flex: 1, alignItems: 'center', padding: 14 }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: P }}>{totalMin}</Text>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('exerciseMin')}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: 14 }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: P }}>{totalCount}</Text>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('exerciseTotalCount')}</Text>
          </Card>
        </View>

        {log.length === 0 && (
          <Text style={{ color: TH.sub, textAlign: 'center', marginTop: 60, fontSize: FONT_BODY }}>
            {T('exerciseNoHistory')}
          </Text>
        )}

        {log.map((e) => {
          const isExpanded = expandedId === e.id;
          return (
            <TouchableOpacity key={e.id} activeOpacity={0.8}
              onPress={() => setExpandedId(isExpanded ? null : e.id)}>
              <Card style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: FONT_STAT_SECTION }}>{e.sportIcon}</Text>
                    <View>
                      <Text style={{ color: TH.text, fontWeight: '600' }}>{e.sportKey}</Text>
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB, marginTop: 2 }}>
                        {new Date(e.timestamp).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: P, fontWeight: '700', fontSize: FONT_BODY }}>
                      {Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}
                    </Text>
                    {e.reps != null ? (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{e.reps} {T('exerciseReps')}</Text>
                    ) : e.distanceKm ? (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{e.distanceKm.toFixed(2)} km</Text>
                    ) : null}
                    {e.calories ? (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{e.calories} kcal</Text>
                    ) : null}
                  </View>
                </View>
                {isExpanded && <DetailCard e={e} TH={TH} P={P} T={T} />}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(T('exerciseDeleteConfirm'), '', [
                      { text: T('cancel'), style: 'cancel' },
                      { text: T('commonDelete'), style: 'destructive', onPress: () => store.deleteExercise(e.id) },
                    ]);
                  }}
                  style={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>x</Text>
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
