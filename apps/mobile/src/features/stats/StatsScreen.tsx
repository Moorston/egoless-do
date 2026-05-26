import React, { useMemo } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { COLORS, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, buildHeatmapGrid } from '@egoless-do/core';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import HeatmapGrid from '../../components/charts/HeatmapGrid';

const CHART_W = Dimensions.get('window').width - 64; // 16 screen + 16 card padding each side

export default function StatsScreen() {
  const TH    = useTheme();
  const T     = useT();
  const store = useAppStore();
  const P     = TH.primary;

  const activeHabits = (store.habits ?? []).filter(h => h.status === 'inProgress').length;
  const totalCal     = (store.foodLog ?? []).reduce((a, f) => a + (f.calories ?? 0), 0);

  // Exercise stats
  const exerciseLog = store.exerciseLog ?? [];
  const now = Date.now();
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const monthStart = now - 30 * 24 * 3600 * 1000;
  const weekKm = exerciseLog.filter(e => e.timestamp >= weekStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const monthKm = exerciseLog.filter(e => e.timestamp >= monthStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
  const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;

  // Chart data (memoized)
  const weightData = useMemo(() => aggregateWeightData(store.checkinHistory ?? [], 30), [store.checkinHistory]);
  const heatmapGrid = useMemo(() => buildHeatmapGrid(store.checkinHistory ?? [], 4), [store.checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

  // Key metrics
  const keyMetrics = [
    { label: T('streak'), value: `${store.streak}`, unit: T('days'), icon: '🔥', bg: COLORS.ORANGE },
    { label: T('statsReflections'), value: `${(store.reflections ?? []).length}`, unit: T('fastTimes'), icon: '✦', bg: P },
    { label: T('statsMeditation'), value: `${store.totalMedMinutes}`, unit: T('medMinutes'), icon: '☯', bg: COLORS.GREEN },
    { label: T('statsActiveHabits'), value: `${activeHabits}`, unit: T('habitDays'), icon: '◇', bg: COLORS.BLUE },
    { label: T('foodTodayKcal'), value: `${totalCal}`, unit: 'kcal', icon: '🍽', bg: '#F59E0B' },
    { label: T('checkinWater'), value: `${Math.round(store.waterMl / store.waterGoal * 100)}`, unit: '%', icon: '💧', bg: COLORS.BLUE },
  ];

  // Exercise metrics
  const exerciseMetrics = [
    { label: T('exerciseWeekKm'), value: `${weekKm.toFixed(1)}`, unit: 'km', icon: '📅', bg: '#00897B' },
    { label: T('exerciseMonthKm'), value: `${monthKm.toFixed(1)}`, unit: 'km', icon: '📆', bg: '#5C6BC0' },
    { label: T('exerciseBestPace'), value: bestPace > 0 ? `${Math.floor(bestPace / 60)}:${String(Math.floor(bestPace % 60)).padStart(2, '0')}` : '--', unit: '/km', icon: '⚡', bg: '#FF6F00' },
    { label: T('exerciseTotalTime'), value: `${Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60)}`, unit: T('exerciseMin'), icon: '🏃', bg: '#E91E63' },
    { label: T('exerciseTotalCount'), value: `${exerciseLog.length}`, unit: T('fastTimes'), icon: '🏋', bg: '#9C27B0' },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={T('statsTitle')} subtitle={T('statsOverview')} compact />

        {/* ── Key Metrics ── */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: TH.sub, marginBottom: 10 }}>{T('statsKeyMetrics')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {keyMetrics.map(s => (
            <View key={s.label} style={{
              width: '47%', backgroundColor: s.bg, borderRadius: 14,
              padding: 14, gap: 3,
            }}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                {s.value}<Text style={{ fontSize: 14, fontWeight: '400' }}> {s.unit}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Weight Trend (conditional) ── */}
        {weightData.length >= 2 && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
              📈 {T('statsWeightTrend')}
            </Text>
            <LineChart data={weightData.map(d => d.value)} labels={weightData.map(d => d.date)}
              width={CHART_W} height={160} color="#E91E63" showArea suffix={T('statsKg')} />
          </Card>
        )}

        {/* ── Check-in Heatmap ── */}
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
            📅 {T('statsCheckinHeatmap')}
          </Text>
          <HeatmapGrid grid={heatmapGrid}
            activeColor={P} inactiveColor={`${P}18`} todayBorderColor={P} />
        </Card>

        {/* ── Daily Calories (conditional) ── */}
        {caloriesData.some(d => d.value > 0) && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
              📊 {T('statsDailyCalories')}
            </Text>
            <BarChart data={caloriesData.map(d => d.value)} labels={caloriesData.map(d => d.label)}
              width={CHART_W} height={150} color="#F59E0B" />
          </Card>
        )}

        {/* ── Exercise Trend (conditional) ── */}
        {exerciseTrendData.some(d => d.value > 0) && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
              🏃 {T('statsExerciseTrend')}
            </Text>
            <LineChart data={exerciseTrendData.map(d => d.value)} labels={exerciseTrendData.map(d => d.label)}
              width={CHART_W} height={160} color="#3B82F6" showArea suffix="km" />
          </Card>
        )}

        {/* ── Exercise Stats Grid ── */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: TH.sub, marginBottom: 10, marginTop: 4 }}>{T('statsExerciseStats')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {exerciseMetrics.map(s => (
            <View key={s.label} style={{
              width: '47%', backgroundColor: s.bg, borderRadius: 14,
              padding: 14, gap: 3,
            }}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                {s.value}<Text style={{ fontSize: 14, fontWeight: '400' }}> {s.unit}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Habit Progress ── */}
        {store.habits.filter(h => h.status === 'inProgress').map(h => (
          <Card key={h.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: 16 }}>{h.name}</Text>
              <Text style={{ color: COLORS.ORANGE, fontWeight: '700' }}>{h.streak}{T('days')}🔥</Text>
            </View>
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                height: 6, backgroundColor: P, borderRadius: 3,
                width: `${Math.min(h.doneDays / h.targetDays * 100, 100)}%`,
              }} />
            </View>
            <Text style={{ color: TH.sub, fontSize: 14, marginTop: 6 }}>
              {h.doneDays}/{h.targetDays} {T('days')} · {Math.round(h.doneDays / h.targetDays * 100)}%
            </Text>
          </Card>
        ))}

        {/* ── Premium Banner ── */}
        <View style={{
          borderRadius: 16, padding: 16,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 4, backgroundColor: '#4C1D95',
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{T('statsUpgrade')}</Text>
            <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 4 }}>
              {T('statsUpgradeDesc')}
            </Text>
          </View>
          <View style={{
            borderWidth: 1, borderColor: 'rgba(255,255,255,.35)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
            backgroundColor: 'rgba(255,255,255,.15)',
          }}>
            <Text style={{ color: '#fff', fontSize: 14 }}>{T('statsLearnMore')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
