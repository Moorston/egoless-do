import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { Card, useTheme, useT } from '../../components/UI';
import { COLORS, aggregateWeightData, aggregateDailyCalories, aggregateWeeklyKm, aggregateDailyWater, estimateFastingKcal, getTodayMedMinutes, computeExpectedDays, computePlanProgress, dateStr, FONT_BODY, FONT_SUB } from '@egoless-do/core';
import {
  Flame, Sparkles, Target, Star, Utensils, Shield,
  CalendarDays, Zap, Dumbbell, TrendingUp, BarChart3,
  Clock, ClipboardList,
} from 'lucide-react-native';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import CalendarGrid from '../../components/charts/CalendarGrid';
import { ChevronLeft } from 'lucide-react-native';

const CHART_W = Dimensions.get('window').width - 64;

const TABS = ['overview', 'plan', 'habits', 'reflections', 'exercise', 'meditation', 'fasting'] as const;
type TabKey = typeof TABS[number];

const TAB_I18N: Record<TabKey, string> = {
  overview: 'statsTabOverview',
  plan: 'statsTabPlan',
  reflections: 'statsTabReflections',
  exercise: 'statsTabExercise',
  meditation: 'statsTabMeditation',
  fasting: 'statsTabFasting',
  habits: 'statsTabHabits',
};

