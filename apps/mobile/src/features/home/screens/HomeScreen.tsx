import { THEMES, COLORS, dateStr, yesterday, getFoodLogByDate, getRecentFoods, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_LABEL, FONT_CARD_TITLE, parseCheckinNote, getActivePlan, getTodayItems, getTodayCustomTodos, isPlanDelayed, getIncompleteItems, INCOMPLETE_REASONS, getStatsForDate, isGraceAvailable, createLogger, formatTime } from '@egoless-do/core';
import type { CheckinEntry, Habit } from '@egoless-do/core';
import {
  Scale, Footprints, Droplets, Pencil, Check, X, Star, Sparkles, ClipboardList, Calendar,
} from 'lucide-react-native';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useTheme, useT, ProgressBar, Checkbox, ThemedInput } from '../../../components/UI';
import SimpleHeader from '../../../navigation/SimpleHeader';
import { useRootNavigation } from '../../../navigation/hooks';
import { useNavigateToTab } from '../../../navigation/useAppNavigation';
import { useAppStore, useShallowStore, type MobileStore } from '../../../store/useAppStore';
import { useCheckinStreak, useActiveHabits } from '../../../store/selectors';
import Banner from '../components/Banner';
import CheckinStatsModal from '../components/CheckinStatsModal';
import DateBar from '../components/DateBar';
import DelayedReminder from '../components/DelayedReminder';
import GraceReminder from '../components/GraceReminder';
import HomeBubble from '../components/HomeBubble';
import HomeFoodSection from '../components/HomeFoodSection';
import HomePlanSection from '../components/HomePlanSection';
import { useDateNavigation } from '../hooks/useDateNavigation';

const log = createLogger('Home');

type CheckinStatus = 'draft' | 'done' | 'editing';

/** Habit row — extracted from the former scrollEnabled={false} FlatList so the
 *  check-in card renders all its rows with a single inline .map() instead of a
 *  nested virtualised list. */
function HabitItem({ habit, viewDate, TH, P, T, isReadOnly, onToggle }: {
  habit: Habit;
  viewDate: string;
  TH: ReturnType<typeof useTheme>;
  P: string;
  T: (key: string) => string;
  isReadOnly: boolean;
  onToggle: (id: string) => void;
}) {
  const habitDone = habit.checkedDates?.includes(viewDate) ?? false;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: TH.border,
    }}>
      <View style={styles.flexRowGap10}>
        <Star size={16} color={P} />
        <View>
          <Text style={{ color: isReadOnly && !habitDone ? TH.sub : TH.text, fontSize: FONT_BODY(), opacity: isReadOnly && !habitDone ? 0.5 : 1 }}>{habit.name}</Text>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{String(habit.streak ?? 0)} {T('checkinStreak')}</Text>
        </View>
      </View>
      {isReadOnly ? (
        habitDone
          ? <Check size={18} color={COLORS.GREEN} />
          : <X size={18} color={TH.sub} />
      ) : (
        <Checkbox on={habitDone} onChange={() => onToggle(habit.id)} accessibilityLabel={`${habit.name} ${habitDone ? T('done') : T('notDone')}`} />
      )}
    </View>
  );
}

/** Parse weight string, return undefined if invalid or out of range (1-500 kg) */
function parseWeight(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : undefined;
}

