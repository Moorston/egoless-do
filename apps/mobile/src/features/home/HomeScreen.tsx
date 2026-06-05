import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, cardAccent, cardTextColor, dateStr, yesterday, getTodayFoodLog, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_SMALL, FONT_LABEL, FONT_BADGE, FONT_CARD_TITLE, parseCheckinNote, getActivePlan, getTodayItems, getTodayCustomTodos } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useTheme, useT, ProgressBar, Checkbox, ThemedInput } from '../../components/UI';
import AddFoodModal from '../../components/AddFoodModal';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import {
  Utensils, Scale, Footprints,
  Droplets, Pencil, Check, X, Shield, Star, Sparkles,
  PersonStanding, ClipboardList, Target, BarChart3,
} from 'lucide-react-native';
import CheckinStatsModal from './CheckinStatsModal';

type CheckinStatus = 'draft' | 'done' | 'editing';

export default function HomeScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useRootNavigation();
  const today = dateStr();

  const weightUnit = useAppStore(s => s.weightUnit);

  // ── Existing checkin ──
  const todayRecord = useMemo(
    () => (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today),
    [store.checkinHistory, today],
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
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, today);
  }, [store.planItems, activePlan, today]);
  const planCheckins = store.planItemCheckins ?? [];
  const dailyCustomTodos = useMemo(() => {
    if (!activePlan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], activePlan.id, today);
  }, [store.dailyCustomTodos, activePlan, today]);
  // planToggles derived from store — no local state needed

  // ── Modals ──
  const [showFood, setShowFood] = useState(false);
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(store.waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(store.calGoal));

  // ── Derived data ──
  const totalCal = useMemo(
    () => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0),
    [store.foodLog],
  );
  const totalCompleted = useMemo(
    () => (store.checkinHistory ?? []).filter((c: CheckinEntry) => c.done).length,
    [store.checkinHistory],
  );
  const activeHabits = useMemo(
    () => (store.habits ?? []).filter(h => h.status === 'inProgress'),
    [store.habits],
  );

  // ── Status derivation ──
  const status: CheckinStatus = todayRecord
    ? (todayRecord.done ? 'done' : 'editing')
    : (localDone !== null ? 'draft' : 'draft');

  // Whether fields are locked (read-only)
  const isLocked = status === 'done';

  // ── Re-sync local state when todayRecord changes ──
  useEffect(() => {
    if (!todayRecord) return;
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
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (store.waterMl > 0) noteData.water = store.waterMl;
    const pr: string[] = [];
    if (practices.sit) pr.push('sit');
    if (practices.stand) pr.push('stand');
    if (practices.chant) pr.push('chant');
    if (pr.length) noteData.practices = pr;
    const checkedHabits = (store.habits ?? [])
      .filter(h => h.status === 'inProgress' && h.checkedDates?.includes(today))
      .map(h => h.name);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    if (totalCal > 0) noteData.food = totalCal;
    return JSON.stringify(noteData);
  }, [note, practices, store.waterMl, totalCal, store.habits, today]);

  // ── Real-time save ──
  const saveField = useCallback((doneOverride?: boolean) => {
    const done = doneOverride ?? localDone ?? false;
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(done, buildNote(), undefined, weightNum);
  }, [localDone, buildNote, weight, store]);

  // ── Field change handlers ──
  const togglePractice = useCallback((key: 'sit' | 'stand' | 'chant') => {
    if (isLocked) return;
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
          .filter(h => h.status === 'inProgress' && h.checkedDates?.includes(today))
          .map(h => h.name);
        if (checkedHabits.length) noteData.habits = checkedHabits;
        if (totalCal > 0) noteData.food = totalCal;
        const w = weight ? parseFloat(weight) : undefined;
        store.submitCheckin(localDone ?? false, JSON.stringify(noteData), undefined, w);
      }, 0);
      return next;
    });
  }, [isLocked, note, store, totalCal, weight, localDone, today]);

  const toggleHabit = useCallback((id: string) => {
    if (isLocked) return;
    store.checkinHabit(id, today);
    setTimeout(() => saveField(), 0);
  }, [isLocked, store, today, saveField]);

  const addWater = useCallback(() => {
    store.addWater(250);
    setTimeout(() => saveField(), 0);
  }, [store, saveField]);

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
    setLocalDone(true);
    store.submitCheckin(true, buildNote(), undefined, weight ? parseFloat(weight) : undefined);
  }, [store, buildNote, weight]);

  const handleEdit = useCallback(() => {
    setLocalDone(false);
    store.submitCheckin(false, buildNote(), undefined, weight ? parseFloat(weight) : undefined);
  }, [store, buildNote, weight]);

  const togglePlanItem = useCallback((itemId: string) => {
    if (isLocked) return;
    const current = planCheckins.some(c => c.planItemId === itemId && c.date === today && c.done);
    if (current) {
      store.uncheckinPlanItem(itemId);
    } else {
      store.checkinPlanItem(itemId);
    }
  }, [isLocked, planCheckins, today, store]);

  const toggleCustomTodo = useCallback((id: string) => {
    if (isLocked) return;
    store.toggleDailyCustomTodo(id);
  }, [isLocked, store]);

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

  const bannerStatusText = status === 'done'
    ? T('checkinDoneBanner')
    : status === 'editing'
    ? T('checkinModifyNotDone')
    : T('checkinDoneToday');

  const bannerTimeText = todayRecord?.timestamp
    ? new Date(todayRecord.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── Grace reminder ──
  const yStr = yesterday();
  const yesterdayRecord = (store.checkinHistory ?? []).find((h: CheckinEntry) => h.date === yStr);
  const showGrace = yesterdayRecord?.done !== true;

  const warnBg = cardAccent('#F59E0B', TH.bg, 0.45);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <StatusBar barStyle={TH === THEMES.light ? 'dark-content' : 'light-content'} />
      <SimpleHeader routeName="Home" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 16, paddingBottom: 0 }}>

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
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{totalCompleted}</Text>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
                <BarChart3 size={12} color="rgba(255,255,255,.4)" style={{ marginTop: 4 }} />
              </TouchableOpacity>
              <View style={{ width: 1, height: 40, backgroundColor: 'rgba(255,255,255,.2)' }} />
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => setShowStatsModal(true)} activeOpacity={0.7}>
                <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB }}>{T('streak')}</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{store.streak}</Text>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
                <BarChart3 size={12} color="rgba(255,255,255,.4)" style={{ marginTop: 4 }} />
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

          {/* ── Check-in form / details ── */}
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <ClipboardList size={16} color={P} />
              <Text style={{ fontWeight: '700', fontSize: FONT_CARD_TITLE, color: TH.text }}>
                {isLocked ? T('checkinTitle') : T('checkinDoneToday')}
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
                  <Text style={{ color: isLocked && !practices[key] ? TH.sub : TH.text, fontSize: FONT_BODY, opacity: isLocked && !practices[key] ? 0.5 : 1 }}>
                    {label}
                  </Text>
                </View>
                {isLocked ? (
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
                  const done = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
                  const autoChecked = done && planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done && c.linkedModule);
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
                      ) : isLocked ? (
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
                    {isLocked ? (
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
                  const habitDone = h.checkedDates?.includes(today) ?? false;
                  return (
                    <View key={h.id} style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between', paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: TH.border,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Star size={16} color={P} />
                        <View>
                          <Text style={{ color: isLocked && !habitDone ? TH.sub : TH.text, fontSize: FONT_BODY, opacity: isLocked && !habitDone ? 0.5 : 1 }}>{h.name}</Text>
                          <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{h.streak} {T('checkinStreak')}</Text>
                        </View>
                      </View>
                      {isLocked ? (
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
              {isLocked ? (
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

          {/* ── Data card ── */}
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>

            {/* Weight */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Scale size={16} color={P} />
                <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todayWeight')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isLocked ? (
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

            {/* Water */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Droplets size={16} color={P} />
                  <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('water')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                    <Text style={{ fontWeight: '600', color: P }}>{store.waterMl}</Text> / {store.waterGoal} ml
                  </Text>
                  <TouchableOpacity onPress={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}>
                    <Pencil size={14} color={TH.sub} />
                  </TouchableOpacity>
                </View>
              </View>
              <ProgressBar pct={store.waterMl / store.waterGoal * 100} color={P} />
              <TouchableOpacity onPress={addWater}
                style={{ marginTop: 8, borderRadius: 10, padding: 11, alignItems: 'center', borderWidth: 1.5, borderColor: P }}>
                <Text style={{ color: P, fontWeight: '600', fontSize: FONT_BUTTON }}>+ 250ml</Text>
              </TouchableOpacity>
            </View>

            {/* Calories */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Utensils size={16} color={P} />
                  <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('addFood')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                    <Text style={{ fontWeight: '600', color: P }}>{totalCal}</Text> / {store.calGoal} kcal
                  </Text>
                  <TouchableOpacity onPress={() => { setCgi(String(store.calGoal)); setShowCG(true); }}>
                    <Pencil size={14} color={TH.sub} />
                  </TouchableOpacity>
                </View>
              </View>
              <ProgressBar pct={Math.min(totalCal / store.calGoal * 100, 100)} color={P} />
              <TouchableOpacity onPress={() => setShowFood(true)}
                style={{ marginTop: 8, borderRadius: 10, padding: 11, alignItems: 'center', borderWidth: 1.5, borderColor: P }}>
                <Text style={{ color: P, fontWeight: '600', fontSize: FONT_BUTTON }}>{T('addFoodBtn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Steps */}
            {store.healthSyncEnabled && store.todaySteps != null && (
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Footprints size={16} color={P} />
                  <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todaySteps')}</Text>
                </View>
                <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: P }}>
                  {store.todaySteps.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* ── Status button ── */}
          {isLocked ? (
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
          )}

        </View>
      </ScrollView>

      <AddFoodModal visible={showFood} onClose={() => setShowFood(false)} />

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

      <CheckinStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