const CHART_TABS = ['calories', 'water', 'weight', 'exercise'] as const;
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
  const exerciseLog = useMemo(() => (store.exerciseLog ?? []).filter(e => !e.deleted), [store.exerciseLog]);
  const now = Date.now();
  const todayD = new Date(now);
  const today = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const monthStart = now - 30 * 24 * 3600 * 1000;

  // ── Fasting stats ──
  const fastingHistory = useMemo(() => (store.fastingHistory ?? []).filter(f => !f.deleted), [store.fastingHistory]);
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
      if (!f.startedAt) return null;
      const d = new Date(f.startedAt);
      if (isNaN(d.getTime())) return null;
      return dateStr(d);
    }).filter(Boolean as unknown as <T>(x: T) => x is NonNullable<T>))].sort();
  }, [fastingHistory]);
  const fastStreak = useMemo(() => {
    if (!fastingDates.length) return 0;
    const reversed = [...fastingDates].reverse();
    const todayStr = dateStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateStr(yesterday);
    if (reversed[0] !== todayStr && reversed[0] !== yesterdayStr) return 0;
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
  const todayMedMin = useMemo(() => getTodayMedMinutes((store.medHistory ?? []).filter(m => !m.deleted)), [store.medHistory]);
  const medSessionCount = (store.medHistory ?? []).filter(m => !m.deleted).length;

  // ── Exercise stats ──
  const exerciseStats = useMemo(() => {
    const weekKm = exerciseLog.filter(e => e.timestamp >= weekStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const monthKm = exerciseLog.filter(e => e.timestamp >= monthStart).reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
    const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
    const totalExerciseMin = Math.round(exerciseLog.reduce((s, e) => s + e.durationSec, 0) / 60);
    const totalExerciseCount = exerciseLog.length;
    return { weekKm, monthKm, bestPace, totalExerciseMin, totalExerciseCount };
  }, [exerciseLog, weekStart, monthStart]);
  const { weekKm, monthKm, bestPace, totalExerciseMin, totalExerciseCount } = exerciseStats;

  // ── Reflections stats ──
  const reflections = store.reflections ?? [];
  const reflCount = reflections.filter(r => !r.deleted).length;

  // ── Plan stats ──
  const plans = store.plans ?? [];
  const planStats = useMemo(() => {
    const planItems = (store.planItems ?? []).filter(i => !i.deleted);
    const activePlans = plans.filter(p => !p.deleted && p.status === 'in_progress');
    const totalPlanTasks = planItems.length;
    const completedPlanTasks = planItems.filter(i => i.status === 'completed').length;
    return { planItems, activePlans, totalPlanTasks, completedPlanTasks };
  }, [store.planItems, plans]);
  const { planItems, activePlans, totalPlanTasks, completedPlanTasks } = planStats;

  // ── Other stats ──
  const activeHabits = (store.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress').length;
  const graceCount = (store.graceHistory ?? []).filter(g => !g.deleted).length;

  // ── Chart data ──
  const weightData = useMemo(() => aggregateWeightData(store.checkinHistory ?? [], 30), [store.checkinHistory]);
  const caloriesData = useMemo(() => aggregateDailyCalories(store.foodLog ?? [], 7), [store.foodLog]);
  const waterData = useMemo(() => aggregateDailyWater(store.checkinHistory ?? [], 7), [store.checkinHistory]);
  const exerciseTrendData = useMemo(() => aggregateWeeklyKm(exerciseLog, 8), [exerciseLog]);

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
          const labels: Record<ChartKey, string> = { calories: T('statsDailyCalories'), water: T('waterIntake'), weight: T('statsWeightTrend'), exercise: T('statsExerciseTrend') };
          const active = activeChart === key;
          return (
            <TouchableOpacity key={key} onPress={() => setActiveChart(key)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: active ? `${P}18` : 'transparent' }}>
              <Text style={{ fontSize: FONT_SUB, color: active ? P : TH.sub, fontWeight: active ? '600' : '400' }}>{labels[key]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {activeChart === 'calories' && caloriesData.some(d => d.value > 0) && (
        <BarChart data={caloriesData.map(d => d.value)} labels={caloriesData.map(d => d.label)} width={CHART_W} height={150} color="#F59E0B" />
      )}
      {activeChart === 'calories' && !caloriesData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'water' && waterData.some(d => d.value > 0) && (
        <BarChart data={waterData.map(d => d.value)} labels={waterData.map(d => d.label)} width={CHART_W} height={150} color="#3B82F6" />
      )}
      {activeChart === 'water' && !waterData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'weight' && weightData.length >= 2 && (
        <LineChart data={weightData.map(d => d.value)} labels={weightData.map(d => d.date)} width={CHART_W} height={160} color="#E91E63" showArea suffix={T('statsKg')} />
      )}
      {activeChart === 'weight' && weightData.length < 2 && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'exercise' && exerciseTrendData.some(d => d.value > 0) && (
        <LineChart data={exerciseTrendData.map(d => d.value)} labels={exerciseTrendData.map(d => d.label)} width={CHART_W} height={160} color="#3B82F6" showArea suffix="km" />
      )}
      {activeChart === 'exercise' && !exerciseTrendData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
      {activeChart === 'calories' && !caloriesData.some(d => d.value > 0) && (
        <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 40 }}>{T('statsNoData')}</Text>
      )}
    </Card>
  );

  const renderHabitList = () => {
    const habits = (store.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress');
    if (!habits.length) return null;
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 10 }}>{T('statsHabitProgress')}</Text>
        {habits.map(h => {
          const pct = h.targetDays > 0 ? Math.min(Math.round(h.doneDays / h.targetDays * 100), 100) : 0;
          return (
            <View key={h.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Flame size={16} color={COLORS.ORANGE} />
                <Text style={{ flex: 1, fontSize: FONT_BODY, color: TH.text }} numberOfLines={1}>{h.name}</Text>
                <Text style={{ fontSize: FONT_SUB, color: COLORS.ORANGE, fontWeight: '600' }}>{h.streak}{T('days')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View style={{ flex: 1, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, backgroundColor: P, borderRadius: 2, width: `${pct}%` }} />
                </View>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{h.doneDays}/{h.targetDays}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{pct}%</Text>
              </View>
            </View>
          );
        })}
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
          const pct = computePlanProgress(p);
          return (
            <View key={p.id} style={{ marginBottom: 16 }}>
              {/* Plan header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                <ClipboardList size={16} color={P} />
                <Text style={{ flex: 1, fontSize: FONT_BODY, fontWeight: '600', color: TH.text }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{done}/{items.length}</Text>
                <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, backgroundColor: P, borderRadius: 2, width: `${pct}%` }} />
                </View>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{pct}%</Text>
              </View>
              {/* Tree items */}
              {items.length > 0 && (
                <View style={{ marginLeft: 8 }}>
                  {items.map((item, idx) => {
                    const clampedToday = today > item.endDate ? item.endDate : today;
                    const checkedDays = item.totalCheckinDays;
                    const expectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, item.endDate);
                    const itemPct = expectedDays > 0 ? Math.min(Math.round((checkedDays / expectedDays) * 100), 100) : 0;
                    const isLast = idx === items.length - 1;
                    return (
                      <View key={item.id} style={{ flexDirection: 'row' }}>
                        {/* Vertical line + dot */}
                        <View style={{ width: 20, alignItems: 'center' }}>
                          <View style={{ position: 'absolute', top: 0, bottom: isLast ? '50%' : 0, width: 1, backgroundColor: TH.border }} />
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === 'completed' ? P : TH.border, marginTop: 8, zIndex: 1 }} />
                        </View>
                        {/* Content - same layout as plan header */}
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>·</Text>
                          <Text style={{ flex: 1, fontSize: FONT_SUB, color: item.status === 'completed' ? TH.sub : TH.text, textDecorationLine: item.status === 'completed' ? 'line-through' : 'none' }} numberOfLines={1}>{item.name}</Text>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{checkedDays}/{expectedDays}</Text>
                          <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ height: 4, backgroundColor: item.status === 'completed' ? P : COLORS.GREEN, borderRadius: 2, width: `${itemPct}%` }} />
                          </View>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{itemPct}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
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
      <CalendarGrid history={(store.checkinHistory ?? []).filter(c => !c.deleted)}
        primaryColor={P} textColor={TH.text} subColor={TH.sub} borderColor={TH.border}
        onDayPress={(date) => nav.navigate('CheckinDetail', { date })} />
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
              { value: `${(store.checkinHistory ?? []).filter(c => !c.deleted).length}`, unit: T('days'), label: T('statsTotalCheckinDays'), icon: CalendarDays },
              { value: `${plans.filter(p => !p.deleted).length}`, unit: '', label: T('statsPlanTotal'), icon: ClipboardList },
              { value: `${completedPlanTasks}`, unit: '', label: T('statsCompletedTasks'), icon: Target },
              { value: `${(store.habits ?? []).filter(h => !h.deleted).length}`, unit: '', label: T('statsHabitCount'), icon: Star },
              { value: `${reflCount}`, unit: '', label: T('statsReflections'), icon: Sparkles },
              { value: `${totalExerciseMin}`, unit: T('exerciseMin'), label: T('statsExerciseDuration'), icon: Dumbbell },
              { value: `${totalMedMin}`, unit: T('medMinutes'), label: T('statsMeditation'), icon: Target },
              { value: `${totalFastCount}`, unit: T('fastTimes'), label: T('statsTotalFasting'), icon: Clock },
            ], 3)}
            {renderChartArea()}
            {renderHabitList()}
            {renderPlanList()}
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
          { value: `${(store.reflections ?? []).filter(r => !r.deleted && r.mood).length}`, unit: '', label: T('mood') },
          { value: `${Object.keys((store.reflections ?? []).filter(r => !r.deleted).reduce((acc, r) => { (r.tags ?? []).forEach(t => (acc as any)[t] = 1); return acc; }, {} as Record<string, number>)).length}`, unit: '', label: T('addTags') },
        ], 3);
      case 'plan':
        return (
          <>
            {renderStatGrid([
              { value: `${activePlans.length}`, unit: '', label: T('statsPlanTotal'), icon: ClipboardList },
              { value: `${totalPlanTasks}`, unit: '', label: T('statsPlanTasks'), icon: Target },
              { value: `${completedPlanTasks}`, unit: '', label: T('statsPlanDone'), icon: Star },
            ], 3)}
            {renderPlanList()}
          </>
        );
      case 'habits':
        return (
          <>
            {renderStatGrid([
              { value: `${activeHabits}`, unit: '', label: T('statsActiveHabits'), icon: Star },
              { value: `${graceCount}`, unit: '', label: T('statsGraceCount'), icon: Shield },
            ])}
            {renderHabitList()}
          </>
        );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Back button + title */}
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
          <ChevronLeft size={28} color={TH.text} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: TH.text, marginLeft: 4 }}>{T('statsTitle')}</Text>
        </TouchableOpacity>

        {/* Calendar heatmap */}
        {renderCalendar()}

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
