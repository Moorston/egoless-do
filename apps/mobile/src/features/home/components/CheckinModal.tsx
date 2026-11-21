import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, getTodayCustomTodos, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, getIncompleteItems, INCOMPLETE_REASONS, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry, PlanItem, DailyCustomTodo, Habit } from '@egoless-do/core';
import {
  Utensils, Droplets, Scale, Sparkles,
  ClipboardList, CheckCircle2, X, Check, Shield,
  Moon, Sunrise, Brain,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';

import { useTheme, useT, Checkbox, ThemedInput } from '../../../components/UI';
import { useShallowStore } from '../../../store/useAppStore';


import CheckinReflection from './CheckinReflection';
import { buildCheckinNoteData, buildHabitCheckins, buildPlanToggles } from './checkinModalHelpers';

/** Parse weight string, return undefined if invalid or out of range (1-500 kg) */
function parseWeight(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : undefined;
}

// eslint-disable-next-line max-lines-per-function -- CheckinModal is a single-scroll multi-section dialog; splitting would fragment the checkin flow
export default function CheckinModal({ onClose, graceDate }: { onClose: () => void; graceDate?: string }) {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useShallowStore(s => ({
    checkinHistory: s.checkinHistory,
    foodLog: s.foodLog,
    plans: s.plans,
    planItemCheckins: s.planItemCheckins,
    planItems: s.planItems,
    dailyCustomTodos: s.dailyCustomTodos,
    habits: s.habits,
    userProfile: s.userProfile,
    waterMl: s.waterMl,
    weightUnit: s.weightUnit,
    checkinHabit: s.checkinHabit,
    checkinPlanItem: s.checkinPlanItem,
    uncheckinPlanItem: s.uncheckinPlanItem,
    resetWater: s.resetWater,
    addWater: s.addWater,
    submitCheckin: s.submitCheckin,
    addGraceRecord: s.addGraceRecord,
    toggleDailyCustomTodo: s.toggleDailyCustomTodo,
    addFood: s.addFood,
    addReflection: s.addReflection,
  }));
  const today = dateStr();
  const targetDate = graceDate ?? today;
  const isGraceMode = !!graceDate;

  // Load existing checkin for re-edit support
  const existing = useMemo(() =>
    (store.checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === targetDate),
    [store.checkinHistory, targetDate],
  );
  const parsed = useMemo(() => parseCheckinNote(existing?.note ?? ''), [existing]);

  const totalCal = useMemo(
    () => getTodayFoodLog((store.foodLog ?? []).filter(f => !f.deleted)).reduce((a, f) => a + f.calories, 0),
    [store.foodLog],
  );

  // Today's plan items
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const planCheckins = (store.planItemCheckins ?? []).filter(c => !c.deleted);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, targetDate, planCheckins);
  }, [store.planItems, activePlan, targetDate, planCheckins]);
  const dailyCustomTodos = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], activePlan.id, targetDate);
  }, [store.dailyCustomTodos, activePlan, targetDate]);
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() =>
    buildPlanToggles({ activePlan, planItems: store.planItems ?? [], planCheckins, targetDate })
  );

  // Pre-fill from existing checkin
  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : String(store.userProfile?.weight ?? '65'));
  const [waterMl, setWaterMl] = useState(() => parsed.waterMl || (store.waterMl ?? 0));
  const [showFoodAdd, setShowFoodAdd] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [practices, setPractices] = useState(() => ({
    sit: parsed.practices.includes('sit'),
    stand: parsed.practices.includes('stand'),
    chant: parsed.practices.includes('chant'),
  }));
  const [note, setNote] = useState(() => parsed.userNote);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>(() =>
    buildHabitCheckins({ habits: store.habits ?? [], targetDate })
  );
  const [localDone, setLocalDone] = useState<boolean | null>(() => existing?.done ?? null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [graceSuccess, setGraceSuccess] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState<ReturnType<typeof getIncompleteItems>>([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [showReflection, setShowReflection] = useState(false);

  const submit = useCallback((reasonOverride?: string, reasonNoteOverride?: string, doneOverride?: boolean) => {
    const done = doneOverride ?? localDone;
    if (done === null) return;
    // Process habit checkins (toggle: already checked → uncheck, not checked → check)
    Object.entries(habitCheckins).forEach(([id, checked]) => {
      const habit = (store.habits ?? []).find(h => !h.deleted && h.id === id);
      const alreadyDone = habit?.checkedDates?.includes(targetDate) ?? false;
      if (checked !== alreadyDone) store.checkinHabit(id, targetDate);
    });
    // Save plan item toggles
    Object.entries(planToggles).forEach(([itemId, desired]) => {
      const current = planCheckins.some(c => c.planItemId === itemId && c.date === targetDate && c.done);
      if (desired && !current) store.checkinPlanItem(itemId, targetDate);
      if (!desired && current) store.uncheckinPlanItem(itemId, targetDate);
    });
    // Set water amount directly (skip in grace mode)
    if (!isGraceMode && waterMl > 0) {
      store.resetWater();
      store.addWater(waterMl);
    }
    // Build structured JSON note (same format as web)
    const noteData = buildCheckinNoteData({
      note, waterMl, isGraceMode, practices, habitCheckins,
      habits: store.habits ?? [], dailyCustomTodos, todayPlanItems,
      planToggles, planCheckins, totalCal,
      reasonOverride, reasonNoteOverride, targetDate,
    });
    const weightNum = parseWeight(weight);
    store.submitCheckin(done, JSON.stringify(noteData), isGraceMode ? targetDate : undefined, weightNum, isGraceMode);
    // In grace mode, show success then close after a brief delay
    if (isGraceMode) {
      store.addGraceRecord(targetDate);
      setGraceSuccess(true);
      setTimeout(() => onClose(), 1500);
    } else {
      // Show reflection prompt instead of closing immediately
      setShowReflection(true);
    }
  }, [localDone, habitCheckins, planToggles, planCheckins, dailyCustomTodos, todayPlanItems, targetDate, isGraceMode, waterMl, note, practices, totalCal, weight, store, onClose]);

  const handleDone = useCallback(() => {
    // Grace mode: skip incomplete items check, submit directly
    if (isGraceMode) {
      setLocalDone(true);
      submit(undefined, undefined, true);
      return;
    }
    const items = getIncompleteItems({
      habits: (store.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress'),
      planItems: todayPlanItems,
      planItemCheckins: planCheckins,
      today: targetDate,
    });
    if (items.length > 0) {
      setIncompleteItems(items);
      setSelectedReason('');
      setReasonNote('');
      setLocalDone(true);
      setShowReasonModal(true);
      return;
    }
    setLocalDone(true);
    submit(undefined, undefined, true);
  }, [isGraceMode, store, todayPlanItems, planCheckins, targetDate, submit]);

  const confirmDoneWithReason = useCallback(() => {
    if (!selectedReason || !reasonNote.trim()) return;
    setShowReasonModal(false);
    submit(selectedReason, reasonNote);
  }, [submit, selectedReason, reasonNote]);

  const handleReflectionSave = useCallback((mood: string, insight: string, saveAsReflection: boolean) => {
    if (saveAsReflection && insight.trim()) {
      store.addReflection({
        content: insight,
        tags: [],
        mood: mood,
      });
    }
    onClose();
  }, [store, onClose]);

  const renderPlanItem = useCallback(({ item }: { item: PlanItem }) => {
    const storeDone = planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done);
    const autoChecked = storeDone && planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done && c.linkedModule);
    const done = planToggles[item.id] ?? storeDone;
    return (
      <View style={{
        flexDirection:'row', alignItems:'center', paddingVertical:8,
        paddingHorizontal:4, borderRadius:8,
        backgroundColor: done ? `${P}10` : 'transparent',
        marginBottom:4,
      }}>
        <Checkbox on={done} onChange={() => setPlanToggles(prev => ({ ...prev, [item.id]: !done }))} accessibilityLabel={`${done ? '取消' : '完成'} ${item.name}`} />
        <View style={{ flex:1, marginLeft:8 }}>
          <Text style={{
            fontSize:FONT_BODY(), color: done ? TH.sub : TH.text,
            textDecorationLine: done ? 'line-through' : 'none',
          }} numberOfLines={1}>{item.name}</Text>
        </View>
        {autoChecked && (
          <CheckCircle2 size={10} color={P} style={{ marginLeft:4 }} />
        )}
      </View>
    );
  }, [planCheckins, targetDate, planToggles, P, TH, setPlanToggles]);

  const renderTodoItem = useCallback(({ item: todo }: { item: DailyCustomTodo }) => (
    <View style={{
      flexDirection:'row', alignItems:'center', paddingVertical:8,
      paddingHorizontal:4, borderRadius:8,
      backgroundColor: todo.done ? `${P}10` : 'transparent',
      marginBottom:4,
    }}>
      <Checkbox on={todo.done} onChange={() => store.toggleDailyCustomTodo(todo.id, targetDate)} accessibilityLabel={`${todo.done ? '取消' : '完成'} ${todo.name}`} />
      <Text style={{
        flex:1, marginLeft:8, fontSize:FONT_BODY(),
        color: todo.done ? TH.sub : TH.text,
        textDecorationLine: todo.done ? 'line-through' : 'none',
      }}>{todo.name}</Text>
    </View>
  ), [P, TH, store, targetDate]);

  const renderHabitItem = useCallback(({ item: h }: { item: Habit }) => (
    <View style={{
      flexDirection:'row', alignItems:'center', paddingVertical:8,
      paddingHorizontal:4, borderRadius:8, marginBottom:4,
    }}>
      <Checkbox on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins(c => ({ ...c, [h.id]:!c[h.id] }))} accessibilityLabel={`${habitCheckins[h.id] ? '取消' : '打卡'} ${h.name}`} />
      <View style={{ flex:1, marginLeft:8 }}>
        <Text style={{ fontSize:FONT_BODY(), color:TH.text }}>{h.name}</Text>
        <Text style={{ fontSize:FONT_SUB(), color:TH.sub }}>{String(h.streak)} {T('checkinStreak')}</Text>
      </View>
    </View>
  ), [habitCheckins, setHabitCheckins, TH, T]);

  // Show reflection prompt after successful checkin
  if (showReflection) {
    return (
      <Modal visible animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex1End}
        >
          <CheckinReflection
            onSave={handleReflectionSave}
            onSkip={onClose}
          />
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.flex1End]}
      >
        <View style={[styles.modalBody, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE() }}>
              {isGraceMode ? T('graceCheckinTitle') : T('checkinTitle')}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel={T('commonClose')}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Grace mode hint banner */}
          <GraceBanner graceMode={isGraceMode} graceSuccess={graceSuccess} date={targetDate} />

          {/* Grace success overlay (mutually exclusive with the form below) */}
          <GraceSuccessOverlay visible={graceSuccess} date={targetDate} />
          {!graceSuccess && (
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Status buttons - TOP (hidden in grace mode) */}
            <StatusButtons visible={!isGraceMode} localDone={localDone}
              onNotDone={() => setLocalDone(false)} onDone={handleDone} />

            {/* Tasks section - merged card */}
            <View style={[styles.cardBase, { backgroundColor:TH.card }]}>
              <View style={styles.sectionHeader}>
                <ClipboardList size={18} color={P} />
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>{isGraceMode ? `${targetDate} ${T('graceTitle')}` : `${T('checkinPractice')} & ${T('planTodoList')}`}</Text>
              </View>

              {/* Practices */}
              <View style={{ marginBottom:12 }}>
                <Text style={[styles.subLabel, { color:TH.sub }]}>{T('checkinPractice')}</Text>
                <View style={styles.rowWrapGap8}>
                  {([
                    { key:'sit' as const,   icon:<Moon size={16} color={P} />, label:T('checkinSit') },
                    { key:'stand' as const, icon:<Sunrise size={16} color={P} />, label:T('checkinStand') },
                    { key:'chant' as const, icon:<Brain size={16} color={P} />, label:T('checkinSutra') },
                  ]).map(({ key, icon, label }) => (
                    <TouchableOpacity key={key} onPress={() => setPractices(p => ({ ...p, [key]:!p[key] }))}
                      accessibilityLabel={label}
                      style={{
                        flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:12,
                        borderRadius:10, borderWidth:1,
                        borderColor: practices[key] ? P : TH.border,
                        backgroundColor: practices[key] ? `${P}15` : 'transparent',
                      }}>
                      {icon}
                      <Text style={{ color: practices[key] ? P : TH.text, fontSize:FONT_BODY() }}>{label}</Text>
                      {practices[key] && <Check size={14} color={P} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Plan items */}
              {todayPlanItems.length > 0 && (
                <View style={{ marginBottom:12 }}>
                  <Text style={{ fontSize:FONT_SUB(), color:TH.sub, marginBottom:8 }}>{T('planTodoList')}</Text>
                  <FlatList
                    data={todayPlanItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPlanItem}
                    scrollEnabled={false}
                    removeClippedSubviews={true}
                  />
                </View>
              )}

              {/* Custom todos */}
              {dailyCustomTodos.length > 0 && (
                <View style={{ marginBottom:12 }}>
                  <Text style={{ fontSize:FONT_SUB(), color:TH.sub, marginBottom:8 }}>{T('planDailyCustomTodos')}</Text>
                  <FlatList
                    data={dailyCustomTodos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTodoItem}
                    scrollEnabled={false}
                    removeClippedSubviews={true}
                  />
                </View>
              )}

              {/* Habits */}
              {(store.habits ?? []).filter(h => !h.deleted && h.status==='inProgress').length > 0 && (
                <View>
                  <Text style={{ fontSize:FONT_SUB(), color:TH.sub, marginBottom:8 }}>{T('checkinHabitCheck')}</Text>
                  <FlatList
                    data={(store.habits ?? []).filter(h => !h.deleted && h.status==='inProgress')}
                    keyExtractor={(item) => item.id}
                    renderItem={renderHabitItem}
                    scrollEnabled={false}
                    removeClippedSubviews={true}
                  />
                </View>
              )}

              {/* Submit button - inside tasks card (hidden in grace mode, moved to bottom) */}
              <SubmitButton visible={!isGraceMode} localDone={localDone} onSubmit={() => submit()} />
            </View>

            {/* Data section - merged card (hide water/food in grace mode) */}
            <DataSection
              graceMode={isGraceMode}
              weight={weight} onWeightChange={setWeight}
              weightUnit={store.weightUnit}
              waterMl={waterMl} onWaterChange={setWaterMl} onWaterPlus={() => setWaterMl(w => w + 250)}
              totalCal={totalCal}
              showFoodAdd={showFoodAdd} onToggleFoodAdd={() => setShowFoodAdd(!showFoodAdd)}
              foodName={foodName} onFoodNameChange={setFoodName}
              foodCal={foodCal} onFoodCalChange={setFoodCal}
              onConfirmFood={() => { if (foodName.trim()) { store.addFood({ name: foodName, calories: +foodCal || 0, note: foodNote, timestamp: Date.now() }); setFoodName(''); setFoodCal(''); setFoodNote(''); setShowFoodAdd(false); } }}
              onResetFoodForm={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
            />

            {/* Note section */}
            <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Sparkles size={18} color={P} />
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>{T('checkinNote')}</Text>
              </View>
              <ThemedInput value={note} onChangeText={setNote} placeholder={T('checkinNotePlaceholder')} accessibilityLabel={T('checkinNote')} multiline numberOfLines={3} />
            </View>

            {/* Grace mode: submit button at bottom */}
            {isGraceMode && (
              <TouchableOpacity onPress={handleDone} accessibilityLabel={T('graceCheckinSubmit')} style={{
                paddingVertical:14, borderRadius:12, alignItems:'center',
                backgroundColor: '#17EAD9', marginBottom:10,
              }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Check size={18} color="#fff" />
                  <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON() }}>
                    {T('graceCheckinSubmit')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cancel button */}
            <TouchableOpacity onPress={onClose} accessibilityLabel={T('commonCancel')} style={{
              paddingVertical:14, borderRadius:12, alignItems:'center',
              borderWidth:1, borderColor:TH.border, marginBottom:20,
            }}>
              <Text style={{ color:TH.sub, fontSize:FONT_BUTTON() }}>{T('commonCancel')}</Text>
            </TouchableOpacity>

          </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Incomplete Reason Modal */}
      <ReasonModal
        visible={showReasonModal}
        incompleteItems={incompleteItems}
        selectedReason={selectedReason} onSelectReason={setSelectedReason}
        reasonNote={reasonNote} onReasonNoteChange={setReasonNote}
        onBack={() => { setShowReasonModal(false); setLocalDone(null); }}
        onConfirm={confirmDoneWithReason}
        onRequestClose={() => setShowReasonModal(false)}
      />
    </Modal>
  );
}

// ─── Section sub-components ─────────────────────────────────────────────────
// 从主函数提取的展示性 section（props 显式参数化，JSX 与原内联代码逐字等价）。

/** Grace 模式顶部提示横幅（grace 且未成功时显示） */
function GraceBanner({ graceMode, graceSuccess, date }: {
  graceMode: boolean;
  graceSuccess: boolean;
  date: string;
}) {
  const T = useT();
  if (!graceMode || graceSuccess) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, borderRadius: 10, marginBottom: 12,
      backgroundColor: `${COLORS.ORANGE}15`, borderWidth: 1, borderColor: `${COLORS.ORANGE}30`,
    }}>
      <Shield size={16} color={COLORS.ORANGE} />
      <Text style={{ fontSize: FONT_SUB(), color: COLORS.ORANGE, flex: 1 }}>
        {T('graceCheckinHint')} · {date}
      </Text>
    </View>
  );
}

