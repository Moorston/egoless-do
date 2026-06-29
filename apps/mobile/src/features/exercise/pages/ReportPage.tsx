import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_CLOSE, fmt, formatPace } from '@egoless-do/core';
import type { ExercisePageProps } from './types';


export default function ReportPage(props: ExercisePageProps) {
  const {
    sportName, sportType, sec, isGpsSport, distKm, sets, currentSetReps, totalReps,
    calories, coords, initialPos, amapReady, MapView, Polyline, segmentPaces,
    handleSave, TH, T,
  } = props;

  const displayReps = totalReps;
  const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: TH.cardSolid }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('exerciseReport')}</Text>
        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{sportName} · {new Date().toLocaleDateString('zh-CN')}</Text>
      </View>

      {/* Map snapshot (GPS) */}
      {isGpsSport && coords.length > 1 && (
        <View style={{ height: 200, margin: 16, borderRadius: 16, overflow: 'hidden' }}>
          {amapReady && MapView ? (
            <MapView style={{ flex: 1 }} initialCameraPosition={{ target: initialPos, zoom: 14 }} myLocationEnabled={false} zoomGesturesEnabled={false} scrollGesturesEnabled={false}>
              {Polyline && <Polyline coordinates={coords} color={COLORS.GREEN} width={4} />}
            </MapView>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />
          )}
        </View>
      )}

      {/* Data cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
        {[
          ...(sportType === 'gps' ? [{ label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km` }] : []),
          ...(sportType === 'repetition' ? [{ label: T('exerciseTotalReps'), value: `${displayReps}` }] : []),
          { label: T('exerciseTime'), value: fmt(sec) },
          ...(sportType === 'gps' ? [{ label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) }] : []),
          { label: T('exerciseTotalCal'), value: `${calories} kcal` },
        ].map(d => (
          <View key={d.label} style={{ width: '47%', backgroundColor: TH.cardSolid, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{d.label}</Text>
            <Text style={{ fontSize: FONT_CLOSE, fontWeight: '800', color: TH.text, marginTop: 4 }}>{d.value}</Text>
          </View>
        ))}
      </View>

      {/* Sets breakdown */}
      {sets.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSets')}</Text>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
            {sets.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < sets.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{s.reps} {T('exerciseReps')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Segment paces */}
      {segmentPaces.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSegmentPace')}</Text>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
            {segmentPaces.map((p, i) => {
              const isBest = p === bestPace;
              const paceColor = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < segmentPaces.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{i + 1} km</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: paceColor }}>{formatPace(p)}</Text>
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
