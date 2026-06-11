import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { Card, useTheme, useT } from '../../components/UI';
import { COLORS, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, estimateFastingKcal, getTodayMedMinutes, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_SECTION } from '@egoless-do/core';
import {
  Flame, Sparkles, Target, Star, Utensils, Shield,
  CalendarDays, Zap, Dumbbell, TrendingUp, BarChart3,
  Clock, ClipboardList,
} from 'lucide-react-native';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import CalendarGrid from '../../components/charts/CalendarGrid';
import SimpleHeader from '../../navigation/SimpleHeader';

const CHART_W = Dimensions.get('window').width - 64;

const TABS = ['overview', 'fasting', 'meditation', 'exercise', 'reflections', 'plan'] as const;
type TabKey = typeof TABS[number];

const TAB_I18N: Record<TabKey, string> = {
  overview: 'statsTabOverview',
  fasting: 'statsTabFasting',
  meditation: 'statsTabMeditation',
  exercise: 'statsTabExercise',
  reflections: 'statsTabReflections',
  plan: 'statsTabPlan',
};

const CHART_TABS = ['exercise', 'weight', 'calories'] as const;
type ChartKey = typeof CHART_TABS[number];

export default function StatsScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const P = TH.primary;
  const nav = useRootNavigation();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeChart, setActiveChart] = useState<ChartKey>('exercise');

  // ── Common data ──
  const exerciseLog = store.exerciseLog ?? [];
  const now = Date.now();
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const monthStart = now - 30 * 24 * 3600 * 1000;

  // ── Fasting stats ──
  const fastingHistory = store.fastingHistory ?? [];
  const totalFastCount = fastingHistory.length;
  const totalFastHours = useMemo(() => {
    const totalSec = fastingHistory.reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [fastingHistory]);
  const fastingDates = useMemo(() => {
    if (!fastingHistory.length) return [] as string[];
    return [...new Set(fastingHistory.map(f => {
      const d = new Date(f.startedAt ?? 0);
      return d.toISOString().slice(0, 10);
    }))].sort();
  }, [fastingHistory]);
  const fastStreak = useMemo(() => {
    if (!fastingDates.length) return 0;
    const reversed = [...fastingDates].reverse();
    let streak = 1;
    for (let i = 1; i < reversed.length; i++) {
      const prev = new Date(reversed[i - 1]);
      const curr = new Date(reversed[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.1) streak++;
      else break;
    }
    return streak;
  }, [fastingDates]);
  const fastKcal = useMemo(() => {
    const totalHours = fastingHistory.reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 3600000 : 0);
    }, 0);
    return Math.round(estimateFastingKcal(totalHours, store.userProfile.weight ?? 70, store.userProfile.gender ?? 'male', store.userProfile.age ?? 30));
  }, [fastingHistory, store.userProfile]);

  // ── Meditation stats ──
  const totalMedMin = store.totalMedMinutes;
  const todayMedMin = useMemo(() => getTodayMedMinutes(store.medHistory ?? []), [store.medHistory]);
  const medSessionCount = (store.medHistory ?? []).length;

  // ── Exercise stats ──
  const weekKm = exerciseLog.filter(e => e.timestamp >= weekStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const monthKm = exerciseLog.filter(e => e.timestamp >= monthStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
  const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
  const totalExerciseMin = Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60);
  const totalExerciseCount = exerciseLog.length;

  // ── Reflections stats ──
  const reflections = store.reflections ?? [];
  const reflCount = reflections.length;

  // ── Plan stats ──
  const plans = store.plans ?? [];
  const planItems = store.planItems ?? [];
  const planCheckins = store.planItemCheckins ?? [];
  const activePlans = plans.filter(p => p.status === 'in_progress');
  const totalPlanTasks = planItems.length;
  const completedPlanTasks = planItems.filter(i => i.status === 'completed').length;

  // ── Other stats ──
  const activeHabits = (store.habits ?? []).filter(h => h.status === 'inProgress').length;
  const graceCount = (store.graceHistory ?? []).length;

  // ── Chart data ──
  const weightData = useMemo(() => aggregateWeightData(store.checkinHistory ?? [], 30), [store.checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

  // ── Hero Banner 3 columns ──
  const heroStats = [
    { value: `${store.streak}`, unit: T('days'), label: T('streak') },
    { value: `${reflCount}`, unit: T('fastTimes'), label: T('statsReflections') },
    { value: `${totalMedMin}`, unit: T('medMinutes'), label: T('statsMeditation') },
  ];

  // ── Render helpers ──
  const renderStatGrid = (items: { value: string; unit: string; label: string; icon?: React.ComponentType<any> }[], columns = 2) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {items.map((s, i) => (
        <View key={i} style={{ width: columns === 2 ? '48%' : '31%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
          {s.icon && <s.icon size={22} color={P} />}
          <Text style={{ fontWeight: '700', color: P, fontSize: 24, textAlign: 'center' }}>
            {s.value}<Text style={{ fontSize: FONT_SUB, fontWeight: '400', color: TH.sub }}> {s.unit}</Text>
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center' }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderChartArea = () => (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {CHART_TABS.map(key => {
          const labels: Record<ChartKey, string> = { exercise: T('statsExerciseTrend'), weight: T('statsWeightTrend'), calories: T('statsDailyCalories') };
          const active = activeChart === key;
          return (
            <TouchableOpacity key={key} onPress={() => setActiveChart(key)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: active ? `${P}18` : 'transparent' }}>
              <Text style={{ fontSize: FONT_SUB, color: active ? P : TH.sub, fontWeight: active ? '600' : '400' }}>{labels[key]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {activeChart === 'exercise' && exerciseTrendData.some(d => d.value > 0) && (
        <LineChart data={exerciseTrendData.map(d => d.value)} labels={exerciseTrendData.map(d => d.label)} width={CHART_W} height={160} color="#3B82F6" showArea suffix="km" />
      )}
      {activeChart === 'exercise' && !exerciseTrendData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'weight' && weightData.length >= 2 && (
        <LineChart data={weightData.map(d => d.value)} labels={weightData.map(d => d.date)} width={CHART_W} height={160} color="#E91E63" showArea suffix={T('statsKg')} />
      )}
      {activeChart === 'weight' && weightData.length < 2 && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'calories' && caloriesData.some(d => d.value > 0) && (
        <BarChart data={caloriesData.map(d => d.value)} labels={caloriesData.map(d => d.label)} width={CHART_W} height={150} color="#F59E0B" />
      )}
      {activeChart === 'calories' && !caloriesData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
    </Card>
  );

  const renderHabitList = () => {
    const habits = (store.habits ?? []).filter(h => h.status === 'inProgress');
    if (!habits.length) return null;
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 10 }}>{T('statsHabitProgress')}</Text>
        {habits.map(h => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Flame size={16} color={COLORS.ORANGE} />
            <Text style={{ flex: 1, fontSize: FONT_BODY, color: TH.text }} numberOfLines={1}>{h.name}</Text>
            <Text style={{ fontSize: FONT_SUB, color: COLORS.ORANGE, fontWeight: '600' }}>{h.streak}{T('days')}</Text>
            <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, backgroundColor: P, borderRadius: 2, width: `${Math.min(h.doneDays / h.targetDays * 100, 100)}%` }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{Math.round(h.doneDays / h.targetDays * 100)}%</Text>
          </View>
        ))}
      </Card>
    );
  };

  const renderPlanList = () => {
    if (!activePlans.length) return null;
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 10 }}>{T('statsPlanList')}</Text>
        {activePlans.map(p => {
          const items = planItems.filter(i => i.planId === p.id);
          const done = items.filter(i => i.status === 'completed').length;
          const pct = items.length > 0 ? Math.round(done / items.length * 100) : 0;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <ClipboardList size={16} color={P} />
              <Text style={{ flex: 1, fontSize: FONT_BODY, color: TH.text }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planStatusInProgress')}</Text>
              <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, backgroundColor: P, borderRadius: 2, width: `${pct}%` }} />
              </View>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{pct}%</Text>
            </View>
          );
        })}
      </Card>
    );
  };

  const renderCalendar = () => (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <CalendarDays size={15} color={TH.text} />
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('statsCheckinHeatmap')}</Text>
      </View>
      <CalendarGrid history={store.checkinHistory ?? []}
        primaryColor={P} textColor={TH.text} subColor={TH.sub} borderColor={TH.border} />
    </Card>
  );

  // ── Tab content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {renderStatGrid([
              { value: `${store.streak}`, unit: T('days'), label: T('streak'), icon: Flame },
              { value: `${reflCount}`, unit: T('fastTimes'), label: T('statsReflections'), icon: Sparkles },
              { value: `${totalMedMin}`, unit: T('medMinutes'), label: T('statsMeditation'), icon: Target },
              { value: `${totalFastCount}`, unit: T('fastTimes'), label: T('statsTotalFasting'), icon: Clock },
              { value: `${totalFastHours}`, unit: T('fastHours'), label: T('fastTotalHours'), icon: Clock },
              { value: `${activeHabits}`, unit: '', label: T('statsActiveHabits'), icon: Star },
            ])}
            {renderChartArea()}
            {renderHabitList()}
            {renderPlanList()}
            {renderCalendar()}
          </>
        );
      case 'fasting':
        return (
          <>
            {renderStatGrid([
              { value: `${totalFastCount}`, unit: T('fastTimes'), label: T('fastTotal') },
              { value: `${totalFastHours}`, unit: T('fastHours'), label: T('fastTotalHours') },
              { value: `${fastStreak}`, unit: T('days'), label: T('fastStreak') },
            ], 3)}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: TH.card, borderRadius: 12, borderWidth: 1, borderColor: TH.border }}>
                <Flame size={16} color={COLORS.ORANGE} />
                <View>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{fastKcal} kcal</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('fastKcalSaved')}</Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: TH.card, borderRadius: 12, borderWidth: 1, borderColor: TH.border }}>
                <TrendingUp size={16} color="#E91E63" />
                <View>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{(fastKcal / 7700).toFixed(2)} {T('fastKg')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('fastWeightLoss')}</Text>
                </View>
              </View>
            </View>
          </>
        );
      case 'meditation':
        return renderStatGrid([
          { value: `${totalMedMin}`, unit: T('medMinutes'), label: T('accMed') },
          { value: `${todayMedMin}`, unit: T('medMinutes'), label: T('medTitle') },
          { value: `${medSessionCount}`, unit: T('fastTimes'), label: T('shareCardSession') },
        ], 3);
      case 'exercise':
        return (
          <>
            {renderStatGrid([
              { value: `${weekKm.toFixed(1)}`, unit: 'km', label: T('exerciseWeekKm') },
              { value: `${monthKm.toFixed(1)}`, unit: 'km', label: T('exerciseMonthKm') },
              { value: bestPace > 0 ? `${Math.floor(bestPace / 60)}:${String(Math.floor(bestPace % 60)).padStart(2, '0')}` : '--', unit: '/km', label: T('exerciseBestPace') },
            ], 3)}
            {renderStatGrid([
              { value: `${totalExerciseMin}`, unit: T('exerciseMin'), label: T('exerciseTotalTime'), icon: Dumbbell },
              { value: `${totalExerciseCount}`, unit: T('fastTimes'), label: T('exerciseTotalCount'), icon: Dumbbell },
            ])}
            {exerciseTrendData.some(d => d.value > 0) && (
              <Card>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('statsExerciseTrend')}</Text>
                <LineChart data={exerciseTrendData.map(d => d.value)} labels={exerciseTrendData.map(d => d.label)} width={CHART_W} height={160} color="#3B82F6" showArea suffix="km" />
              </Card>
            )}
          </>
        );
      case 'reflections':
        return renderStatGrid([
          { value: `${reflCount}`, unit: '', label: T('statsReflections') },
          { value: `${(store.reflections ?? []).filter(r => r.mood).length}`, unit: '', label: T('mood') },
          { value: `${Object.keys((store.reflections ?? []).reduce((acc, r) => { (r.tags ?? []).forEach(t => (acc as any)[t] = 1); return acc; }, {} as Record<string, number>)).length}`, unit: '', label: T('addTags') },
        ], 3);
      case 'plan':
        return (
          <>
            {renderStatGrid([
              { value: `${plans.length}`, unit: '', label: T('statsPlanTotal'), icon: ClipboardList },
              { value: `${totalPlanTasks}`, unit: '', label: T('statsPlanTasks'), icon: Target },
              { value: `${completedPlanTasks}`, unit: '', label: T('statsPlanDone'), icon: Star },
            ], 3)}
            {renderPlanList()}
          </>
        );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={{ backgroundColor: TH.card, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('statsTitle')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {heroStats.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={{ width: 1, backgroundColor: TH.border, marginVertical: 4 }} />}
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: P }}>{s.value}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{s.unit}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
          {TABS.map(key => {
            const active = activeTab === key;
            return (
              <TouchableOpacity key={key} onPress={() => setActiveTab(key)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? P : TH.card, borderWidth: 1, borderColor: active ? P : TH.border }}>
                <Text style={{ fontSize: FONT_BODY, color: active ? '#fff' : TH.text, fontWeight: active ? '600' : '400' }}>{T(TAB_I18N[key])}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
