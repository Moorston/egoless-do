import { dateStr, type AgeBracket, type BodyGoal, type BodyTrainingPlan, type ExerciseEntry, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BADGE, generateSuggestions, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, BODY_TAGS_PRESET } from '@egoless-do/core';
import { ChevronRight, Play, Calendar, Target, Dumbbell, TrendingUp, Activity, Scale, History, Settings, ChevronLeft, ChevronDown } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';

import CelebrationOverlay from './screens/CelebrationOverlay';
import { useTodayPlan } from './hooks/useTodayPlan';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import GoalEditModal from './modals/GoalEditModal';
import WeightRecordModal from './modals/WeightRecordModal';
import WeightTrendModal from './modals/WeightTrendModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

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
  const [showWeightTrend, setShowWeightTrend] = useState(false);

  // Banner carousel state (no auto-rotate, user manual swipe)
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

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

  // Latest body checkin for banner
  const latestCheckin = useMemo(() => {
    return (bodyCheckins ?? [])
      .filter(c => !c.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [bodyCheckins]);

  // Weight trend data for banner
  const weightTrend = useMemo(() => {
    const records = (checkinHistory ?? [])
      .filter(r => !r.deleted && r.weight != null && r.weight > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (records.length < 2) return null;
    const last = records[records.length - 1];
    const prev = records[records.length - 2];
    return {
      current: last.weight,
      diff: last.weight - prev.weight,
      date: last.date,
    };
  }, [checkinHistory]);

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
      {/* ── Banner Carousel ── */}
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
            setCurrentBanner(index);
          }}
          style={{ width: BANNER_WIDTH }}
        >
          {/* Banner 1: 今日方案 */}
          <View style={[styles.bannerCard, { backgroundColor: '#f59e0b' }]}>
            <View style={styles.bannerHeader}>
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
                <View style={styles.bannerContent}>
                  <View style={styles.bannerIconCircle}>
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
                  style={styles.bannerButton}
                >
                  <Play size={20} color="#f59e0b" />
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.bannerContent}>
                <View style={styles.bannerIconCircle}>
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
          </View>

          {/* Banner 2: 身体档案 */}
          <View style={[styles.bannerCard, { backgroundColor: '#8b5cf6' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyProfile') || '身体档案'}</Text>
              </View>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {/* Body metrics - single row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  {[
                    { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') || '体重' },
                    { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') || '身高' },
                    { value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
                    { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') || '体脂' },
                  ].map((item, i) => (
                    <View key={i} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff' }}>{item.value}{item.unit}</Text>
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {/* Self assessment full content */}
                {profile.selfAssessment ? (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.9)', lineHeight: 18 }}>
                      🗣️ {profile.selfAssessment}
                    </Text>
                    {(profile.bodyTags as string[] ?? []).length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {(profile.bodyTags as string[]).map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#fff' }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
                    {T('bodySelfAssessmentPlaceholder') || '记录你的身体状态和感受...'}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAssessment(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#8b5cf6' }}>{T('bodySelfAssessment') || '自我评估'}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 3: 身体觉知 */}
          <View style={[styles.bannerCard, { backgroundColor: '#10b981' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🧘</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyAwareness') || '身体觉知'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => nav.navigate('BodyCheckinHistory' as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyAwarenessRecords') || '记录'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {latestCheckin ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      {[
                        { label: T('bodyEnergy') || '能量', value: latestCheckin.energy, color: '#fbbf24' },
                        { label: T('bodyPain') || '疼痛', value: latestCheckin.pain, color: '#f87171' },
                        { label: T('bodyComfort') || '舒适', value: latestCheckin.comfort, color: '#34d399' },
                        { label: T('bodySleepQuality') || '睡眠', value: latestCheckin.sleep, color: '#60a5fa' },
                      ].map((item, i) => (
                        <View key={i} style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{item.value}</Text>
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Tags */}
                    {latestCheckin.tags && latestCheckin.tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {latestCheckin.tags.map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#fff' }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Note */}
                    {latestCheckin.note && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginBottom: 4 }} numberOfLines={2}>
                        📝 {latestCheckin.note}
                      </Text>
                    )}
                    <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)' }}>
                      {latestCheckin.date}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                    {T('bodyAwarenessNoData') || '暂无觉知记录'}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowCheckin(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#10b981' }}>{T('bodyFlowAwareness') || '记录觉知'}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 4: 体重趋势 */}
          <View style={[styles.bannerCard, { backgroundColor: '#3b82f6' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>⚖️</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyWeightTrend') || '体重趋势'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowWeightRecord(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyRecordWeight') || '记录体重'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {weightTrend ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '900', color: '#fff' }}>
                        {weightTrend.current} kg
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={16} color={weightTrend.diff > 0 ? '#fbbf24' : '#34d399'} style={weightTrend.diff < 0 ? { transform: [{ scaleY: -1 }] } : undefined} />
                        <Text style={{ fontSize: FONT_SMALL(), color: weightTrend.diff > 0 ? '#fbbf24' : '#34d399' }}>
                          {weightTrend.diff > 0 ? '+' : ''}{weightTrend.diff.toFixed(1)} kg
                        </Text>
                      </View>
                    </View>
                    {/* Curve chart - last 7 days */}
                    <View style={{ height: 50, marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 2 }}>
                        {(checkinHistory ?? [])
                          .filter(r => !r.deleted && r.weight != null && r.weight > 0)
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .slice(-7)
                          .map((r, i, arr) => {
                            const weights = arr.map(x => x.weight);
                            const minW = Math.min(...weights);
                            const maxW = Math.max(...weights);
                            const range = maxW - minW || 1;
                            const height = Math.max(4, ((r.weight - minW) / range) * 36 + 4);
                            const isLast = i === arr.length - 1;
                            return (
                              <View key={r.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                                <View style={{
                                  width: isLast ? 10 : 6,
                                  height,
                                  backgroundColor: isLast ? '#fff' : 'rgba(255,255,255,0.5)',
                                  borderRadius: isLast ? 5 : 3,
                                }} />
                              </View>
                            );
                          })}
                      </View>
                      {/* Date labels */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        {(checkinHistory ?? [])
                          .filter(r => !r.deleted && r.weight != null && r.weight > 0)
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .slice(-7)
                          .map((r) => (
                            <Text key={r.date} style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', flex: 1, textAlign: 'center' }}>
                              {r.date.slice(8)}
                            </Text>
                          ))}
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                    {T('bodyWeightNoData') || '暂无体重记录'}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowWeightTrend(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#3b82f6' }}>{T('bodyMoreWeightTrend') || '更多体重趋势'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Banner indicators */}
        <View style={styles.bannerIndicators}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.bannerDot,
                { backgroundColor: i === currentBanner ? '#fff' : 'rgba(255,255,255,0.4)' }
              ]}
            />
          ))}
        </View>
        {/* Guide text */}
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center', marginTop: 6 }}>
          ← 左右滑动查看更多 →
        </Text>
      </View>

      {/* ── 快捷操作 ── */}
      <View style={styles.quickActions}>
        {[
          { icon: <Scale size={20} color={TH.primary} />, label: T('bodyRecordWeight') || '记录体重', onPress: () => setShowWeightRecord(true) },
          { icon: <History size={20} color={TH.primary} />, label: T('exerciseHistory') || '锻炼记录', onPress: () => nav.navigate('ExerciseHistory' as never) },
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
              <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>{T('exerciseHistory') || '锻炼记录'}</Text>
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

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />
      <WeightTrendModal visible={showWeightTrend} TH={TH} T={T} checkins={checkinHistory ?? []} onClose={() => setShowWeightTrend(false)} />

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
  bannerContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  bannerCard: {
    width: BANNER_WIDTH,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  bannerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
});
