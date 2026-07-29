import { COLORS, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_CLOSE, FONT_BACK, FONT_STAT_SECTION, FONT_SMALL, FONT_BADGE, FONT_HERO, fmt, formatPace, formatDate, dateStr } from '@egoless-do/core';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore, type MobileStore } from '../../../store/useAppStore';

import type { ExercisePageProps } from './types';


export default function ReportPage(props: ExercisePageProps) {
  const {
    sportName, sportType, sec, isGpsSport, distKm, sets, totalReps,
    calories, coords, initialPos, amapReady, MapView, Polyline, segmentPaces,
    handleSave, TH, T,
  } = props;

  const language = useAppStore(useShallow((s: MobileStore) => s.language));
  const exerciseLog = useAppStore(useShallow((s: MobileStore) => s.exerciseLog));
  const waterGoal = useAppStore(useShallow((s: MobileStore) => s.waterGoal)); // placeholder for daily cal goal
  const displayReps = totalReps;
  const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;

  // 7-day history for the same sport
  const weekHistory = useMemo(() => {
    const logs = (exerciseLog ?? []).filter((e: Record<string, unknown>) =>
      !e.deleted && e.sportKey === sportName
    );
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return logs
      .filter((e: Record<string, unknown>) => (e.timestamp as number) >= sevenDaysAgo)
      .sort((a, b) => ((a.timestamp as number) ?? 0) - ((b.timestamp as number) ?? 0))
      .slice(-7)
      .map((e: Record<string, unknown>) => ({
        date: dateStr(new Date(e.timestamp as number)),
        durationSec: (e.durationSec as number) ?? 0,
        calories: (e.calories as number) ?? 0,
        distanceKm: (e.distanceKm as number) ?? 0,
      }));
  }, [exerciseLog, sportName]);

  // Daily calorie goal (estimated from BMR or default)
  const dailyCalGoal = 2000;
  const calPercent = Math.min(100, Math.round((calories / dailyCalGoal) * 100));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: TH.cardSolid }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('exerciseReport')}</Text>
        <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 4 }}>{sportName} · {formatDate(new Date(), language)}</Text>
      </View>

      {/* ── Key metrics cards ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
        {[
          ...(sportType === 'gps' ? [{ label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km`, large: true }] : []),
          { label: T('exerciseTime'), value: fmt(sec), large: true },
          ...(sportType === 'repetition' ? [{ label: T('exerciseTotalReps'), value: `${displayReps}`, unit: T('exerciseReps') }] : []),
          ...(sportType === 'gps' ? [{ label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) }] : []),
          { label: T('exerciseTotalCal'), value: `${calories}`, unit: 'kcal', large: true },
        ].map(d => (
          <View key={d.label} style={{
            width: d.large ? '47%' : '30%',
            backgroundColor: TH.cardSolid,
            borderRadius: 12,
            padding: d.large ? 16 : 12,
          }}>
            <Text style={{ fontSize: d.large ? FONT_BACK() : FONT_STAT_SECTION(), fontWeight: '800', color: TH.text }}>
              {d.value}
            </Text>
            {d.unit ? <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{d.unit}</Text> : null}
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{d.label}</Text>
          </View>
        ))}
      </View>

      {/* ── 7-day comparison ── */}
      {weekHistory.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>
            {T('exerciseLast7Days')}
          </Text>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
            {weekHistory.slice(-7).map((day, i) => {
              const isToday = i === weekHistory.length - 1;
              return (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 6,
                  borderBottomWidth: i < Math.min(weekHistory.length, 7) - 1 ? 1 : 0,
                  borderBottomColor: TH.border,
                }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, width: 48 }}>{day.date.slice(5)}</Text>
                  {/* Duration bar */}
                  <View style={{ flex: 1, height: 16, backgroundColor: TH.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{
                      height: 16,
                      width: `${Math.min(100, (day.durationSec / Math.max(...weekHistory.map(d => d.durationSec), 1)) * 100)}%`,
                      backgroundColor: isToday ? COLORS.GREEN : COLORS.GREEN + '60',
                      borderRadius: 4,
                    }} />
                  </View>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.text, width: 50, textAlign: 'right' }}>
                    {Math.floor(day.durationSec / 60)}min
                  </Text>
                  {day.calories > 0 && (
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, width: 40, textAlign: 'right' }}>
                      {day.calories}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Calorie ring ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>
          {T('exerciseCalBreakdown')}
        </Text>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {/* Simple progress circle */}
          <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: COLORS.GREEN + '30', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            <View style={{
              position: 'absolute',
              width: 64, height: 64,
              borderRadius: 32,
              borderWidth: 6,
              borderColor: 'transparent',
              borderTopColor: COLORS.GREEN,
              transform: [{ rotate: `${calPercent * 3.6}deg` }],
            }} />
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '800', color: TH.text }}>{calPercent}%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: COLORS.GREEN }}>{calories} kcal</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>
              {T('exerciseDailyCal')} {dailyCalGoal} kcal
            </Text>
          </View>
        </View>
      </View>

      {/* ── Map snapshot (GPS) ── */}
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

      {/* ── Sets breakdown ── */}
      {sets.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSets')}</Text>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
            {sets.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < sets.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{s.reps} {T('exerciseReps')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Segment paces ── */}
      {segmentPaces.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSegmentPace')}</Text>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
            {segmentPaces.map((p, i) => {
              const isBest = p === bestPace;
              const paceColor = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < segmentPaces.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{i + 1} km</Text>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: paceColor }}>{formatPace(p)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Save button ── */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={handleSave}
          style={{ height: 56, borderRadius: 28, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('exerciseSave')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
