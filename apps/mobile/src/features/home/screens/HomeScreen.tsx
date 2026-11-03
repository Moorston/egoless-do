import { THEMES, COLORS, dateStr, yesterday, getFoodLogByDate, getRecentFoods, FONT_BODY, FONT_SUB, FONT_LABEL, FONT_CARD_TITLE, parseCheckinNote, getActivePlan, getTodayItems, getTodayCustomTodos, isPlanDelayed, getIncompleteItems, getStatsForDate, isGraceAvailable, createLogger, formatTime, getHabitStreak } from '@egoless-do/core';
import type { CheckinEntry, Habit } from '@egoless-do/core';
import {
  Check, X, Star, ClipboardList,
} from 'lucide-react-native';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useTheme, useT, Checkbox } from '../../../components/UI';
import SimpleHeader from '../../../navigation/SimpleHeader';
import { useRootNavigation } from '../../../navigation/hooks';
import { useNavigateToTab } from '../../../navigation/useAppNavigation';
import { useCheckinStreak, useActiveHabits } from '../../../store/selectors';
import { useAppStore, useShallowStore, type MobileStore } from '../../../store/useAppStore';
import Banner from '../components/Banner';
import CheckinStatsModal from '../components/CheckinStatsModal';
import DateBar from '../components/DateBar';
import DelayedReminder from '../components/DelayedReminder';
import { EmptyRecordState } from '../components/EmptyRecordState';
import GraceReminder from '../components/GraceReminder';
import HomeBubble from '../components/HomeBubble';
import HomeFoodSection from '../components/HomeFoodSection';
import HomePlanSection from '../components/HomePlanSection';
import { ReasonModal } from '../components/ReasonModal';
import { ReflectionCard } from '../components/ReflectionCard';
import { StatusButton } from '../components/StatusButton';
import { WaterCard } from '../components/WaterCard';
import { WaterGoalModal } from '../components/WaterGoalModal';
import { WeightCard } from '../components/WeightCard';
import { useDateNavigation } from '../hooks/useDateNavigation';
import { styles } from '../styles';

import { buildCheckinNote } from './buildCheckinNote';

const log = createLogger('Home');

type CheckinStatus = 'draft' | 'done' | 'editing';

/** Derive check-in status from the existing record — extracted to module level
 *  to keep HomeScreen's cyclomatic complexity within the ≤15 project threshold. */
function computeCheckinStatus(record: CheckinEntry | undefined): CheckinStatus {
  return record ? (record.done ? 'done' : 'editing') : 'draft';
}

/** Whether fields are read-only (past date or locked by done-status). */
function computeIsReadOnly(isToday: boolean, isLocked: boolean): boolean {
  return !isToday || isLocked;
}

/** Check-in card title text — extracted to module level to keep HomeScreen's
 *  cyclomatic complexity within the ≤15 project threshold. */
function computeCardTitle(
  status: CheckinStatus,
  isReadOnly: boolean,
  isToday: boolean,
  viewDateLabel: string,
  T: (key: string) => string,
): string {
  if (isReadOnly) {
    return isToday && status === 'done' ? '今日目标已达成，点赞 👍' : viewDateLabel;
  }
  return isToday ? T('checkinDoneToday') : viewDateLabel;
}

/** Banner timestamp text — extracted to module level to keep HomeScreen's
 *  cyclomatic complexity within the ≤15 project threshold. */
function computeBannerTimeText(record: CheckinEntry | undefined, language: string): string {
  return record?.timestamp
    ? formatTime(new Date(record.timestamp), language, { hour: '2-digit', minute: '2-digit' })
    : '';
}

/** Banner gradient based on check-in status — extracted to module level to keep
 *  HomeScreen's cyclomatic complexity within the ≤15 project threshold. */
function computeBannerGrad(status: CheckinStatus): [string, string] {
  return status === 'done'
    ? ['#7117EA', '#EA6060']
    : ['#8446FF', '#18CEFF'];
}

