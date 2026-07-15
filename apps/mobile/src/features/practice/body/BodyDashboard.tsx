import { dateStr, type AgeBracket, type BodyGoal, type BodyTrainingPlan, type ExerciseEntry, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BADGE, generateSuggestions, EXERCISE_CATEGORIES, PART_STRING_TO_KEY } from '@egoless-do/core';
import { ChevronRight, Play, Calendar, Target, Dumbbell, TrendingUp, Activity, Scale, History, Settings } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';

import CelebrationOverlay from './screens/CelebrationOverlay';
import { useTodayPlan } from './hooks/useTodayPlan';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import GoalEditModal from './modals/GoalEditModal';
import WeightRecordModal from './modals/WeightRecordModal';

interface DashboardProps {
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
}

export default function BodyDashboard({ onFlowStart, onFlowStartWithPlan }: DashboardProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { userProfile, bodyGoals, bodyCheckins, exerciseLog, checkinHistory, bodyTrainingPlans,
    updateUserProfile, updateBodyGoal, addBodyGoal,
    upsertBodyCheckin, addWeight,
    updateBodyTrainingPlan } = useShallowStore(s => ({
    userProfile: s.userProfile,
    bodyGoals: s.bodyGoals,
    bodyCheckins: s.bodyCheckins,
    exerciseLog: s.exerciseLog,
    checkinHistory: s.checkinHistory,
    bodyTrainingPlans: s.bodyTrainingPlans,
    updateUserProfile: s.updateUserProfile,
    updateBodyGoal: s.updateBodyGoal,
    addBodyGoal: s.addBodyGoal,
    upsertBodyCheckin: s.upsertBodyCheckin,
    addWeight: s.addWeight,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
  }));
  const profile = (userProfile ?? {}) as Record<string, unknown>;
  const { todayPlan, weekday: todayWeekday } = useTodayPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);

  const activeGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);
  const activeTrainingPlan = useMemo(() => (bodyTrainingPlans ?? []).find((p: BodyTrainingPlan) => !p.deleted && p.status === 'active'), [bodyTrainingPlans]);

  // Compute training suggestions
  const suggestions = useMemo(() =>
    generateSuggestions(exerciseLog ?? [], bodyCheckins ?? [], activeTrainingPlan),
  [exerciseLog, bodyCheckins, activeTrainingPlan]);

  // Auto-mark expired plans as completed
  useEffect(() => {
    const today = dateStr();
    for (const plan of bodyTrainingPlans ?? []) {
      if (plan.status === 'active' && plan.endDate < today && !plan.deleted) {
        updateBodyTrainingPlan(plan.id, { status: 'completed' });
      }
    }
  }, [bodyTrainingPlans, updateBodyTrainingPlan]);

  // ── Celebration overlay ──
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedPlanId, setCelebratedPlanId] = useState<string | null>(null);
  const sevenDaysAgo = useMemo(() => dateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), []);

  // Detect newly completed plans
  const recentlyCompletedPlans = useMemo(() =>
    (bodyTrainingPlans ?? []).filter((p: BodyTrainingPlan) =>
      !p.deleted && p.status === 'completed' && p.endDate >= sevenDaysAgo
    ),
  [bodyTrainingPlans, sevenDaysAgo]);

  // Compute celebration data
  const celebrationData = useMemo(() => {
    const plan = recentlyCompletedPlans[0];
    if (!plan) return null;
    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) =>
      !e.deleted && e.planId === plan.id
    );
    const totalMin = Math.round(planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60);
    const totalCal = planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0);
    const completedDays = new Set(planExercises.map((e: ExerciseEntry) => dateStr(new Date(e.timestamp)))).size;
    const weeks = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 604800000));
    const totalDays = weeks * 7;

    return {
      planName: plan.name ?? '',
      totalDays,
      completedDays,
      totalDurationMin: totalMin,
      totalCalories: totalCal,
    };
  }, [recentlyCompletedPlans, exerciseLog]);

  // Show celebration once when a completed plan is detected
  const recentPlanId = recentlyCompletedPlans[0]?.id ?? null;
  useEffect(() => {
    if (celebrationData && recentPlanId && recentPlanId !== celebratedPlanId) {
      setCelebratedPlanId(recentPlanId);
      setShowCelebration(true);
    }
  }, [celebrationData, recentPlanId, celebratedPlanId]);

  // Calculate plan progress
  const planProgress = useMemo(() => {
    if (!activeTrainingPlan || !exerciseLog) return null;
    const today = new Date().getDay() || 7;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = dateStr(weekStart);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = dateStr(weekEnd);

    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) => !e.deleted && e.planId === activeTrainingPlan.id);
    const weekLogs = planExercises.filter((e: ExerciseEntry) => {
      const d = dateStr(new Date(e.timestamp));
      return d >= weekStartStr && d <= weekEndStr;
    });

    const activeTasks = activeTrainingPlan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest');
    const weekDoneTasks = activeTasks.filter(t => weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === t.weekday));
    const todayDone = weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === today);

    return {
      weekComplete: weekDoneTasks.length,
      weekTotal: activeTasks.length,
      todayDone,
      totalDuration: Math.round(weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60),
      totalCal: weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0),
    };
  }, [activeTrainingPlan, exerciseLog]);

  // Recent exercises (last 3)
  const recentExercises = useMemo(() => {
    return (exerciseLog ?? [])
      .filter((e: ExerciseEntry) => !e.deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [exerciseLog]);

  // Resolve today's plan display
  const todayPlanDisplay = useMemo(() => {
    if (!todayPlan || !todayPlan.part || todayPlan.part === 'rest') return null;
    const mappedKey = PART_STRING_TO_KEY[todayPlan.part] ?? todayPlan.part;
    const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
    return {
      icon: cat?.icon ?? '🏋️',
      label: cat ? T(cat.i18nKey) : todayPlan.part,
      note: todayPlan.note,
    };
  }, [todayPlan, T]);

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [updateUserProfile]);

  const handleSaveGoal = useCallback((data: Partial<BodyGoal>) => {
    if (activeGoal) {
      updateBodyGoal(activeGoal.id, data);
    } else {
      addBodyGoal(data);
    }
  }, [activeGoal, updateBodyGoal, addBodyGoal]);

  const handleSaveCheckin = useCallback((data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => {
    upsertBodyCheckin(data);
  }, [upsertBodyCheckin]);

  const handleSaveWeight = useCallback((data: { date: string; weight: number; bodyFat?: number }) => {
    addWeight(data);
  }, [addWeight]);

  return (
    <View>
      {/* ── Hero: 今日计划 ── */}
      <View style={[styles.heroCard, { backgroundColor: '#f59e0b' }]}>
        <View style={styles.heroHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyTodayPlan')}</Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)' }}>
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
          </Text>
        </View>

        {todayPlanDisplay ? (
          <>
            <View style={styles.heroContent}>
              <View style={styles.heroIconCircle}>
                <Text style={{ fontSize: 28 }}>{todayPlanDisplay.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{todayPlanDisplay.label}</Text>
                {todayPlanDisplay.note && (
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }} numberOfLines={1}>
                    {todayPlanDisplay.note}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => onFlowStart?.()}
              activeOpacity={0.85}
              style={styles.heroButton}
            >
              <Play size={20} color="#f59e0b" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.heroContent}>
            <View style={styles.heroIconCircle}>
              <Text style={{ fontSize: 28 }}>😴</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyTodayPlanRest')}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {T('bodyFlowChooseExercise') || '也可以选择其他运动'}
              </Text>
            </View>
          </View>
        )}

        {/* 训练建议 */}
        {suggestions.length > 0 && suggestions[0].priority === 'high' && (
          <View style={styles.heroSuggestion}>
            <Text style={{ fontSize: FONT_SMALL(), color: '#92400e' }}>{suggestions[0].icon} {suggestions[0].message}</Text>
          </View>
        )}
      </View>

      {/* ── 快捷操作 ── */}
      <View style={styles.quickActions}>
        {[
          { icon: <Scale size={20} color={TH.primary} />, label: T('bodyRecordWeight') || '记录体重', onPress: () => setShowWeightRecord(true) },
          { icon: <History size={20} color={TH.primary} />, label: T('exerciseHistory') || '训练历史', onPress: () => nav.navigate('ExerciseHistory' as never) },
          { icon: <Dumbbell size={20} color={TH.primary} />, label: T('bodyPlanManagement') || '计划管理', onPress: () => nav.navigate('PlanManagement' as never) },
          { icon: <Target size={20} color={TH.primary} />, label: T('bodyGoal') || '目标设定', onPress: () => setShowGoalEdit(true) },
        ].map((item, i) => (
          <TouchableOpacity key={i} onPress={item.onPress} style={[styles.quickActionItem, { backgroundColor: TH.card }]}>
            {item.icon}
            <Text style={{ fontSize: FONT_SMALL(), color: TH.text, marginTop: 4 }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 本周进度 ── */}
      {planProgress && (
        <View style={[styles.progressCard, { backgroundColor: TH.card }]}>
          <View style={styles.progressHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyWeeklyProgress') || '本周进度'}</Text>
            </View>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
              {planProgress.weekComplete}/{planProgress.weekTotal}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: TH.border }]}>
              <View
                style={[styles.progressBarFill, {
                  width: `${planProgress.weekTotal > 0 ? (planProgress.weekComplete / planProgress.weekTotal) * 100 : 0}%`,
                  backgroundColor: '#10b981',
                }]}
              />
            </View>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#f59e0b' }}>{planProgress.totalDuration}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('exerciseMin') || '分钟'}</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#ef4444' }}>{planProgress.totalCal}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>kcal</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#8b5cf6' }}>{planProgress.weekComplete}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyDayCompleted') || '天'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 最近训练 ── */}
      {recentExercises.length > 0 && (
        <View style={[styles.recentCard, { backgroundColor: TH.card }]}>
          <View style={styles.recentHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#f59e0b" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('exerciseRecentActivity') || '最近训练'}</Text>
            </View>
            <TouchableOpacity onPress={() => nav.navigate('ExerciseHistory' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>{T('exerciseViewAll') || '查看全部'}</Text>
              <ChevronRight size={14} color={TH.primary} />
            </TouchableOpacity>
          </View>
          {recentExercises.map((e, i) => (
            <View key={e.id} style={[styles.recentItem, { borderBottomWidth: i < recentExercises.length - 1 ? 1 : 0, borderBottomColor: TH.border }]}>
              <Text style={{ fontSize: 20 }}>{e.sportIcon}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{e.sportKey}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                  {Math.floor(e.durationSec / 60)}分钟 {e.calories ? `· ${e.calories}kcal` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                {new Date(e.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── 身体数据概览 ── */}
      <View style={[styles.bodyDataCard, { backgroundColor: TH.card }]}>
        <View style={styles.bodyDataHeader}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyProfile') || '身体数据'}</Text>
          <TouchableOpacity onPress={() => setShowWeightRecord(true)}>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>{T('bodyRecordWeight') || '记录'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bodyDataGrid}>
          {[
            { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') || '体重' },
            { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') || '身高' },
            { value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
            { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') || '体脂' },
          ].map((item, i) => (
            <View key={i} style={styles.bodyDataItem}>
              <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color: TH.text }}>{item.value}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{item.unit}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />

      {celebrationData && (
        <CelebrationOverlay
          visible={showCelebration}
          TH={TH} T={T}
          data={celebrationData}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroSuggestion: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStatItem: {
    alignItems: 'center',
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bodyDataCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  bodyDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bodyDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bodyDataItem: {
    alignItems: 'center',
  },
});
