import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, useT, Checkbox, ThemedInput, PrimaryButton, OutlineButton } from '../../../components/UI';
import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, getTodayCustomTodos, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_BADGE, getIncompleteItems, INCOMPLETE_REASONS, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import {
  Utensils, Droplets, Scale, Star, PersonStanding, Sparkles,
  ClipboardList, CheckCircle2, Circle, X, Check, Shield,
  Moon, Sunrise, Brain,
} from 'lucide-react-native';
import CheckinReflection from './CheckinReflection';

/** Parse weight string, return undefined if invalid or out of range (1-500 kg) */
function parseWeight(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : undefined;
}

export default function CheckinModal({ onClose, graceDate }: { onClose: () => void; graceDate?: string }) {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore(useShallow(s => ({
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
  })));
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
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!activePlan) return initial;
    const items = (store.planItems ?? []).filter(i => !i.deleted && i.planId === activePlan.id);
    items.forEach(item => {
      // manual 和 reflection 类型支持手动切换
      if (item.link === 'manual' || item.link === 'reflection') {
        initial[item.id] = planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done);
      }
    });
    return initial;
  });

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
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (store.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress').forEach(h => {
      initial[h.id] = h.checkedDates?.includes(targetDate) ?? false;
    });
    return initial;
  });
  const [localDone, setLocalDone] = useState<boolean | null>(() => existing?.done ?? null);
  const [showReasonModal, setShowReasonModal] = useState(false);
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
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (!isGraceMode && waterMl > 0) noteData.water = waterMl;
    const pr: string[] = [];
    if (practices.sit) pr.push('sit');
    if (practices.stand) pr.push('stand');
    if (practices.chant) pr.push('chant');
    if (pr.length) noteData.practices = pr;
    const checkedHabits = Object.entries(habitCheckins)
      .filter(([, checked]) => checked)
      .map(([id]) => (store.habits ?? []).find(h => !h.deleted && h.id === id)?.name)
      .filter(Boolean);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    // 每日自定义待办
    const doneCustomTodos = dailyCustomTodos
      .filter(t => t.done)
      .map(t => t.name);
    if (doneCustomTodos.length) noteData.customs = doneCustomTodos;
    // 计划事项
    const donePlanItems = todayPlanItems
      .filter(item => planToggles[item.id] ?? planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done))
      .map(item => item.name);
    if (donePlanItems.length) noteData.planItems = donePlanItems;
    if (!isGraceMode && totalCal > 0) noteData.food = totalCal;
    if (reasonOverride) noteData.incompleteReason = reasonOverride;
    if (reasonNoteOverride?.trim()) noteData.incompleteNote = reasonNoteOverride.trim();
    const weightNum = parseWeight(weight);
    store.submitCheckin(done, JSON.stringify(noteData), isGraceMode ? targetDate : undefined, weightNum, isGraceMode);
    // In grace mode, also record grace history and close directly
    if (isGraceMode) {
      store.addGraceRecord(targetDate);
      onClose();
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
  }, [isGraceMode, practices, store, todayPlanItems, planCheckins, targetDate, submit]);

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

  // Show reflection prompt after successful checkin
  if (showReflection) {
    return (
      <Modal visible animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
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
        style={{ flex:1, justifyContent:'flex-end' }}
      >
        <View style={{
          backgroundColor: TH.cardSolid, borderTopLeftRadius:24,
          borderTopRightRadius:24, paddingHorizontal:16,
          paddingBottom:40, maxHeight:'92%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection:'row', justifyContent:'space-between',
            alignItems:'center', paddingTop:20, paddingBottom:8,
          }}>
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>
              {isGraceMode ? T('graceCheckinTitle') : T('checkinTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Grace mode hint banner */}
          {isGraceMode && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              padding: 12, borderRadius: 10, marginBottom: 12,
              backgroundColor: `${COLORS.ORANGE}15`, borderWidth: 1, borderColor: `${COLORS.ORANGE}30`,
            }}>
              <Shield size={16} color={COLORS.ORANGE} />
              <Text style={{ fontSize: FONT_SUB, color: COLORS.ORANGE, flex: 1 }}>
                {T('graceCheckinHint')} · {targetDate}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Status buttons - TOP (hidden in grace mode) */}
            {!isGraceMode && (
            <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
              <TouchableOpacity onPress={() => setLocalDone(false)}
                style={{
                  flex:1, paddingVertical:14, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===false ? '#C53364' : TH.border,
                  backgroundColor: localDone===false ? 'rgba(197,51,100,0.1)' : 'transparent',
                }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <X size={18} color={localDone===false ? '#C53364' : TH.sub} />
                  <Text style={{ fontWeight:'700', fontSize:FONT_BUTTON, color: localDone===false ? '#C53364' : TH.sub }}>{T('checkinNotDone')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDone}
                style={{
                  flex:1, paddingVertical:14, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===true ? '#17EAD9' : TH.border,
                  backgroundColor: localDone===true ? 'rgba(23,234,217,0.1)' : 'transparent',
                }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <Check size={18} color={localDone===true ? '#17EAD9' : TH.sub} />
                  <Text style={{ fontWeight:'700', fontSize:FONT_BUTTON, color: localDone===true ? '#17EAD9' : TH.sub }}>{T('checkinDone')}</Text>
                </View>
              </TouchableOpacity>
            </View>
            )}

            {/* Tasks section - merged card */}
            <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                <ClipboardList size={18} color={P} />
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:TH.text }}>{isGraceMode ? `${targetDate} ${T('graceTitle')}` : `${T('checkinPractice')} & ${T('planTodoList')}`}</Text>
              </View>

              {/* Practices */}
              <View style={{ marginBottom:12 }}>
                <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:8 }}>{T('checkinPractice')}</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                  {([
                    { key:'sit' as const,   icon:<Moon size={16} color={P} />, label:T('checkinSit') },
                    { key:'stand' as const, icon:<Sunrise size={16} color={P} />, label:T('checkinStand') },
                    { key:'chant' as const, icon:<Brain size={16} color={P} />, label:T('checkinSutra') },
                  ]).map(({ key, icon, label }) => (
                    <TouchableOpacity key={key} onPress={() => setPractices(p => ({ ...p, [key]:!p[key] }))}
                      style={{
                        flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:12,
                        borderRadius:10, borderWidth:1,
                        borderColor: practices[key] ? P : TH.border,
                        backgroundColor: practices[key] ? `${P}15` : 'transparent',
                      }}>
                      {icon}
                      <Text style={{ color: practices[key] ? P : TH.text, fontSize:FONT_BODY }}>{label}</Text>
                      {practices[key] && <Check size={14} color={P} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Plan items */}
              {todayPlanItems.length > 0 && (
                <View style={{ marginBottom:12 }}>
                  <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:8 }}>{T('planTodoList')}</Text>
                  {todayPlanItems.map(item => {
                    const storeDone = planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done);
                    const autoChecked = storeDone && planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done && c.linkedModule);
                    const done = planToggles[item.id] ?? storeDone;
                    return (
                      <View key={item.id} style={{
                        flexDirection:'row', alignItems:'center', paddingVertical:8,
                        paddingHorizontal:4, borderRadius:8,
                        backgroundColor: done ? `${P}10` : 'transparent',
                        marginBottom:4,
                      }}>
                        <Checkbox on={done} onChange={() => setPlanToggles(prev => ({ ...prev, [item.id]: !done }))} />
                        <View style={{ flex:1, marginLeft:8 }}>
                          <Text style={{
                            fontSize:FONT_BODY, color: done ? TH.sub : TH.text,
                            textDecorationLine: done ? 'line-through' : 'none',
                          }} numberOfLines={1}>{item.name}</Text>
                        </View>
                        {autoChecked && (
                          <CheckCircle2 size={10} color={P} style={{ marginLeft:4 }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Custom todos */}
              {dailyCustomTodos.length > 0 && (
                <View style={{ marginBottom:12 }}>
                  <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:8 }}>{T('planDailyCustomTodos')}</Text>
                  {dailyCustomTodos.map(todo => (
                    <View key={todo.id} style={{
                      flexDirection:'row', alignItems:'center', paddingVertical:8,
                      paddingHorizontal:4, borderRadius:8,
                      backgroundColor: todo.done ? `${P}10` : 'transparent',
                      marginBottom:4,
                    }}>
                      <Checkbox on={todo.done} onChange={() => store.toggleDailyCustomTodo(todo.id, targetDate)} />
                      <Text style={{
                        flex:1, marginLeft:8, fontSize:FONT_BODY,
                        color: todo.done ? TH.sub : TH.text,
                        textDecorationLine: todo.done ? 'line-through' : 'none',
                      }}>{todo.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Habits */}
              {(store.habits ?? []).filter(h => !h.deleted && h.status==='inProgress').length > 0 && (
                <View>
                  <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:8 }}>{T('checkinHabitCheck')}</Text>
                  {(store.habits ?? []).filter(h => !h.deleted && h.status==='inProgress').map(h => (
                    <View key={h.id} style={{
                      flexDirection:'row', alignItems:'center', paddingVertical:8,
                      paddingHorizontal:4, borderRadius:8, marginBottom:4,
                    }}>
                      <Checkbox on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins(c => ({ ...c, [h.id]:!c[h.id] }))} />
                      <View style={{ flex:1, marginLeft:8 }}>
                        <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{h.name}</Text>
                        <Text style={{ fontSize:FONT_SUB, color:TH.sub }}>{h.streak} {T('checkinStreak')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Submit button - inside tasks card (hidden in grace mode, moved to bottom) */}
              {!isGraceMode && (
              <TouchableOpacity onPress={() => submit()} style={{
                marginTop:12, paddingVertical:14, borderRadius:12, alignItems:'center',
                backgroundColor: localDone === true
                  ? '#17EAD9'
                  : localDone === false
                    ? '#C53364'
                    : P,
              }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>
                  {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
                </Text>
              </TouchableOpacity>
              )}
            </View>

            {/* Data section - merged card (hide water/food in grace mode) */}
            <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                <Scale size={18} color={P} />
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:TH.text }}>
                  {isGraceMode ? T('checkinWeight') : `${T('checkinWeight')} / ${T('checkinWater')} / ${T('checkinFood')}`}
                </Text>
              </View>

              {/* Weight */}
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth: isGraceMode ? 0 : 1, borderBottomColor:TH.border }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Scale size={16} color={P} />
                  <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{T('checkinWeight')}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="..."
                    placeholderTextColor={TH.sub}
                    keyboardType="numeric"
                    style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY, backgroundColor:TH.cardSolid }}
                  />
                  <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{store.weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</Text>
                </View>
              </View>

              {/* Water - hidden in grace mode */}
              {!isGraceMode && (
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:TH.border }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Droplets size={16} color={P} />
                    <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{T('checkinWater')}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <TextInput
                      value={waterMl ? String(waterMl) : ''}
                      onChangeText={v => setWaterMl(Math.max(0, parseInt(v) || 0))}
                      placeholder="0"
                      placeholderTextColor={TH.sub}
                      keyboardType="numeric"
                      style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY, backgroundColor:TH.cardSolid }}
                    />
                    <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>ml</Text>
                    <TouchableOpacity onPress={() => setWaterMl(w => w + 250)}
                      style={{ paddingVertical:4, paddingHorizontal:8, borderRadius:6, backgroundColor:`${P}20` }}>
                      <Text style={{ color:P, fontSize:FONT_SUB, fontWeight:'600' }}>+250</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Food - hidden in grace mode */}
              {!isGraceMode && (
              <View style={{ paddingVertical:10 }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Utensils size={16} color={P} />
                    <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{T('checkinFood')}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ fontSize:FONT_TITLE, fontWeight:'600', color:P }}>{totalCal}</Text>
                    <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>kcal</Text>
                    <TouchableOpacity onPress={() => setShowFoodAdd(!showFoodAdd)}
                      style={{ width:24, height:24, borderRadius:12, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ color:'#fff', fontSize:FONT_BUTTON }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {showFoodAdd && (
                  <View style={{ marginTop:10, padding:10, backgroundColor:TH.cardSolid, borderRadius:10, borderWidth:1, borderColor:TH.border }}>
                    <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                      <ThemedInput value={foodName} onChangeText={setFoodName} placeholder={T('foodName')} style={{ flex:2, padding:7 }} />
                      <ThemedInput value={foodCal} onChangeText={setFoodCal} placeholder={T('calories2')} keyboardType="numeric" style={{ flex:1, padding:7 }} />
                    </View>
                    <View style={{ flexDirection:'row', gap:8 }}>
                      <TouchableOpacity onPress={() => { if (foodName.trim()) { store.addFood({ name: foodName, calories: +foodCal || 0, note: foodNote, timestamp: Date.now() }); setFoodName(''); setFoodCal(''); setFoodNote(''); setShowFoodAdd(false); } }}
                        style={{ flex:1, padding:8, borderRadius:8, backgroundColor:P, alignItems:'center' }}>
                        <Text style={{ color:'#fff', fontWeight:'600', fontSize:FONT_BUTTON }}>{T('confirm')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
                        style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                        <Text style={{ color:TH.sub, fontSize:FONT_BUTTON }}>{T('commonCancel')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
              )}
            </View>

            {/* Note section */}
            <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Sparkles size={18} color={P} />
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:TH.text }}>{T('checkinNote')}</Text>
              </View>
              <ThemedInput value={note} onChangeText={setNote} placeholder={T('checkinNotePlaceholder')} multiline numberOfLines={3} />
            </View>

            {/* Grace mode: submit button at bottom */}
            {isGraceMode && (
              <TouchableOpacity onPress={handleDone} style={{
                paddingVertical:14, borderRadius:12, alignItems:'center',
                backgroundColor: '#17EAD9', marginBottom:10,
              }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Check size={18} color="#fff" />
                  <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>
                    {T('graceCheckinSubmit')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cancel button */}
            <TouchableOpacity onPress={onClose} style={{
              paddingVertical:14, borderRadius:12, alignItems:'center',
              borderWidth:1, borderColor:TH.border, marginBottom:20,
            }}>
              <Text style={{ color:TH.sub, fontSize:FONT_BUTTON }}>{T('commonCancel')}</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

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
                        {r.icon} {T(labelKey)}
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
                <TouchableOpacity onPress={() => { setShowReasonModal(false); setLocalDone(null); }}
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
    </Modal>
  );
}

function RowItem({ label, icon, right, last }: { label:string; icon:React.ReactNode; right:React.ReactNode; last?:boolean }) {
  const TH = useTheme();
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-between',
      paddingVertical:13,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: TH.border,
    }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
        {typeof icon === 'string' ? <Text style={{ fontSize:FONT_TITLE }}>{icon}</Text> : icon}
        <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{label}</Text>
      </View>
      {right}
    </View>
  );
}
