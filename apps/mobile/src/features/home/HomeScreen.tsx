import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Modal, TextInput,
  KeyboardAvoidingView, Platform, Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, cardAccent, cardTextColor, dateStr, yesterday, getFoodLogByDate, getRecentFoods, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_SMALL, FONT_LABEL, FONT_BADGE, FONT_CARD_TITLE, parseCheckinNote, getActivePlan, getTodayItems, getTodayCustomTodos, isPlanDelayed, getIncompleteItems, INCOMPLETE_REASONS, getStatsForDate, isGraceAvailable } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useTheme, useT, ProgressBar, Checkbox, ThemedInput } from '../../components/UI';
import AddFoodModal from '../../components/AddFoodModal';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import {
  Utensils, Scale, Footprints,
  Droplets, Pencil, Check, X, Shield, Star, Sparkles,
  PersonStanding, ClipboardList, Target, BarChart3, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react-native';
import CheckinStatsModal from './CheckinStatsModal';

type CheckinStatus = 'draft' | 'done' | 'editing';

// ── Date helpers ──
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function addDays(dateStrVal: string, days: number): string {
  const d = new Date(dateStrVal + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateBar(dateStrVal: string, isToday: boolean, T: (k: string) => string): string {
  const d = new Date(dateStrVal + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  const base = `${m}月${day}日 · 周${w}`;
  return isToday ? `${base} · ${T('dateBarToday')}` : base;
}

export default function HomeScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useRootNavigation();

  // ── Date state ──
  const [viewDate, setViewDate] = useState(dateStr());
  const isToday = viewDate === dateStr();
  const today = viewDate; // alias for compatibility

  const weightUnit = useAppStore(s => s.weightUnit);

  // ── Existing checkin ──
  const todayRecord = useMemo(
    () => (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === viewDate),
    [store.checkinHistory, viewDate],
  );
  const parsed = useMemo(() => parseCheckinNote(todayRecord?.note ?? ''), [todayRecord]);

  // ── Local state (initialized from existing record) ──
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [localDone, setLocalDone] = useState<boolean | null>(() => todayRecord?.done ?? null);
  const [practices, setPractices] = useState(() => ({
    sit: parsed.practices.includes('sit'),
    stand: parsed.practices.includes('stand'),
    chant: parsed.practices.includes('chant'),
  }));
  const [note, setNote] = useState(() => parsed.userNote);
  const [weight, setWeight] = useState(() => todayRecord?.weight != null ? String(todayRecord.weight) : '');
  // habitCheckins derived from store — no local state needed

  // ── Plan items ──
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const planCheckins = store.planItemCheckins ?? [];
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, viewDate, planCheckins);
  }, [store.planItems, activePlan, viewDate, planCheckins]);
  const dailyCustomTodos = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], activePlan.id, viewDate);
  }, [store.dailyCustomTodos, activePlan, viewDate]);
  // planToggles derived from store — no local state needed

  // ── Modals ──
  const [showFood, setShowFood] = useState(false);
  const [showWG, setShowWG] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState<ReturnType<typeof getIncompleteItems>>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonNote, setReasonNote] = useState('');
  const [wgi, setWgi] = useState(String(store.waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(store.calGoal));

  // ── Derived data ──
  const viewDateFoods = useMemo(() => getFoodLogByDate(store.foodLog ?? [], viewDate), [store.foodLog, viewDate]);
  const totalCal = useMemo(() => viewDateFoods.reduce((a, f) => a + f.calories, 0), [viewDateFoods]);
  const recentFoods = useMemo(() => getRecentFoods(store.foodLog ?? [], 3), [store.foodLog]);
  const todayFoods = viewDateFoods.slice(0, 3);
  const todayFoodTotal = viewDateFoods.length;
  const [portionFood, setPortionFood] = useState<{ name: string; calories: number } | null>(null);
  const [portion, setPortion] = useState(1);
  const totalCompleted = useMemo(
    () => (store.checkinHistory ?? []).filter((c: CheckinEntry) => c.done).length,
    [store.checkinHistory],
  );
  const viewDateStats = useMemo(
    () => getStatsForDate(store.checkinHistory ?? [], viewDate),
    [store.checkinHistory, viewDate],
  );
  const activeHabits = useMemo(
    () => (store.habits ?? []).filter(h => h.status === 'inProgress'),
    [store.habits],
  );

  // ── Status derivation ──
  const status: CheckinStatus = todayRecord
    ? (todayRecord.done ? 'done' : 'editing')
    : (localDone !== null ? 'draft' : 'draft');

  // Whether fields are locked (read-only from done status)
  const isLocked = status === 'done';
  // Whether in read-only mode (past dates or locked)
  const isReadOnly = !isToday || isLocked;

  // ── Swipe gesture (instant page switch) ──
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const viewDateRef = useRef(viewDate);
  viewDateRef.current = viewDate;

  const onTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  }, []);

  const onTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    const dy = e.nativeEvent.pageY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) {
        const nextDate = addDays(viewDateRef.current, 1);
        if (nextDate <= dateStr()) setViewDate(nextDate);
      } else {
        setViewDate(addDays(viewDateRef.current, -1));
      }
    }
  }, []);

  // ── Draggable bubble (own touch refs to avoid conflict with swipe) ──
  const bubblePos = useRef({ x: 0, y: 0 }).current;
  const bubbleOffset = useRef({ x: 0, y: 0 }).current;
  const bubbleTransX = useRef(new RNAnimated.Value(0)).current;
  const bubbleTransY = useRef(new RNAnimated.Value(0)).current;
  const isDragging = useRef(false);
  const bubbleTouchStartX = useRef(0);
  const bubbleTouchStartY = useRef(0);

  const onBubbleTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    isDragging.current = false;
    bubbleTouchStartX.current = e.nativeEvent.pageX;
    bubbleTouchStartY.current = e.nativeEvent.pageY;
    bubbleOffset.current = { x: bubblePos.x, y: bubblePos.y };
  }, [bubblePos]);

  const onBubbleTouchMove = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - bubbleTouchStartX.current;
    const dy = e.nativeEvent.pageY - bubbleTouchStartY.current;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    const newX = bubbleOffset.current.x + dx;
    const newY = bubbleOffset.current.y + dy;
    bubbleTransX.setValue(newX);
    bubbleTransY.setValue(newY);
  }, [bubbleTransX, bubbleTransY, bubbleOffset]);

  const onBubbleTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - bubbleTouchStartX.current;
    const dy = e.nativeEvent.pageY - bubbleTouchStartY.current;
    const finalX = bubbleOffset.current.x + dx;
    const finalY = bubbleOffset.current.y + dy;
    bubblePos.x = finalX;
    bubblePos.y = finalY;
    if (!isDragging.current) {
      setViewDate(dateStr());
    }
  }, [bubblePos, bubbleOffset]);

  const goToDate = useCallback((target: string) => {
    setViewDate(target);
  }, []);

  // ── Re-sync local state when todayRecord changes ──
  useEffect(() => {
    if (!todayRecord) {
      // No record for this date — reset local state
      setLocalDone(null);
      setPractices({ sit: false, stand: false, chant: false });
      setNote('');
      setWeight('');
      return;
    }
    const p = parseCheckinNote(todayRecord.note ?? '');
    setLocalDone(todayRecord.done ?? null);
    setPractices({
      sit: p.practices.includes('sit'),
      stand: p.practices.includes('stand'),
      chant: p.practices.includes('chant'),
    });
    setNote(p.userNote);
    setWeight(todayRecord.weight != null ? String(todayRecord.weight) : '');
  }, [todayRecord?.date, todayRecord?.updatedAt]);

  // ── Build JSON note ──
  const buildNote = useCallback(() => {
    const s = useAppStore.getState();
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (s.waterMl > 0) noteData.water = s.waterMl;
    const pr: string[] = [];
    if (practices.sit) pr.push('sit');
    if (practices.stand) pr.push('stand');
    if (practices.chant) pr.push('chant');
    if (pr.length) noteData.practices = pr;
    const checkedHabits = (s.habits ?? [])
      .filter(h => h.status === 'inProgress' && h.checkedDates?.includes(viewDate))
      .map(h => h.name);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    if (totalCal > 0) noteData.food = totalCal;
    return JSON.stringify(noteData);
  }, [note, practices, totalCal, viewDate]);

  // ── Real-time save ──
  const saveField = useCallback((doneOverride?: boolean) => {
    const done = doneOverride ?? localDone ?? false;
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(done, buildNote(), undefined, weightNum);
  }, [localDone, buildNote, weight, store]);

  // ── Field change handlers ──
  const togglePractice = useCallback((key: 'sit' | 'stand' | 'chant') => {
    if (isReadOnly) return;
    setPractices(p => {
      const next = { ...p, [key]: !p[key] };
      setTimeout(() => {
        const pr: string[] = [];
        if (next.sit) pr.push('sit');
        if (next.stand) pr.push('stand');
        if (next.chant) pr.push('chant');
        const noteData: Record<string, unknown> = {};
        if (note) noteData.note = note;
        if (store.waterMl > 0) noteData.water = store.waterMl;
        if (pr.length) noteData.practices = pr;
        const checkedHabits = (store.habits ?? [])
          .filter(h => h.status === 'inProgress' && h.checkedDates?.includes(viewDate))
          .map(h => h.name);
        if (checkedHabits.length) noteData.habits = checkedHabits;
        if (totalCal > 0) noteData.food = totalCal;
        const w = weight ? parseFloat(weight) : undefined;
        store.submitCheckin(localDone ?? false, JSON.stringify(noteData), undefined, w);
      }, 0);
      return next;
    });
  }, [isReadOnly, note, store, totalCal, weight, localDone, viewDate]);

  const toggleHabit = useCallback((id: string) => {
    if (isReadOnly) return;
    store.checkinHabit(id, viewDate);
    setTimeout(() => saveField(), 0);
  }, [isReadOnly, store, viewDate, saveField]);

  const addWater = useCallback((ml: number) => {
    if (!isToday) return;
    store.addWater(ml);
    setTimeout(() => saveField(), 0);
  }, [store, saveField, isToday]);

  const saveWeight = useCallback((val: string) => {
    setWeight(val);
    const w = val ? parseFloat(val) : undefined;
    store.submitCheckin(localDone ?? false, buildNote(), undefined, w);
  }, [localDone, buildNote, store]);

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
      practices,
      habits: (s.habits ?? []).filter(h => h.status === 'inProgress'),
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
    store.submitCheckin(true, buildNote(), undefined, weight ? parseFloat(weight) : undefined);
  }, [store, buildNote, weight, practices, todayPlanItems, planCheckins, viewDate]);

  const handleEdit = useCallback(() => {
    setLocalDone(false);
    store.submitCheckin(false, buildNote(), undefined, weight ? parseFloat(weight) : undefined);
  }, [store, buildNote, weight]);

  const confirmDoneWithReason = useCallback(() => {
    if (!selectedReason || !reasonNote.trim()) return;
    setShowReasonModal(false);
    setLocalDone(true);
    const noteStr = buildNote();
    const noteData = JSON.parse(noteStr);
    noteData.incompleteReason = selectedReason;
    noteData.incompleteNote = reasonNote.trim();
    store.submitCheckin(true, JSON.stringify(noteData), undefined, weight ? parseFloat(weight) : undefined);
  }, [buildNote, selectedReason, reasonNote, store, weight]);

  const togglePlanItem = useCallback((itemId: string) => {
    if (isReadOnly) return;
    const current = planCheckins.some(c => c.planItemId === itemId && c.date === viewDate && c.done);
    if (current) {
      store.uncheckinPlanItem(itemId);
    } else {
      store.checkinPlanItem(itemId);
    }
  }, [isReadOnly, planCheckins, viewDate, store]);

  const toggleCustomTodo = useCallback((id: string) => {
    if (isReadOnly) return;
    store.toggleDailyCustomTodo(id);
  }, [isReadOnly, store]);

  // ── Auto-sync plan items and health data on mount ──
  useEffect(() => {
    store.checkAutoStatus();
    store.autoSyncPlanItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store.healthSyncEnabled) return;
    import('../health/HealthService').then(({ performHealthSync }) => {
      performHealthSync(store);
    }).catch(console.error);
  }, [store.healthSyncEnabled]);

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
    ? T('checkinDoneBanner')
    : status === 'editing'
    ? T('checkinModifyNotDone')
    : (isToday ? T('checkinDoneToday') : viewDateLabel);

  const bannerTimeText = todayRecord?.timestamp
    ? new Date(todayRecord.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── Grace reminder ──
  const yStr = yesterday();
  const yesterdayRecord = (store.checkinHistory ?? []).find((h: CheckinEntry) => h.date === yStr);
  const showGrace = isToday && yesterdayRecord?.done !== true;
  const currentMonth = dateStr().slice(0, 7);
  const graceQuota = store.userProfile?.graceMonthlyQuota ?? 2;
  const graceAvailable = isGraceAvailable(store.graceHistory ?? [], graceQuota, currentMonth, yStr);

  // ── Delayed plan reminder ──
  const [showDelayedReminder, setShowDelayedReminder] = useState(true);
  const delayedPlan = useMemo(() => {
    const plans = store.plans ?? [];
    return plans.find(p => !p.deleted && isPlanDelayed(p, dateStr()));
  }, [store.plans]);
  const showDelayed = isToday && delayedPlan && showDelayedReminder;

  const warnBg = cardAccent('#F59E0B', TH.bg, 0.45);

  // ── No record state ──
  const hasRecord = !!todayRecord;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <StatusBar barStyle={TH === THEMES.light ? 'dark-content' : 'light-content'} />
      <SimpleHeader routeName="Home" />
        <View style={{ flex: 1 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ padding: 16, paddingBottom: 0 }}>

              {/* ── Date Bar (hidden on today) ── */}
              {!isToday && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                height: 48, backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 12,
                marginBottom: 12, borderBottomWidth: 1, borderBottomColor: TH.border,
              }}>
                <TouchableOpacity
                  onPress={() => goToDate(addDays(viewDate, -1))}
                  style={{ padding: 6 }}
                  activeOpacity={0.6}
                >
                  <ChevronLeft size={20} color={TH.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {formatDateBar(viewDate, isToday, T)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = addDays(viewDate, 1);
                    if (next <= dateStr()) goToDate(next);
                  }}
                  style={{ padding: 6 }}
                  activeOpacity={0.6}
                  disabled={isToday}
                >
                  <ChevronRight size={20} color={isToday ? TH.border : TH.text} />
                </TouchableOpacity>
              </View>
              )}

              {/* ── No record state ── */}
              {!hasRecord && !isToday ? (
                <View style={{
                  backgroundColor: TH.card, borderRadius: 16, padding: 40, marginBottom: 12,
                  borderWidth: 1, borderColor: TH.border, alignItems: 'center',
                }}>
                  <Calendar size={40} color={TH.sub} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('noCheckinRecord')}</Text>
                </View>
              ) : (
                <>
              {/* ── Banner: stats + status ── */}
              <LinearGradient
                colors={bannerGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 18, marginBottom: 12 }}
              >
                {/* Status — prominent */}
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 20,
                    paddingHorizontal: 16, paddingVertical: 6,
                  }}>
                    {status === 'done'
                      ? <Check size={18} color="#fff" />
                      : status === 'editing'
                      ? <Pencil size={18} color="#fff" />
                      : <Target size={18} color="#fff" />
                    }
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
                      {bannerStatusText}
                    </Text>
                  </View>
                  {bannerTimeText ? (
                    <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB, marginTop: 6 }}>{bannerTimeText}</Text>
                  ) : null}
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => setShowStatsModal(true)} activeOpacity={0.7}>
                    <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB }}>{T('totalCompleted')}</Text>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{isToday ? totalCompleted : viewDateStats.totalDays}</Text>
                    <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
                    <BarChart3 size={12} color="rgba(255,255,255,.4)" style={{ marginTop: 4 }} />
                  </TouchableOpacity>
                  <View style={{ width: 1, height: 40, backgroundColor: 'rgba(255,255,255,.2)' }} />
                  <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => setShowStatsModal(true)} activeOpacity={0.7}>
                    <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB }}>{T('streak')}</Text>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{isToday ? store.streak : viewDateStats.streak}</Text>
                    <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
                    {isToday && showGrace && graceAvailable ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        <Shield size={10} color="rgba(255,255,255,.7)" />
                        <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: 9 }}>{T('graceStreakPending')}</Text>
                      </View>
                    ) : (
                      <BarChart3 size={12} color="rgba(255,255,255,.4)" style={{ marginTop: 4 }} />
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* ── Grace reminder ── */}
              {showGrace && (
                <TouchableOpacity
                  onPress={() => nav.navigate('Grace')}
                  activeOpacity={0.8}
                  style={{ borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: warnBg, borderRadius: 14 }}>
                    <Shield size={20} color={cardTextColor(TH.bg)} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cardTextColor(TH.bg), fontWeight: '700', fontSize: FONT_BODY }}>{T('graceRemindTitle')}</Text>
                      <Text style={{ color: cardTextColor(TH.bg), opacity: 0.8, fontSize: FONT_SUB, marginTop: 2 }}>{T('graceRemindDesc')}</Text>
                    </View>
                    <Text style={{ color: cardTextColor(TH.bg), fontSize: FONT_SUB }}>→</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* ── Delayed plan reminder ── */}
              {showDelayed && (
                <TouchableOpacity
                  onPress={() => nav.navigate('Plan')}
                  activeOpacity={0.8}
                  style={{ borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: cardAccent(COLORS.RED, TH.bg, 0.45), borderRadius: 14 }}>
                    <AlertTriangle size={20} color={cardTextColor(TH.bg)} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cardTextColor(TH.bg), fontWeight: '700', fontSize: FONT_BODY }}>{T('planDelayedNotify')}</Text>
                      <Text style={{ color: cardTextColor(TH.bg), opacity: 0.8, fontSize: FONT_SUB, marginTop: 2 }}>
                        {T('planDelayed')}: {delayedPlan.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowDelayedReminder(false)} style={{ padding: 4 }}>
                      <X size={16} color={cardTextColor(TH.bg)} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}

              {/* ── Check-in form / details ── */}
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <ClipboardList size={16} color={P} />
                  <Text style={{ fontWeight: '700', fontSize: FONT_CARD_TITLE, color: TH.text }}>
                    {isReadOnly ? (isToday && status === 'done' ? '今日目标已达成，点赞 👍' : viewDateLabel) : (isToday ? T('checkinDoneToday') : viewDateLabel)}
                  </Text>
                </View>

                {/* Practices */}
                <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginBottom: 8 }}>{T('checkinPractice')}</Text>
                {([
                  { key: 'sit' as const, icon: <PersonStanding size={16} color={P} />, label: T('checkinSit') },
                  { key: 'stand' as const, icon: <PersonStanding size={16} color={P} />, label: T('checkinStand') },
                  { key: 'chant' as const, icon: <Sparkles size={16} color={P} />, label: T('checkinSutra') },
                ]).map(({ key, icon, label }) => (
                  <View key={key} style={{
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: TH.border,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {icon}
                      <Text style={{ color: isReadOnly && !practices[key] ? TH.sub : TH.text, fontSize: FONT_BODY, opacity: isReadOnly && !practices[key] ? 0.5 : 1 }}>
                        {label}
                      </Text>
                    </View>
                    {isReadOnly ? (
                      practices[key]
                        ? <Check size={18} color={COLORS.GREEN} />
                        : <X size={18} color={TH.sub} />
                    ) : (
                      <Checkbox on={practices[key]} onChange={() => togglePractice(key)} />
                    )}
                  </View>
                ))}

                {/* Plan items */}
                {todayPlanItems.length > 0 && (
                  <>
                    <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginTop: 16, marginBottom: 8 }}>{T('planTodoList')}</Text>
                    {todayPlanItems.map(item => {
                      const done = planCheckins.some(c => c.planItemId === item.id && c.date === viewDate && c.done);
                      const autoChecked = done && planCheckins.some(c => c.planItemId === item.id && c.date === viewDate && c.done && c.linkedModule);
                      return (
                        <View key={item.id} style={{
                          flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between', paddingVertical: 12,
                          borderBottomWidth: 1, borderBottomColor: TH.border,
                          opacity: autoChecked ? 0.7 : 1,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ClipboardList size={16} color={P} />
                            <View>
                              <Text style={{ color: TH.text, fontSize: FONT_BODY }} numberOfLines={1}>{item.name}</Text>
                              <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                                {item.link === 'manual' ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                              </Text>
                            </View>
                          </View>
                          {autoChecked ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Check size={14} color={COLORS.GREEN} />
                              <Text style={{ fontSize: FONT_BADGE, color: COLORS.GREEN, fontWeight: '600' }}>{T('planAutoChecked')}</Text>
                            </View>
                          ) : isReadOnly ? (
                            done ? <Check size={18} color={COLORS.GREEN} /> : <X size={18} color={TH.sub} />
                          ) : (
                            <Checkbox on={done} onChange={() => togglePlanItem(item.id)} />
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {/* Daily custom todos */}
                {dailyCustomTodos.length > 0 && (
                  <>
                    <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginTop: 16, marginBottom: 8 }}>{T('planDailyCustomTodos')}</Text>
                    {dailyCustomTodos.map(todo => (
                      <View key={todo.id} style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between', paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: TH.border,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Sparkles size={16} color={P} />
                          <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{todo.name}</Text>
                        </View>
                        {isReadOnly ? (
                          todo.done ? <Check size={18} color={COLORS.GREEN} /> : <X size={18} color={TH.sub} />
                        ) : (
                          <Checkbox on={todo.done} onChange={() => toggleCustomTodo(todo.id)} />
                        )}
                      </View>
                    ))}
                  </>
                )}

                {/* Habits */}
                {activeHabits.length > 0 && (
                  <>
                    <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginTop: 16, marginBottom: 8 }}>{T('checkinHabitCheck')}</Text>
                    {activeHabits.map(h => {
                      const habitDone = h.checkedDates?.includes(viewDate) ?? false;
                      return (
                        <View key={h.id} style={{
                          flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between', paddingVertical: 12,
                          borderBottomWidth: 1, borderBottomColor: TH.border,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Star size={16} color={P} />
                            <View>
                              <Text style={{ color: isReadOnly && !habitDone ? TH.sub : TH.text, fontSize: FONT_BODY, opacity: isReadOnly && !habitDone ? 0.5 : 1 }}>{h.name}</Text>
                              <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{h.streak} {T('checkinStreak')}</Text>
                            </View>
                          </View>
                          {isReadOnly ? (
                            habitDone
                              ? <Check size={18} color={COLORS.GREEN} />
                              : <X size={18} color={TH.sub} />
                          ) : (
                            <Checkbox on={habitDone} onChange={() => toggleHabit(h.id)} />
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {/* Note */}
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Sparkles size={16} color={P} />
                    <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY }}>{T('checkinNote')}</Text>
                  </View>
                  {isReadOnly ? (
                    <Text style={{ color: TH.text, fontSize: FONT_BODY, lineHeight: 22 }}>
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
                    />
                  )}
                </View>
              </View>

              {/* ── Weight card ── */}
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Scale size={16} color={P} />
                    <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todayWeight')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isReadOnly ? (
                      <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: P }}>
                        {weight || '—'}
                      </Text>
                    ) : (
                      <TextInput
                        value={weight}
                        onChangeText={setWeight}
                        onBlur={() => saveWeight(weight)}
                        placeholder="—"
                        placeholderTextColor={TH.sub}
                        keyboardType="numeric"
                        style={{
                          width: 70, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                          borderRadius: 8, paddingVertical: 6, color: TH.text, fontWeight: '700',
                          fontSize: FONT_BODY, backgroundColor: TH.card,
                        }}
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => store.setWeightUnit(weightUnit === 'kg' ? 'lb' : 'kg')}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: `${P}20` }}
                    >
                      <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB }}>{weightUnit === 'kg' ? 'kg' : 'lb'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Steps */}
                {isToday && store.healthSyncEnabled && store.todaySteps != null ? (
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Footprints size={16} color={P} />
                      <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todaySteps')}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: P }}>
                      {store.todaySteps.toLocaleString()}
                    </Text>
                  </View>
                ) : !isToday ? (
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Footprints size={16} color={P} />
                      <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todaySteps')}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: TH.sub }}>--</Text>
                  </View>
                ) : null}
              </View>

              {/* ── Water card ── */}
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Droplets size={16} color={P} />
                    <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('water')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isToday ? (
                      <>
                        <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                          <Text style={{ fontWeight: '600', color: P }}>{store.waterMl}</Text> / {store.waterGoal} ml
                        </Text>
                        <TouchableOpacity onPress={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}>
                          <Pencil size={14} color={TH.sub} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                        <Text style={{ fontWeight: '600', color: P }}>{parsed.waterMl}</Text> ml
                      </Text>
                    )}
                  </View>
                </View>
                {isToday ? (
                  <>
                    <ProgressBar pct={store.waterMl / store.waterGoal * 100} color={P} />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {[200, 250, 350, 500].map(ml => (
                        <TouchableOpacity key={ml} onPress={() => addWater(ml)}
                          style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
                          <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB }}>{ml}ml</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <ProgressBar pct={parsed.waterMl / store.waterGoal * 100} color={P} />
                )}
              </View>

              {/* ── Food card ── */}
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Utensils size={16} color={P} />
                    <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todayFood')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isToday ? (
                      <>
                        <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                          <Text style={{ fontWeight: '600', color: P }}>{totalCal}</Text> / {store.calGoal} kcal
                        </Text>
                        <TouchableOpacity onPress={() => { setCgi(String(store.calGoal)); setShowCG(true); }}>
                          <Pencil size={14} color={TH.sub} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                        <Text style={{ fontWeight: '600', color: P }}>{totalCal}</Text> kcal
                      </Text>
                    )}
                  </View>
                </View>
                <ProgressBar pct={Math.min(totalCal / store.calGoal * 100, 100)} color={P} />

                {/* Recent Foods (today only) */}
                {isToday && recentFoods.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('recentFoods')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {recentFoods.map(f => (
                        <TouchableOpacity key={f.name} onPress={() => { setPortionFood(f); setPortion(1); }}
                          style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
                          <Text style={{ color: TH.text, fontSize: FONT_SUB, textAlign: 'center' }} numberOfLines={1}>{f.name}</Text>
                          <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600' }}>{f.calories}kcal</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Food List */}
                {todayFoods.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('todayFood')} ({todayFoodTotal})</Text>
                    {todayFoods.map(f => (
                      <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                        <Text style={{ color: TH.text, fontSize: FONT_BODY, flex: 1 }} numberOfLines={1}>{f.name}</Text>
                        <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600', marginRight: 8 }}>{f.calories} kcal</Text>
                        {isToday && (
                          <TouchableOpacity onPress={() => store.deleteFood(f.id)}>
                            <X size={16} color={TH.sub} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Add food button (today only) */}
                {isToday && (
                  <TouchableOpacity onPress={() => setShowFood(true)}
                    style={{ marginTop: 10, borderRadius: 10, padding: 11, alignItems: 'center', borderWidth: 1.5, borderColor: P }}>
                    <Text style={{ color: P, fontWeight: '600', fontSize: FONT_BUTTON }}>{T('addFoodBtn')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Status button (today only) ── */}
              {isToday && (
                isLocked ? (
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={{ backgroundColor: P, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Pencil size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('checkinModify')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSetDone}
                    style={{ backgroundColor: TH.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={18} color="#fff" />
                      <Text style={{ fontWeight: '700', fontSize: FONT_BUTTON, color: '#fff' }}>
                        {T('checkinDone')}
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
      {!isToday && (
        <RNAnimated.View
          style={{
            position: 'absolute', bottom: 24, left: 16,
            transform: [{ translateX: bubbleTransX }, { translateY: bubbleTransY }],
          }}
        >
          <View
            onTouchStart={onBubbleTouchStart}
            onTouchMove={onBubbleTouchMove}
            onTouchEnd={onBubbleTouchEnd}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: P, paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 20, elevation: 4,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25, shadowRadius: 4,
            }}
          >
            <Calendar size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_SMALL }}>{T('dateBarToday')}</Text>
          </View>
        </RNAnimated.View>
      )}

      <AddFoodModal visible={showFood} onClose={() => setShowFood(false)} />

      {/* Portion Selector Modal (for recent foods) */}
      <Modal visible={!!portionFood} transparent animationType="fade" onRequestClose={() => setPortionFood(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text, marginBottom: 4 }}>{portionFood?.name}</Text>
            <Text style={{ color: TH.sub, fontSize: FONT_BODY, marginBottom: 16 }}>{T('foodPerUnit')} {portionFood?.calories} kcal</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[0.5, 1, 1.5, 2].map(p => (
                <TouchableOpacity key={p} onPress={() => setPortion(p)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: portion === p ? P : TH.card,
                    borderWidth: portion === p ? 0 : 1, borderColor: TH.border,
                  }}>
                  <Text style={{ color: portion === p ? '#fff' : TH.text, fontWeight: portion === p ? '700' : '400', fontSize: FONT_BODY }}>
                    {p}份
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('foodTotalCal')}</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.ORANGE }}>
                {Math.round((portionFood?.calories ?? 0) * portion)} <Text style={{ fontSize: FONT_SUB, fontWeight: '400', color: TH.sub }}>kcal</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setPortionFood(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (portionFood) {
                  store.addFood({ name: portionFood.name, calories: Math.round(portionFood.calories * portion), timestamp: Date.now() });
                  setPortionFood(null);
                }
              }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Modal */}
      <Modal visible={showWG} transparent animationType="fade" onRequestClose={() => setShowWG(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, marginBottom: 6, color: TH.text }}>{T('waterGoalSetting')}</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>{T('waterGoalHint')}</Text>
            <TextInput
              value={wgi} onChangeText={setWgi} keyboardType="numeric"
              style={{
                width: '100%', fontSize: FONT_STAT_CARD, fontWeight: '700', textAlign: 'center',
                backgroundColor: TH.card, borderWidth: 2, borderColor: COLORS.BLUE,
                borderRadius: 12, padding: 14, color: TH.text, marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => setShowWG(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal visible={showCG} transparent animationType="fade" onRequestClose={() => setShowCG(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, marginBottom: 6, color: TH.text }}>{T('calGoalSetting')}</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>{T('calGoalHint')}</Text>
            <TextInput
              value={cgi} onChangeText={setCgi} keyboardType="numeric"
              style={{
                width: '100%', fontSize: FONT_STAT_CARD, fontWeight: '700', textAlign: 'center',
                backgroundColor: TH.card, borderWidth: 2, borderColor: COLORS.BLUE,
                borderRadius: 12, padding: 14, color: TH.text, marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => setShowCG(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incomplete Reason Modal */}
      <Modal visible={showReasonModal} transparent animationType="fade" onRequestClose={() => setShowReasonModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
              <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text, marginBottom: 12 }}>{T('incompleteReasonTitle')}</Text>

              {/* Incomplete items list */}
              <View style={{ marginBottom: 16 }}>
                {incompleteItems.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <X size={16} color="#C53364" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: FONT_TITLE, color: TH.sub }}>{item.name}</Text>
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
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                        borderWidth: 1.5, borderColor: selected ? P : TH.border,
                        backgroundColor: selected ? `${P}15` : 'transparent',
                      }}>
                      <Text style={{ fontSize: FONT_BODY, color: selected ? P : TH.text }}>
                        {r.icon} {T(labelKey as any)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Additional note */}
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}><Text style={{ color: '#EF4444' }}>*</Text> {T('incompleteReasonNote')}</Text>
              <TextInput
                value={reasonNote} onChangeText={setReasonNote}
                placeholder={T('incompleteReasonNotePlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                style={{
                  width: '100%', minHeight: 60, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
                  borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, marginBottom: 20,
                  textAlignVertical: 'top',
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setShowReasonModal(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>{T('incompleteReasonBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDoneWithReason} disabled={!selectedReason || !reasonNote.trim()}
                  style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: selectedReason && reasonNote.trim() ? P : TH.border, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('incompleteReasonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <CheckinStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
