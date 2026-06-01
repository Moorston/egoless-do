import React, { useMemo } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { COLORS, STATS_GRADIENT, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import {
  Flame, Sparkles, Target, Star, Utensils, Droplets, Shield,
  CalendarDays, Zap, Dumbbell, TrendingUp, BarChart3,
} from 'lucide-react-native';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import CalendarGrid from '../../components/charts/CalendarGrid';

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
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

  // Key metrics
  const graceCount = (store.graceHistory ?? []).length;
  const keyMetrics = [
    { label: T('streak'), value: `${store.streak}`, unit: T('days'), icon: Flame, colors: STATS_GRADIENT[0] },
    { label: T('statsReflections'), value: `${(store.reflections ?? []).length}`, unit: T('fastTimes'), icon: Sparkles, colors: STATS_GRADIENT[1] },
    { label: T('statsMeditation'), value: `${store.totalMedMinutes}`, unit: T('medMinutes'), icon: Target, colors: STATS_GRADIENT[2] },
    { label: T('statsActiveHabits'), value: `${activeHabits}`, unit: T('habitDays'), icon: Star, colors: STATS_GRADIENT[3] },
    { label: T('foodTodayKcal'), value: `${totalCal}`, unit: 'kcal', icon: Utensils, colors: STATS_GRADIENT[0] },
    { label: T('graceStatsTitle'), value: `${graceCount}`, unit: T('graceUsedTimes'), icon: Shield, colors: STATS_GRADIENT[1] },
  ];

  // Exercise metrics
  const exerciseMetrics = [
    { label: T('exerciseWeekKm'), value: `${weekKm.toFixed(1)}`, unit: 'km', icon: CalendarDays, colors: STATS_GRADIENT[2] },
    { label: T('exerciseMonthKm'), value: `${monthKm.toFixed(1)}`, unit: 'km', icon: CalendarDays, colors: STATS_GRADIENT[3] },
    { label: T('exerciseBestPace'), value: bestPace > 0 ? `${Math.floor(bestPace / 60)}:${String(Math.floor(bestPace % 60)).padStart(2, '0')}` : '--', unit: '/km', icon: Zap, colors: STATS_GRADIENT[0] },
    { label: T('exerciseTotalTime'), value: `${Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60)}`, unit: T('exerciseMin'), icon: Dumbbell, colors: STATS_GRADIENT[1] },
    { label: T('exerciseTotalCount'), value: `${exerciseLog.length}`, unit: T('fastTimes'), icon: Dumbbell, colors: STATS_GRADIENT[2] },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={T('statsTitle')} subtitle={T('statsOverview')} compact />

        {/* ── Check-in Calendar ── */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <CalendarDays size={15} color={TH.text} />
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('statsCheckinHeatmap')}</Text>
          </View>
          <CalendarGrid history={store.checkinHistory ?? []}
            primaryColor={P} textColor={TH.text} subColor={TH.sub} borderColor={TH.border} />
        </Card>

        {/* ── Key Metrics ── */}
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.sub, marginBottom: 10 }}>{T('statsKeyMetrics')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {keyMetrics.map(s => (
            <View key={s.label} style={{ width: '48%', borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient
                colors={s.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 16, alignItems: 'center', gap: 6 }}
              >
                <s.icon size={26} color="#fff" />
                <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{s.label}</Text>
                <Text style={{ fontWeight: '700', color: '#fff', fontSize: 26 }}>
                  {s.value}<Text style={{ fontSize: FONT_SUB, fontWeight: '400' }}> {s.unit}</Text>
                </Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* ── Exercise Trend (conditional) ── */}
        {exerciseTrendData.some(d => d.value > 0) && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Dumbbell size={15} color={TH.text} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('statsExerciseTrend')}</Text>
            </View>
            <LineChart data={exerciseTrendData.map(d => d.value)} labels={exerciseTrendData.map(d => d.label)}
              width={CHART_W} height={160} color="#3B82F6" showArea suffix="km" />
          </Card>
        )}

        {/* ── Exercise Stats Grid ── */}
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.sub, marginBottom: 10, marginTop: 4 }}>{T('statsExerciseStats')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {exerciseMetrics.map(s => (
            <View key={s.label} style={{ width: '48%', borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient
                colors={s.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 16, alignItems: 'center', gap: 6 }}
              >
                <s.icon size={26} color="#fff" />
                <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{s.label}</Text>
                <Text style={{ fontWeight: '700', color: '#fff', fontSize: 26 }}>
                  {s.value}<Text style={{ fontSize: FONT_SUB, fontWeight: '400' }}> {s.unit}</Text>
                </Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* ── Weight Trend (conditional) ── */}
        {weightData.length >= 2 && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={15} color={TH.text} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('statsWeightTrend')}</Text>
            </View>
            <LineChart data={weightData.map(d => d.value)} labels={weightData.map(d => d.date)}
              width={CHART_W} height={160} color="#E91E63" showArea suffix={T('statsKg')} />
          </Card>
        )}

        {/* ── Daily Calories (conditional) ── */}
        {caloriesData.some(d => d.value > 0) && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <BarChart3 size={15} color={TH.text} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('statsDailyCalories')}</Text>
            </View>
            <BarChart data={caloriesData.map(d => d.value)} labels={caloriesData.map(d => d.label)}
              width={CHART_W} height={150} color="#F59E0B" />
          </Card>
        )}

        {/* ── Habit Progress ── */}
        {store.habits.filter(h => h.status === 'inProgress').map(h => (
          <Card key={h.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{h.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: COLORS.ORANGE, fontWeight: '700' }}>{h.streak}{T('days')}</Text>
                <Flame size={14} color={COLORS.ORANGE} />
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                height: 6, backgroundColor: P, borderRadius: 3,
                width: `${Math.min(h.doneDays / h.targetDays * 100, 100)}%`,
              }} />
            </View>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, marginTop: 6 }}>
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_BODY }}>{T('statsUpgrade')}</Text>
            <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB, marginTop: 4 }}>
              {T('statsUpgradeDesc')}
            </Text>
          </View>
          <View style={{
            borderWidth: 1, borderColor: 'rgba(255,255,255,.35)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
            backgroundColor: 'rgba(255,255,255,.15)',
          }}>
            <Text style={{ color: '#fff', fontSize: FONT_SUB }}>{T('statsLearnMore')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