// HomeScreen 为首页综合屏幕（签到/习惯/计划/饮食/日期导航），拆分子组件成本较高，暂禁用行数限制
// eslint-disable-next-line max-lines-per-function
export default function HomeScreen() {
  // ═══════════════════════════════════════════════════════════════
  // Section 1: Store Data & Navigation
  // ═══════════════════════════════════════════════════════════════
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const {
    checkinHistory, plans, planItemCheckins, planItems, dailyCustomTodos,
    foodLog, habits, streak, waterMl, waterGoal, calGoal,
    healthSyncEnabled, todaySteps, userProfile, graceHistory,
    setWeightUnit, submitCheckin, checkinHabit, addWater,
    setWaterGoal, setCalGoal, checkAutoStatus, autoSyncPlanItems,
    checkinPlanItem, uncheckinPlanItem, toggleDailyCustomTodo,
    addFood, deleteFood,
  } = useShallowStore(s => ({
    checkinHistory: s.checkinHistory,
    plans: s.plans,
    planItemCheckins: s.planItemCheckins,
    planItems: s.planItems,
    dailyCustomTodos: s.dailyCustomTodos,
    foodLog: s.foodLog,
    habits: s.habits,
    // streak 已移除：改用 useCheckinStreak selector
    waterMl: s.waterMl,
    waterGoal: s.waterGoal,
    calGoal: s.calGoal,
    healthSyncEnabled: s.healthSyncEnabled,
    todaySteps: s.todaySteps,
    userProfile: s.userProfile,
    graceHistory: s.graceHistory,
    setWeightUnit: s.setWeightUnit,
    submitCheckin: s.submitCheckin,
    checkinHabit: s.checkinHabit,
    addWater: s.addWater,
    setWaterGoal: s.setWaterGoal,
    setCalGoal: s.setCalGoal,
    checkAutoStatus: s.checkAutoStatus,
    autoSyncPlanItems: s.autoSyncPlanItems,
    checkinPlanItem: s.checkinPlanItem,
    uncheckinPlanItem: s.uncheckinPlanItem,
    toggleDailyCustomTodo: s.toggleDailyCustomTodo,
    addFood: s.addFood,
    deleteFood: s.deleteFood,
  }));

  // 派生状态：连续打卡天数（从 checkinHistory 计算）
  const checkinStreak = useCheckinStreak();
  const activeHabits = useActiveHabits();
  const nav   = useRootNavigation();
  const navigateToTab = useNavigateToTab();
  const language = useAppStore(useShallow((s: MobileStore) => s.language));

  // ── Date state ──
  const { viewDate, isToday, goToDate, onTouchStart, onTouchEnd } = useDateNavigation();

  const weightUnit = useShallowStore(s => s.weightUnit);

  // ── 性能优化：streak 懒加载 ──
  useEffect(() => {
    const state = useAppStore.getState();
    if (state.streak === undefined || state.streak === null) {
      state.calculateStreak();
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Section 2: Derived Data & Status
  // ═══════════════════════════════════════════════════════════════

  // ── Existing checkin ──
  const todayRecord = useMemo(
    () => (checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === viewDate),
    [checkinHistory, viewDate],
  );
  const parsed = useMemo(() => parseCheckinNote(todayRecord?.note ?? ''), [todayRecord]);

  // ── Local state (initialized from existing record) ──
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [localDone, setLocalDone] = useState<boolean | null>(() => todayRecord?.done ?? null);
  const [note, setNote] = useState(() => parsed.userNote);
  const [weight, setWeight] = useState(() => {
    if (todayRecord?.weight != null) return String(todayRecord.weight);
    // Default to profile weight on new day
    const profileWeight = userProfile?.weight;
    return profileWeight != null ? String(profileWeight) : '';
  });
  // habitCheckins derived from store — no local state needed

  // ── Plan items ──
  const activePlan = useMemo(() => getActivePlan(plans ?? []), [plans]);
  const planCheckins = useMemo(() => (planItemCheckins ?? []).filter(c => !c.deleted), [planItemCheckins]);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(planItems ?? [], activePlan, viewDate, planCheckins);
  }, [planItems, activePlan, viewDate, planCheckins]);
  const dailyCustomTodosMemo = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(dailyCustomTodos ?? [], activePlan.id, viewDate);
  }, [dailyCustomTodos, activePlan, viewDate]);
  // planToggles derived from store — no local state needed

  // ── Modals ──
  const [showWG, setShowWG] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState<ReturnType<typeof getIncompleteItems>>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonNote, setReasonNote] = useState('');
  const [wgi, setWgi] = useState(String(waterGoal));

  // ── Derived data ──
  const viewDateFoods = useMemo(() => getFoodLogByDate((foodLog ?? []).filter(f => !f.deleted && f.name), viewDate), [foodLog, viewDate]);
  const totalCal = useMemo(() => viewDateFoods.reduce((a, f) => a + f.calories, 0), [viewDateFoods]);
  const recentFoods = useMemo(() => getRecentFoods((foodLog ?? []).filter(f => !f.deleted), 3), [foodLog]);
  const totalCompleted = useMemo(
    () => (checkinHistory ?? []).filter((c: CheckinEntry) => c.done && !c.deleted).length,
    [checkinHistory],
  );
  const viewDateStats = useMemo(
    () => getStatsForDate(checkinHistory ?? [], viewDate),
    [checkinHistory, viewDate],
  );
  const activeHabits = useMemo(
    () => (habits ?? []).filter(h => !h.deleted && h.status === 'inProgress'),
    [habits],
  );

  // ── Status derivation ──
  const status: CheckinStatus = todayRecord
    ? (todayRecord.done ? 'done' : 'editing')
    : 'draft';

  // Whether fields are locked (read-only from done status)
  const isLocked = status === 'done';
  // Whether in read-only mode (past dates or locked)
  const isReadOnly = !isToday || isLocked;

  // ═══════════════════════════════════════════════════════════════
  // Section 3: Gesture Handling & Effects
  // ═══════════════════════════════════════════════════════════════

  // ── Swipe gesture (instant page switch) — handled by useDateNavigation ──
  const noteRef = useRef(note);
  noteRef.current = note;
  const weightRef = useRef(weight);
  weightRef.current = weight;
  const localDoneRef = useRef(localDone);
  localDoneRef.current = localDone;

  // ── Re-sync local state when todayRecord changes ──
  useEffect(() => {
    if (!todayRecord) {
      // No record for this date — reset local state
      setLocalDone(null);
      setNote('');
      setWeight('');
      return;
    }
    const p = parseCheckinNote(todayRecord.note ?? '');
    setLocalDone(todayRecord.done ?? null);
    setNote(p.userNote);
    setWeight(todayRecord.weight != null ? String(todayRecord.weight) : '');
  }, [todayRecord]);

  // ── Build JSON note ──
  const buildNote = useCallback(() => {
    const s = useAppStore.getState();
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (s.waterMl > 0) noteData.water = s.waterMl;
    const checkedHabits = (s.habits ?? [])
      .filter(h => !h.deleted && h.status === 'inProgress' && h.checkedDates?.includes(viewDate))
      .map(h => h.name);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    // 每日自定义待办 — read directly from store to avoid stale closure
    const currentPlan = getActivePlan(s.plans ?? []);
    const freshCustomTodos = currentPlan
      ? getTodayCustomTodos(s.dailyCustomTodos ?? [], currentPlan.id, viewDate)
      : [];
    const doneCustomTodos = freshCustomTodos
      .filter(t => t.done)
      .map(t => t.name);
    if (doneCustomTodos.length) noteData.customs = doneCustomTodos;
    // 计划事项 — read directly from store to avoid stale closure
    const freshPlanCheckins = (s.planItemCheckins ?? []).filter(c => !c.deleted);
    const freshTodayPlanItems = currentPlan
      ? getTodayItems(s.planItems ?? [], currentPlan, viewDate, freshPlanCheckins)
      : [];
    const donePlanItems = freshTodayPlanItems
      .filter(item => freshPlanCheckins.some(c => c.planItemId === item.id && c.date === viewDate && c.done))
      .map(item => item.name);
    if (donePlanItems.length) noteData.planItems = donePlanItems;
    if (totalCal > 0) noteData.food = totalCal;
    return JSON.stringify(noteData);
  }, [note, totalCal, viewDate]);

  // ── Real-time save ──
  // ═══════════════════════════════════════════════════════════════
  // Section 4: Event Handlers & Callbacks
  // ═══════════════════════════════════════════════════════════════

  const saveField = useCallback((doneOverride?: boolean) => {
    const done = doneOverride ?? localDoneRef.current ?? false;
    const weightNum = weightRef.current ? parseWeight(weightRef.current) : undefined;
    useAppStore.getState().submitCheckin(done, buildNote(), undefined, weightNum);
  }, [buildNote]);

  // ── Field change handlers ──
  const toggleHabit = useCallback((id: string) => {
    if (isReadOnly) return;
    checkinHabit(id, viewDate);
    setTimeout(() => saveField(), 0);
  }, [isReadOnly, checkinHabit, viewDate, saveField]);

  const addWaterCb = useCallback((ml: number) => {
    if (!isToday) return;
    addWater(ml);
    // 无论打卡状态如何，都更新饮水数据
    setTimeout(() => {
      const s = useAppStore.getState();
      const weightNum = weightRef.current ? parseWeight(weightRef.current) : undefined;
      s.submitCheckin(localDoneRef.current ?? false, buildNote(), undefined, weightNum);
    }, 0);
  }, [addWater, buildNote, isToday]);

  const handleFoodChanged = useCallback(() => {
    setTimeout(() => {
      const s = useAppStore.getState();
      const weightNum = weightRef.current ? parseWeight(weightRef.current) : undefined;
      s.submitCheckin(localDoneRef.current ?? false, buildNote(), undefined, weightNum);
    }, 0);
  }, [buildNote]);

  const saveWeight = useCallback((val: string) => {
    setWeight(val);
    const parsed = val ? parseFloat(val) : undefined;
    const w = parsed !== undefined && !isNaN(parsed) ? parsed : undefined;
    // 无论打卡状态如何，都更新体重数据
    useAppStore.getState().submitCheckin(localDoneRef.current ?? false, buildNote(), undefined, w);
  }, [buildNote]);

  const saveNote = useCallback((val: string) => {
    setNote(val);
    // Save on blur, not on every keystroke
  }, []);

  const handleNoteBlur = useCallback(() => {
    saveField();
  }, [saveField]);

  // ── Status change handlers ──
  const handleSetDone = useCallback(() => {
    const s = useAppStore.getState();
    const items = getIncompleteItems({
      habits: (s.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress'),
      planItems: todayPlanItems,
      planItemCheckins: planCheckins,
      today: viewDate,
    });
    if (items.length > 0) {
      setIncompleteItems(items);
      setSelectedReason('');
      setReasonNote('');
      setShowReasonModal(true);
      return;
    }
    setLocalDone(true);
    submitCheckin(true, buildNote(), undefined, parseWeight(weight));
  }, [submitCheckin, buildNote, weight, todayPlanItems, planCheckins, viewDate]);

  const handleEdit = useCallback(() => {
    setLocalDone(false);
    submitCheckin(false, buildNote(), undefined, parseWeight(weight));
  }, [submitCheckin, buildNote, weight]);

  const confirmDoneWithReason = useCallback(() => {
    if (!selectedReason || !reasonNote.trim()) return;
    setShowReasonModal(false);
    setLocalDone(true);
    const noteStr = buildNote();
    const noteData: Record<string, unknown> = JSON.parse(noteStr) as Record<string, unknown>;
    noteData.incompleteReason = selectedReason;
    noteData.incompleteNote = reasonNote.trim();
    submitCheckin(true, JSON.stringify(noteData), undefined, parseWeight(weight));
  }, [buildNote, selectedReason, reasonNote, submitCheckin, weight]);

  const togglePlanItem = useCallback((itemId: string) => {
    if (isReadOnly) return;
    const current = planCheckins.some(c => c.planItemId === itemId && c.date === viewDate && c.done);
    if (current) {
      uncheckinPlanItem(itemId);
    } else {
      checkinPlanItem(itemId);
    }
    setTimeout(() => saveField(), 0);
  }, [isReadOnly, planCheckins, viewDate, uncheckinPlanItem, checkinPlanItem, saveField]);

  const toggleCustomTodo = useCallback((id: string) => {
    if (isReadOnly) return;
    toggleDailyCustomTodo(id);
    setTimeout(() => saveField(), 0);
  }, [isReadOnly, toggleDailyCustomTodo, saveField]);

  // ── Extracted inline arrow functions ──
  const openStatsModal = useCallback(() => setShowStatsModal(true), []);
  const closeStatsModal = useCallback(() => setShowStatsModal(false), []);
  const closeWaterGoalModal = useCallback(() => setShowWG(false), []);
  const closeReasonModal = useCallback(() => setShowReasonModal(false), []);
  const goToGrace = useCallback(() => nav.navigate('Grace'), [nav]);
  const goToPlan = useCallback(() => navigateToTab('Plan'), [navigateToTab]);
  const dismissDelayedReminder = useCallback(() => setShowDelayedReminder(false), []);
  const toggleWeightUnit = useCallback(() => setWeightUnit(weightUnit === 'kg' ? 'lb' : 'kg'), [weightUnit, setWeightUnit]);
  const openWaterGoal = useCallback(() => { setWgi(String(waterGoal)); setShowWG(true); }, [waterGoal]);
  const saveWaterGoal = useCallback(() => {
    setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000)));
    setShowWG(false);
  }, [wgi, setWaterGoal]);
  const handleSaveWeight = useCallback(() => saveWeight(weight), [saveWeight, weight]);

  // ── Auto-sync plan items and health data on mount ──
  useEffect(() => {
    checkAutoStatus();
    autoSyncPlanItems();
  }, [checkAutoStatus, autoSyncPlanItems]);

  useEffect(() => {
    if (!healthSyncEnabled) return;
    import('../../health/HealthService').then(({ performHealthSync }) => {
      return performHealthSync(useAppStore.getState());
    }).catch((e) => log.error(e));
  }, [healthSyncEnabled]);

  // ── Banner gradient ──
  const bannerGrad: [string, string] = status === 'done'
    ? ['#7117EA', '#EA6060']
    : status === 'editing'
    ? ['#8446FF', '#18CEFF']
    : ['#8446FF', '#18CEFF'];

  const viewDateLabel = (() => {
    const d = new Date(viewDate + 'T00:00:00');
    return `${d.getMonth() + 1}月${d.getDate()}日打卡`;
  })();
  const bannerStatusText = status === 'done'
    ? (isToday ? T('checkinDoneBanner') : T('checkinDoneHistory'))
    : status === 'editing'
    ? T('checkinModifyNotDone')
    : (isToday ? T('checkinDoneToday') : T('checkinNotDoneBanner'));

  const bannerTimeText = todayRecord?.timestamp
    ? formatTime(new Date(todayRecord.timestamp), language, { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── Grace reminder ──
  const yStr = yesterday();
  const yesterdayRecord = useMemo(() => (checkinHistory ?? []).find((h: CheckinEntry) => !h.deleted && h.date === yStr), [checkinHistory, yStr]);
  const dayBeforeYesterdayStr = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 2); return dateStr(d); }, []);
  const dayBeforeYesterdayRecord = useMemo(() => (checkinHistory ?? []).find((h: CheckinEntry) => !h.deleted && h.date === dayBeforeYesterdayStr), [checkinHistory, dayBeforeYesterdayStr]);
  const showGrace = isToday && yesterdayRecord?.done !== true && dayBeforeYesterdayRecord?.done === true;
  const currentMonth = dateStr().slice(0, 7);
  const graceQuota = userProfile?.graceMonthlyQuota ?? 2;
  const graceAvailable = isGraceAvailable(graceHistory ?? [], graceQuota, currentMonth, yStr);

  // ── Delayed plan reminder ──
  const [showDelayedReminder, setShowDelayedReminder] = useState(true);
  const delayedPlan = useMemo(() => {
    return (plans ?? []).find(p => !p.deleted && isPlanDelayed(p, dateStr()));
  }, [plans]);
  const showDelayed = isToday && delayedPlan && showDelayedReminder;

  // ── No record state ──
  const hasRecord = !!todayRecord;

  // ═══════════════════════════════════════════════════════════════
  // Section 5: Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex1}
    >
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <StatusBar barStyle={TH === THEMES.light ? 'dark-content' : 'light-content'} />
      <SimpleHeader routeName="Home" />
        <View style={styles.flex1}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ padding: 16, paddingBottom: 0 }}>

              {/* ── Date Bar (hidden on today) ── */}
              <DateBar viewDate={viewDate} onNavigate={goToDate} />

              {/* ── No record state ── */}
              {!hasRecord && !isToday ? (
                <View style={{
                  backgroundColor: TH.card, borderRadius: 16, padding: 40, marginBottom: 12,
                  borderWidth: 1, borderColor: TH.border, alignItems: 'center',
                }}>
                  <Calendar size={40} color={TH.sub} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('noCheckinRecord')}</Text>
                </View>
              ) : (
                <>
              {/* ── Banner: stats + status ── */}
              <Banner
                status={status}
                bannerGrad={bannerGrad}
                bannerStatusText={bannerStatusText}
                bannerTimeText={bannerTimeText}
                isToday={isToday}
                totalCompleted={totalCompleted}
                viewDateStats={viewDateStats}
                streak={streak}
                showGrace={showGrace}
                graceAvailable={graceAvailable}
                onStatsPress={openStatsModal}
              />

              {/* ── Grace reminder ── */}
              {showGrace && <GraceReminder onPress={goToGrace} />}

              {/* ── Delayed plan reminder ── */}
              {showDelayed && delayedPlan && <DelayedReminder plan={delayedPlan} onGoToPlan={goToPlan} onDismiss={dismissDelayedReminder} />}

              {/* ── Check-in form / details ── */}
              <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <ClipboardList size={16} color={P} />
                  <Text style={{ fontWeight: '700', fontSize: FONT_CARD_TITLE(), color: TH.text }}>
                    {isReadOnly ? (isToday && status === 'done' ? '今日目标已达成，点赞 👍' : viewDateLabel) : (isToday ? T('checkinDoneToday') : viewDateLabel)}
                  </Text>
                </View>

                {/* Plan items & custom todos */}
                <HomePlanSection
                  todayPlanItems={todayPlanItems}
                  dailyCustomTodos={dailyCustomTodosMemo}
                  planCheckins={planCheckins}
                  viewDate={viewDate}
                  isReadOnly={isReadOnly}
                  onTogglePlanItem={togglePlanItem}
                  onToggleCustomTodo={toggleCustomTodo}
                />

                {/* Habits */}
                {activeHabits.length > 0 && (
                  <>
                    <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginTop: 16, marginBottom: 8 }}>{T('checkinHabitCheck')}</Text>
                    {activeHabits.map((h) => (
                      <HabitItem
                        key={h.id}
                        habit={h}
                        viewDate={viewDate}
                        TH={TH}
                        P={P}
                        T={T}
                        isReadOnly={isReadOnly}
                        onToggle={toggleHabit}
                      />
                    ))}
                  </>
                )}

              </View>

              {/* ── Weight card ── */}
              <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <View style={styles.flexRowBetween}>
                  <View style={styles.flexRowGap6}>
                    <Scale size={16} color={P} />
                    <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todayWeight')}</Text>
                  </View>
                  <View style={styles.flexRowGap6}>
                    {isReadOnly ? (
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
                        {weight || '—'}
                      </Text>
                    ) : (
                      <TextInput
                        value={weight}
                        onChangeText={setWeight}
                        onBlur={handleSaveWeight}
                        placeholder="—"
                        placeholderTextColor={TH.sub}
                        keyboardType="numeric"
                        style={{
                          width: 70, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                          borderRadius: 8, paddingVertical: 6, color: TH.text, fontWeight: '700',
                          fontSize: FONT_BODY(), backgroundColor: TH.card,
                        }}
                      />
                    )}
                    <TouchableOpacity
                      onPress={toggleWeightUnit}
                      accessibilityLabel={weightUnit === 'kg' ? '切换为磅' : '切换为千克'}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: `${P}20` }}
                    >
                      <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB() }}>{weightUnit === 'kg' ? 'kg' : 'lb'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Steps */}
                {isToday && healthSyncEnabled && todaySteps != null ? (
                  <View style={[styles.flexRowBetween, styles.marginTop10]}>
                    <View style={styles.flexRowGap6}>
                      <Footprints size={16} color={P} />
                      <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todaySteps')}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
                      {todaySteps.toLocaleString()}
                    </Text>
                  </View>
                ) : !isToday ? (
                  <View style={[styles.flexRowBetween, styles.marginTop10]}>
                    <View style={styles.flexRowGap6}>
                      <Footprints size={16} color={P} />
                      <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todaySteps')}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: TH.sub }}>--</Text>
                  </View>
                ) : null}
              </View>

              {/* ── Water card ── */}
              <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={styles.flexRowGap6}>
                    <Droplets size={16} color={P} />
                    <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('water')}</Text>
                  </View>
                  <View style={styles.flexRowGap6}>
                    {isToday ? (
                      <>
                        <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                          <Text style={{ fontWeight: '600', color: P }}>{String(waterMl)}</Text> / {String(waterGoal)} ml
                        </Text>
                        <TouchableOpacity onPress={openWaterGoal} accessibilityLabel="编辑饮水目标">
                          <Pencil size={14} color={TH.sub} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                        <Text style={{ fontWeight: '600', color: P }}>{String(parsed.waterMl)}</Text> ml
                      </Text>
                    )}
                  </View>
                </View>
                {isToday ? (
                  <>
                    <ProgressBar pct={waterGoal > 0 ? waterMl / waterGoal * 100 : 0} color={P} />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {[200, 250, 350, 500].map(ml => (
                        <TouchableOpacity key={ml} onPress={() => addWaterCb(ml)}
                          accessibilityLabel={`添加${ml}毫升水`}
                          style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
                          <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB() }}>{ml}ml</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <ProgressBar pct={waterGoal > 0 ? parsed.waterMl / waterGoal * 100 : 0} color={P} />
                )}
              </View>

              {/* ── Food section ── */}
              <HomeFoodSection
                foods={viewDateFoods}
                totalCal={totalCal}
                recentFoods={recentFoods}
                isToday={isToday}
                calGoal={calGoal}
                isReadOnly={isReadOnly}
                onDeleteFood={deleteFood}
                onAddFood={addFood}
                onFoodChanged={handleFoodChanged}
                onSetCalGoal={setCalGoal}
              />

              {/* ── Reflection card ── */}
              <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border, marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={16} color={P} />
                  <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY() }}>{T('checkinNote')}</Text>
                </View>
                {isReadOnly ? (
                  <Text style={{ color: TH.text, fontSize: FONT_BODY(), lineHeight: 22 }}>
                    {note || '—'}
                  </Text>
                ) : (
                  <ThemedInput
                    value={note}
                    onChangeText={saveNote}
                    onBlur={handleNoteBlur}
                    placeholder={T('checkinNotePlaceholder')}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 80 }}
                  />
                )}
              </View>

              {/* ── Status button (today only) ── */}
              {isToday && (
                isLocked ? (
                  <TouchableOpacity
                    onPress={handleEdit}
                    accessibilityLabel={T('checkinModify')}
                    style={{ backgroundColor: P, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}
                  >
                    <View style={styles.flexRowGap6}>
                      <Pencil size={18} color="#fff" />
                      <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('checkinModify')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSetDone}
                    accessibilityLabel={T('checkinSubmit')}
                    style={{ backgroundColor: TH.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}>
                    <View style={styles.flexRowGap6}>
                      <Check size={18} color="#fff" />
                      <Text style={{ fontWeight: '700', fontSize: FONT_BUTTON(), color: '#fff' }}>
                        {T('checkinSubmit')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}

                </>
              )}

            </View>
          </ScrollView>
        </View>

      {/* ── Floating bubble (draggable) ── */}
      <HomeBubble
        visible={!isToday}
        onTap={() => goToDate(dateStr())}
      />

      {/* Water Goal Modal */}
      <Modal visible={showWG} transparent animationType="fade" onRequestClose={closeWaterGoalModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), marginBottom: 6, color: TH.text }}>{T('waterGoalSetting')}</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginBottom: 16 }}>{T('waterGoalHint')}</Text>
            <TextInput
              value={wgi} onChangeText={setWgi} keyboardType="numeric"
              style={{
                width: '100%', fontSize: FONT_STAT_CARD(), fontWeight: '700', textAlign: 'center',
                backgroundColor: TH.card, borderWidth: 2, borderColor: COLORS.BLUE,
                borderRadius: 12, padding: 14, color: TH.text, marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={closeWaterGoalModal}
                accessibilityLabel={T('cancel')}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveWaterGoal}
                accessibilityLabel={T('save')}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incomplete Reason Modal */}
      <Modal visible={showReasonModal} transparent animationType="fade" onRequestClose={closeReasonModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
              <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text, marginBottom: 12 }}>{T('incompleteReasonTitle')}</Text>

              {/* Incomplete items list */}
              <View style={{ marginBottom: 16 }}>
                {incompleteItems.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <X size={16} color="#C53364" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: FONT_TITLE(), color: TH.sub }}>{item.name}</Text>
                  </View>
                ))}
              </View>

              {/* Reason options */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {INCOMPLETE_REASONS.map(r => {
                  const labelKey = `incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}` as string;
                  const selected = selectedReason === r.code;
                  return (
                    <TouchableOpacity key={r.code} onPress={() => setSelectedReason(r.code)}
                      accessibilityLabel={`${r.icon} ${T(labelKey)}`}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                        borderWidth: 1.5, borderColor: selected ? P : TH.border,
                        backgroundColor: selected ? `${P}15` : 'transparent',
                      }}>
                      <Text style={{ fontSize: FONT_BODY(), color: selected ? P : TH.text }}>
                        {r.icon} {T(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Additional note */}
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}><Text style={{ color: '#EF4444' }}>*</Text> {T('incompleteReasonNote')}</Text>
              <TextInput
                value={reasonNote} onChangeText={setReasonNote}
                placeholder={T('incompleteReasonNotePlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                style={{
                  width: '100%', minHeight: 60, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
                  borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 20,
                  textAlignVertical: 'top',
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={closeReasonModal}
                  accessibilityLabel={T('incompleteReasonBack')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON() }}>{T('incompleteReasonBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDoneWithReason} disabled={!selectedReason || !reasonNote.trim()}
                  accessibilityLabel={T('incompleteReasonConfirm')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: selectedReason && reasonNote.trim() ? P : TH.border, alignItems: 'center' }}>
                  <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('incompleteReasonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <CheckinStatsModal
        visible={showStatsModal}
        onClose={closeStatsModal}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  flexRowGap6: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  flexRowGap10: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  flexRowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  center: { alignItems: 'center' as const },
  centerFlex1: { alignItems: 'center' as const, flex: 1 },
  padding6: { padding: 6 },
  marginTop4: { marginTop: 4 },
  marginTop10: { marginTop: 10 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardWithBorder: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardPadded: { borderRadius: 16, padding: 14, marginBottom: 12 },
  pillBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  separator: { width: 1, height: 40 },
  // Text styles (theme-dependent, use with array merge)
  textBold: { fontWeight: '600' as const },
  textSemiBold: { fontWeight: '700' as const },
  textExtraBold: { fontWeight: '800' as const },
  whiteText: { color: '#fff' },
  whiteTextBold: { color: '#fff', fontWeight: '700' as const },
  whiteTextExtraBold: { color: '#fff', fontWeight: '800' as const },
  whiteSubText: { color: 'rgba(255,255,255,.6)' },
  whiteDimText: { color: 'rgba(255,255,255,.5)' },
  whiteSeparator: { backgroundColor: 'rgba(255,255,255,.2)' },
};