/** Grace 补卡成功覆盖层 */
function GraceSuccessOverlay({ visible, date }: { visible: boolean; date: string }) {
  const TH = useTheme();
  const T = useT();
  if (!visible) return null;
  return (
    <View style={{
      flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60,
    }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Text style={{ fontSize: 36 }}>✅</Text>
      </View>
      <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#10B981', marginBottom: 8 }}>
        {T('graceSuccess')}
      </Text>
      <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{date}</Text>
    </View>
  );
}

/** 顶部状态按钮（今天完成/未完成——非 grace 模式显示） */
function StatusButtons({ visible, localDone, onNotDone, onDone }: {
  visible: boolean;
  localDone: boolean | null;
  onNotDone: () => void;
  onDone: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (!visible) return null;
  return (
    <View style={styles.rowGap10}>
      <TouchableOpacity onPress={onNotDone}
        accessibilityLabel={T('checkinNotDone')}
        style={[styles.statusBtnBase, {
          borderColor: localDone===false ? '#C53364' : TH.border,
          backgroundColor: localDone===false ? 'rgba(197,51,100,0.1)' : 'transparent',
        }]}>
        <View style={styles.rowCenterGap4}>
          <X size={18} color={localDone===false ? '#C53364' : TH.sub} />
          <Text style={[styles.buttonTextBold, { color: localDone===false ? '#C53364' : TH.sub }]}>{T('checkinNotDone')}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDone}
        accessibilityLabel={T('checkinDone')}
        style={[styles.statusBtnBase, {
          borderColor: localDone===true ? '#17EAD9' : TH.border,
          backgroundColor: localDone===true ? 'rgba(23,234,217,0.1)' : 'transparent',
        }]}>
        <View style={styles.rowCenterGap4}>
          <Check size={18} color={localDone===true ? '#17EAD9' : TH.sub} />
          <Text style={[styles.buttonTextBold, { color: localDone===true ? '#17EAD9' : TH.sub }]}>{T('checkinDone')}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/** 提交按钮（三态随 localDone——非 grace 模式显示） */
function SubmitButton({ visible, localDone, onSubmit }: {
  visible: boolean;
  localDone: boolean | null;
  onSubmit: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  if (!visible) return null;
  return (
    <TouchableOpacity onPress={onSubmit} accessibilityLabel={T('checkinSubmit')} style={{
      marginTop:12, paddingVertical:14, borderRadius:12, alignItems:'center',
      backgroundColor: localDone === true
        ? '#17EAD9'
        : localDone === false
          ? '#C53364'
          : P,
    }}>
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON() }}>
        {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
      </Text>
    </TouchableOpacity>
  );
}

/** 数据区（体重/饮水/饮食——grace 模式只显示体重） */
function DataSection({
  graceMode, weight, onWeightChange, weightUnit,
  waterMl, onWaterChange, onWaterPlus, totalCal,
  showFoodAdd, onToggleFoodAdd, foodName, onFoodNameChange, foodCal, onFoodCalChange,
  onConfirmFood, onResetFoodForm,
}: {
  graceMode: boolean;
  weight: string;
  onWeightChange: (w: string) => void;
  weightUnit: string;
  waterMl: number;
  onWaterChange: (ml: number) => void;
  onWaterPlus: () => void;
  totalCal: number;
  showFoodAdd: boolean;
  onToggleFoodAdd: () => void;
  foodName: string;
  onFoodNameChange: (v: string) => void;
  foodCal: string;
  onFoodCalChange: (v: string) => void;
  onConfirmFood: () => void;
  onResetFoodForm: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  return (
    <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
        <Scale size={18} color={P} />
        <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>
          {graceMode ? T('checkinWeight') : `${T('checkinWeight')} / ${T('checkinWater')} / ${T('checkinFood')}`}
        </Text>
      </View>

      {/* Weight */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth: graceMode ? 0 : 1, borderBottomColor:TH.border }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <Scale size={16} color={P} />
          <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('checkinWeight')}</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <TextInput
            value={weight}
            onChangeText={onWeightChange}
            placeholder="..."
            placeholderTextColor={TH.sub}
            keyboardType="numeric"
            accessibilityLabel={T('checkinWeight')}
            style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY(), backgroundColor:TH.cardSolid }}
          />
          <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</Text>
        </View>
      </View>

      {/* Water - hidden in grace mode */}
      {!graceMode && (
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:TH.border }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Droplets size={16} color={P} />
            <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('checkinWater')}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <TextInput
              value={waterMl ? String(waterMl) : ''}
              onChangeText={v => onWaterChange(Math.max(0, parseInt(v) || 0))}
              placeholder="0"
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              accessibilityLabel={T('checkinWater')}
              style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY(), backgroundColor:TH.cardSolid }}
            />
            <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>ml</Text>
            <TouchableOpacity onPress={onWaterPlus}
              accessibilityLabel="增加250毫升水"
              style={{ paddingVertical:4, paddingHorizontal:8, borderRadius:6, backgroundColor:`${P}20` }}>
              <Text style={{ color:P, fontSize:FONT_SUB(), fontWeight:'600' }}>+250</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Food - hidden in grace mode */}
      {!graceMode && (
        <View style={{ paddingVertical:10 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Utensils size={16} color={P} />
              <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('checkinFood')}</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Text style={{ fontSize:FONT_TITLE(), fontWeight:'600', color:P }}>{String(totalCal)}</Text>
              <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>kcal</Text>
              <TouchableOpacity onPress={onToggleFoodAdd}
                accessibilityLabel="添加食物"
                style={{ width:24, height:24, borderRadius:12, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#fff', fontSize:FONT_BUTTON() }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showFoodAdd && (
            <View style={{ marginTop:10, padding:10, backgroundColor:TH.cardSolid, borderRadius:10, borderWidth:1, borderColor:TH.border }}>
              <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                <ThemedInput value={foodName} onChangeText={onFoodNameChange} placeholder={T('foodName')} accessibilityLabel={T('foodName')} style={{ flex:2, padding:7 }} />
                <ThemedInput value={foodCal} onChangeText={onFoodCalChange} placeholder={T('calories2')} keyboardType="numeric" accessibilityLabel={T('calories2')} style={{ flex:1, padding:7 }} />
              </View>
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity onPress={onConfirmFood}
                  accessibilityLabel={T('confirm')}
                  style={{ flex:1, padding:8, borderRadius:8, backgroundColor:P, alignItems:'center' }}>
                  <Text style={{ color:'#fff', fontWeight:'600', fontSize:FONT_BUTTON() }}>{T('confirm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onResetFoodForm}
                  accessibilityLabel={T('commonCancel')}
                  style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                  <Text style={{ color:TH.sub, fontSize:FONT_BUTTON() }}>{T('commonCancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** 未完成原因弹窗（缺项列表 + 原因选择 + 补充说明） */
function ReasonModal({
  visible, incompleteItems, selectedReason, onSelectReason, reasonNote, onReasonNoteChange,
  onBack, onConfirm, onRequestClose,
}: {
  visible: boolean;
  incompleteItems: ReturnType<typeof getIncompleteItems>;
  selectedReason: string;
  onSelectReason: (reason: string) => void;
  reasonNote: string;
  onReasonNoteChange: (note: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  onRequestClose: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                    <TouchableOpacity key={r.code} onPress={() => onSelectReason(r.code)}
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
                value={reasonNote} onChangeText={onReasonNoteChange}
                placeholder={T('incompleteReasonNotePlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                accessibilityLabel={T('incompleteReasonNote')}
                style={{
                  width: '100%', minHeight: 60, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
                  borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 20,
                  textAlignVertical: 'top',
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={onBack}
                  accessibilityLabel={T('incompleteReasonBack')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON() }}>{T('incompleteReasonBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onConfirm} disabled={!selectedReason || !reasonNote.trim()}
                  accessibilityLabel={T('incompleteReasonConfirm')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: selectedReason && reasonNote.trim() ? P : TH.border, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('incompleteReasonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowCenterGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowCenterGap6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCenterGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCenterGap10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowSpaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowWrapGap8: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowGap8: { flexDirection: 'row', gap: 8 },
  rowGap10: { flexDirection: 'row', gap: 10 },
  rowGap8Mb8: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 20, paddingBottom: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  flex1MarginLeft8: { flex: 1, marginLeft: 8 },
  ml4: { marginLeft: 4 },
  flex1End: { flex: 1, justifyContent: 'flex-end' },
  modalBody: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, maxHeight: '92%',
  },
  cardBase: { borderRadius: 16, padding: 14, marginBottom: 12 },
  subLabel: { fontSize: FONT_SUB(), marginBottom: 8 },
  subText: { fontSize: FONT_SUB() },
  subBold: { fontSize: FONT_SUB(), fontWeight: '600' },
  bodyText: { fontSize: FONT_BODY() },
  bodyColor: { fontSize: FONT_BODY() }, // alias for bodyText with color override
  whiteButtonText: { color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() },
  buttonTextBold: { fontWeight: '700', fontSize: FONT_BUTTON() },
  statusBtnBase: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', borderWidth: 2,
  },
  submitBtnBase: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnBase: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  cancelButtonText: { fontSize: FONT_BUTTON() },
  titleText: { fontSize: FONT_TITLE() },
  checkItemBase: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 4, borderRadius: 8, marginBottom: 4,
  },
  waterPlusBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  foodCancelBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, alignItems: 'center',
  },
  foodConfirmBtnBase: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  foodAddCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  foodNameInput: { flex: 2, padding: 7 },
  foodCalInput: { flex: 1, padding: 7 },
  labelWithMb8: { fontSize: FONT_SUB(), marginBottom: 8 },
  numberInput: {
    width: 60, textAlign: 'center', borderWidth: 1, borderRadius: 8,
    paddingVertical: 6, fontWeight: '600', fontSize: FONT_BODY(),
  },
  reasonBtnBase: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  reasonBackBtnBase: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  reasonNoteInput: {
    width: '100%', minHeight: 60, borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 20, textAlignVertical: 'top',
  },
  reasonOptionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
});