/** Human-readable label for the viewed date. */
function formatViewDateLabel(viewDate: string): string {
  const d = new Date(viewDate + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日打卡`;
}

/** Banner status text based on status + whether viewing today. */
function computeBannerStatusText(status: CheckinStatus, isToday: boolean, T: (key: string) => string): string {
  return status === 'done'
    ? (isToday ? T('checkinDoneBanner') : T('checkinDoneHistory'))
    : status === 'editing'
    ? T('checkinModifyNotDone')
    : (isToday ? T('checkinDoneToday') : T('checkinNotDoneBanner'));
}

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
          <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{String(getHabitStreak(habit))} {T('checkinStreak')}</Text>
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
    foodLog, waterMl, waterGoal, calGoal,
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
  // activeHabits 已通过 useActiveHabits() selector 获取（line ~110）

  // ── Status derivation ──
  const status = computeCheckinStatus(todayRecord);

  // Whether fields are locked (read-only from done status)
  const isLocked = status === 'done';
  // Whether in read-only mode (past dates or locked)
  const isReadOnly = computeIsReadOnly(isToday, isLocked);

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
  // Domain logic extracted to buildCheckinNote (./buildCheckinNote) for unit
  // testability — see openspec/changes/dedupe-home-realtime-save/design.md (D2).
  // Reads store fresh via getState() so no setTimeout delay is needed.
  const buildNote = useCallback(
    () => buildCheckinNote(useAppStore.getState(), { note, totalCal, viewDate }),
    [note, totalCal, viewDate],
  );

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
    saveField();
  }, [isReadOnly, checkinHabit, viewDate, saveField]);

  const addWaterCb = useCallback((ml: number) => {
    if (!isToday) return;
    addWater(ml);
    // 无论打卡状态如何，都更新饮水数据
    saveField();
  }, [addWater, isToday, saveField]);

  const handleFoodChanged = useCallback(() => {
    saveField();
  }, [saveField]);

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
    saveField();
  }, [isReadOnly, planCheckins, viewDate, uncheckinPlanItem, checkinPlanItem, saveField]);

  const toggleCustomTodo = useCallback((id: string) => {
    if (isReadOnly) return;
    toggleDailyCustomTodo(id);
    saveField();
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
  const bannerGrad = computeBannerGrad(status);
  const viewDateLabel = formatViewDateLabel(viewDate);
  const bannerStatusText = computeBannerStatusText(status, isToday, T);
  const cardTitle = computeCardTitle(status, isReadOnly, isToday, viewDateLabel, T);
  const bannerTimeText = computeBannerTimeText(todayRecord, language);

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
                <EmptyRecordState />
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
                streak={checkinStreak}
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
                    {cardTitle}
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
              <WeightCard
                weight={weight}
                setWeight={setWeight}
                handleSaveWeight={handleSaveWeight}
                toggleWeightUnit={toggleWeightUnit}
                weightUnit={weightUnit}
                isReadOnly={isReadOnly}
                isToday={isToday}
                healthSyncEnabled={healthSyncEnabled}
                todaySteps={todaySteps}
              />

              {/* ── Water card ── */}
              <WaterCard
                isToday={isToday}
                waterMl={waterMl}
                waterGoal={waterGoal}
                parsedWaterMl={parsed.waterMl}
                openWaterGoal={openWaterGoal}
                addWaterCb={addWaterCb}
              />

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
              <ReflectionCard
                isReadOnly={isReadOnly}
                note={note}
                onSaveNote={saveNote}
                onNoteBlur={handleNoteBlur}
              />

              {/* ── Status button (today only) ── */}
              <StatusButton
                isToday={isToday}
                isLocked={isLocked}
                onEdit={handleEdit}
                onSetDone={handleSetDone}
              />

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
      <WaterGoalModal
        visible={showWG}
        wgi={wgi}
        setWgi={setWgi}
        onClose={closeWaterGoalModal}
        onSave={saveWaterGoal}
      />

      {/* Incomplete Reason Modal */}
      <ReasonModal
        visible={showReasonModal}
        incompleteItems={incompleteItems}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        reasonNote={reasonNote}
        setReasonNote={setReasonNote}
        onClose={closeReasonModal}
        onConfirm={confirmDoneWithReason}
      />

      <CheckinStatsModal
        visible={showStatsModal}
        onClose={closeStatsModal}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

