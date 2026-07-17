import { COLORS, getFoodLogByDate, getActivePlan, getTodayItems, getTodayCustomTodos, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry, PlanItem, DailyCustomTodo, Habit } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  Utensils, Droplets, Scale, Sparkles,
  ClipboardList, Check, Shield, Plus,
  ChevronLeft,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT, Checkbox, ThemedInput } from '../../../components/UI';
import { useRootNavigation, type RootStackParamList } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';


/** Parse weight string, return undefined if invalid or out of range (1-500 kg) */
function parseWeight(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : undefined;
}

type DayCheckinRoute = RouteProp<RootStackParamList, 'DayCheckin'>;

export default function DayCheckinScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const nav   = useRootNavigation();
  const route = useRoute<DayCheckinRoute>();
  const { date, graceMode } = route.params;
  const isGraceMode = !!graceMode;

  const store = useShallowStore(s => ({
    checkinHistory: s.checkinHistory,
    foodLog: s.foodLog,
    plans: s.plans,
    planItemCheckins: s.planItemCheckins,
    planItems: s.planItems,
    dailyCustomTodos: s.dailyCustomTodos,
    habits: s.habits,
    userProfile: s.userProfile,
    weightUnit: s.weightUnit,
    checkinHabit: s.checkinHabit,
    checkinPlanItem: s.checkinPlanItem,
    uncheckinPlanItem: s.uncheckinPlanItem,
    submitCheckin: s.submitCheckin,
    addGraceRecord: s.addGraceRecord,
    toggleDailyCustomTodo: s.toggleDailyCustomTodo,
    addFood: s.addFood,
  }));

  const [submitted, setSubmitted] = useState(false);

  // ── Existing checkin for this date ──
  const existing = useMemo(() =>
    (store.checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === date),
    [store.checkinHistory, date],
  );
  const parsed = useMemo(() => parseCheckinNote(existing?.note ?? ''), [existing]);

  // ── Plan items ──
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const planCheckins = (store.planItemCheckins ?? []).filter(c => !c.deleted);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, date, planCheckins);
  }, [store.planItems, activePlan, date, planCheckins]);
  const dailyCustomTodos = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], activePlan.id, date);
  }, [store.dailyCustomTodos, activePlan, date]);
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!activePlan) return initial;
    const items = (store.planItems ?? []).filter(i => !i.deleted && i.planId === activePlan.id);
    items.forEach(item => {
      if (item.link === 'manual' || item.link === 'reflection') {
        initial[item.id] = planCheckins.some(c => c.planItemId === item.id && c.date === date && c.done);
      }
    });
    return initial;
  });

  // ── Food for this date (read-only) ──
  const viewDateFoods = useMemo(() =>
    getFoodLogByDate((store.foodLog ?? []).filter(f => !f.deleted && f.name), date),
    [store.foodLog, date],
  );
  const totalCal = useMemo(() => viewDateFoods.reduce((a, f) => a + f.calories, 0), [viewDateFoods]);

  // ── Food add state ──
  const [showFoodAdd, setShowFoodAdd] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');

  /** Compute a noon timestamp for the target date (for food entries) */
  const dateTimestamp = useMemo(() => new Date(date + 'T12:00:00').getTime(), [date]);

  // ── Local state ──
  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : String(store.userProfile?.weight ?? '65'));
  const [waterInput, setWaterInput] = useState(() => String(parsed.waterMl || ''));
  const [note, setNote] = useState(() => parsed.userNote);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (store.habits ?? []).filter(h => !h.deleted && h.status === 'inProgress').forEach(h => {
      initial[h.id] = h.checkedDates?.includes(date) ?? false;
    });
    return initial;
  });

  // ── Submit — always done=true for grace makeup check-in ──
  const submit = useCallback(() => {
    if (submitted) return;

    // Process habit checkins
    Object.entries(habitCheckins).forEach(([id, checked]) => {
      const habit = (store.habits ?? []).find(h => !h.deleted && h.id === id);
      const alreadyDone = habit?.checkedDates?.includes(date) ?? false;
      if (checked !== alreadyDone) store.checkinHabit(id, date);
    });

    // Save plan item toggles
    Object.entries(planToggles).forEach(([itemId, desired]) => {
      const current = planCheckins.some(c => c.planItemId === itemId && c.date === date && c.done);
      if (desired && !current) store.checkinPlanItem(itemId, date);
      if (!desired && current) store.uncheckinPlanItem(itemId, date);
    });

    // Build note JSON
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    const waterMlVal = parseInt(waterInput) || 0;
    if (waterMlVal > 0) noteData.water = waterMlVal;
    const checkedHabits = Object.entries(habitCheckins)
      .filter(([, checked]) => checked)
      .map(([id]) => (store.habits ?? []).find(h => !h.deleted && h.id === id)?.name)
      .filter(Boolean);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    const doneCustomTodos = dailyCustomTodos
      .filter(t => t.done)
      .map(t => t.name);
    if (doneCustomTodos.length) noteData.customs = doneCustomTodos;
    const donePlanItems = todayPlanItems
      .filter(item => planToggles[item.id] ?? planCheckins.some(c => c.planItemId === item.id && c.date === date && c.done))
      .map(item => item.name);
    if (donePlanItems.length) noteData.planItems = donePlanItems;
    if (totalCal > 0) noteData.food = totalCal;

    const weightNum = parseWeight(weight);
    store.submitCheckin(true, JSON.stringify(noteData), date, weightNum);

    // Grace mode: record grace
    if (isGraceMode) {
      store.addGraceRecord(date);
    }

    setSubmitted(true);
    nav.goBack();
  }, [submitted, habitCheckins, planToggles, planCheckins, dailyCustomTodos, todayPlanItems, date, isGraceMode, waterInput, note, totalCal, weight, store, nav]);

  // ── Render helpers ──
  const renderPlanItem = useCallback(({ item }: { item: PlanItem }) => {
    const storeDone = planCheckins.some(c => c.planItemId === item.id && c.date === date && c.done);
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
      </View>
    );
  }, [planCheckins, date, planToggles, P, TH, setPlanToggles]);

  const renderTodoItem = useCallback(({ item: todo }: { item: DailyCustomTodo }) => (
    <View style={{
      flexDirection:'row', alignItems:'center', paddingVertical:8,
      paddingHorizontal:4, borderRadius:8,
      backgroundColor: todo.done ? `${P}10` : 'transparent',
      marginBottom:4,
    }}>
      <Checkbox on={todo.done} onChange={() => store.toggleDailyCustomTodo(todo.id, date)} accessibilityLabel={`${todo.done ? '取消' : '完成'} ${todo.name}`} />
      <Text style={{
        flex:1, marginLeft:8, fontSize:FONT_BODY(),
        color: todo.done ? TH.sub : TH.text,
        textDecorationLine: todo.done ? 'line-through' : 'none',
      }}>{todo.name}</Text>
    </View>
  ), [P, TH, store, date]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: TH.border,
        }}>
          <TouchableOpacity onPress={() => nav.goBack()} accessibilityLabel={T('commonBack')}>
            <ChevronLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>
            {isGraceMode ? T('graceCheckinTitle') : T('checkinDetailTitle')}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Grace mode banner ── */}
          {isGraceMode && (
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
          )}

          {/* ── Tasks card ── */}
          <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
              <ClipboardList size={18} color={P} />
              <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>
                {isGraceMode ? `${date} ${T('graceTitle')}` : T('planTodoList')}
              </Text>
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
          </View>

          {/* ── Data card: Weight + Water + Food ── */}
          <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
              <Scale size={18} color={P} />
              <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>
                {T('todayWeight')} / {T('water')} / {T('checkinFood')}
              </Text>
            </View>

            {/* Weight */}
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <Scale size={16} color={P} />
                <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('todayWeight')}</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="..."
                  placeholderTextColor={TH.sub}
                  keyboardType="numeric"
                  accessibilityLabel={T('todayWeight')}
                  style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY(), backgroundColor:TH.card }}
                />
                <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>{store.weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</Text>
              </View>
            </View>

            {/* Water */}
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <Droplets size={16} color={P} />
                <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('water')}</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <TextInput
                  value={waterInput}
                  onChangeText={setWaterInput}
                  placeholder="0"
                  placeholderTextColor={TH.sub}
                  keyboardType="numeric"
                  accessibilityLabel={T('water')}
                  style={{ width:60, textAlign:'center', borderWidth:1, borderColor:TH.border, borderRadius:8, paddingVertical:6, color:TH.text, fontWeight:'600', fontSize:FONT_BODY(), backgroundColor:TH.card }}
                />
                <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>ml</Text>
              </View>
            </View>

            {/* Food */}
            <View style={{ paddingVertical:10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Utensils size={16} color={P} />
                  <Text style={{ color:TH.text, fontSize:FONT_BODY() }}>{T('checkinFood')}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:FONT_TITLE(), fontWeight:'600', color:P }}>{String(totalCal)}</Text>
                  <Text style={{ color:TH.sub, fontSize:FONT_SUB() }}>kcal</Text>
                  <TouchableOpacity onPress={() => setShowFoodAdd(!showFoodAdd)}
                    accessibilityLabel={T('addFood')}
                    style={{ width:24, height:24, borderRadius:12, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                    <Plus size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              {showFoodAdd && (
                <View style={{ marginTop:10, padding:10, backgroundColor:TH.cardSolid, borderRadius:10, borderWidth:1, borderColor:TH.border }}>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                    <ThemedInput value={foodName} onChangeText={setFoodName} placeholder={T('foodName')} accessibilityLabel={T('foodName')} style={{ flex:2, padding:7 }} />
                    <ThemedInput value={foodCal} onChangeText={setFoodCal} placeholder={T('calories2')} keyboardType="numeric" accessibilityLabel={T('calories2')} style={{ flex:1, padding:7 }} />
                  </View>
                  <View style={{ flexDirection:'row', gap:8 }}>
                    <TouchableOpacity onPress={() => {
                      if (foodName.trim()) {
                        store.addFood({ name: foodName, calories: +foodCal || 0, note: '', timestamp: dateTimestamp });
                        setFoodName('');
                        setFoodCal('');
                        setShowFoodAdd(false);
                      }
                    }}
                      accessibilityLabel={T('confirm')}
                      style={{ flex:1, padding:8, borderRadius:8, backgroundColor:P, alignItems:'center' }}>
                      <Text style={{ color:'#fff', fontWeight:'600', fontSize:FONT_BUTTON() }}>{T('confirm')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
                      accessibilityLabel={T('commonCancel')}
                      style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                      <Text style={{ color:TH.sub, fontSize:FONT_BUTTON() }}>{T('commonCancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* ── Note card ── */}
          <View style={{ backgroundColor:TH.card, borderRadius:16, padding:14, marginBottom:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
              <Sparkles size={18} color={P} />
              <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>{T('checkinNote')}</Text>
            </View>
            <ThemedInput value={note} onChangeText={setNote} placeholder={T('checkinNotePlaceholder')} accessibilityLabel={T('checkinNote')} multiline numberOfLines={3} />
          </View>

          {/* ── Submit button ── */}
          <TouchableOpacity onPress={submit} accessibilityLabel={T('graceCheckinSubmit')} style={{
            paddingVertical:14, borderRadius:12, alignItems:'center', marginBottom:10,
            backgroundColor: '#17EAD9',
          }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Check size={18} color="#fff" />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON() }}>
                {T('graceCheckinSubmit')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ── Cancel ── */}
          <TouchableOpacity onPress={() => nav.goBack()} accessibilityLabel={T('commonCancel')} style={{
            paddingVertical:14, borderRadius:12, alignItems:'center',
            borderWidth:1, borderColor:TH.border,
          }}>
            <Text style={{ color:TH.sub, fontSize:FONT_BUTTON() }}>{T('commonCancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}