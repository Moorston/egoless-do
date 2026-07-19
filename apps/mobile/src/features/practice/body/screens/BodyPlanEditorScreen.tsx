import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_LABEL, dateStr, EXERCISE_CATEGORIES, BODY_STRATEGIES, PLAN_TEMPLATES, buildExerciseLibrary, type BodyGoal, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy, type ExerciseDef, type PlanTemplate } from '@egoless-do/core';
import { ChevronLeft, Target, ClipboardList, Save, Plus, X, Search, Dumbbell, ChevronDown, ChevronUp, Download } from 'lucide-react-native';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation, type RootStackParamList } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';
import { getDayOverview, getActivePlan } from '@egoless-do/core';
import MiniWeekCalendar from '../components/MiniWeekCalendar';
import DayPlanCard from '../components/DayPlanCard';
import SnackbarHost from '../components/SnackbarHost';
import TemplatePickerModal from '../modals/TemplatePickerModal';
import DatePickerModal from '../../../../components/DatePickerModal';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
const P = '#f59e0b';
type EditorRoute = RouteProp<RootStackParamList, 'BodyPlanEditor'>;

export default function BodyPlanEditorScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const route = useRoute<EditorRoute>();
  const editPlanId = route.params?.planId;
  const isEditing = !!editPlanId;
  const { addBodyTrainingPlan, updateBodyTrainingPlan, bodyTrainingPlans, bodyGoals } = useShallowStore(s => ({
    addBodyTrainingPlan: s.addBodyTrainingPlan,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
    bodyTrainingPlans: s.bodyTrainingPlans,
    bodyGoals: s.bodyGoals,
  }));
  const exerciseLibrary = useMemo(() => buildExerciseLibrary(), []);

  // ── Pre-fill from existing body goal ──
  const existingGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);

  // ── State ──
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10); });
  const [showGoal, setShowGoal] = useState(true);
  const [strategy, setStrategy] = useState<BodyStrategy | ''>(existingGoal?.strategy ?? '');
  const [targetWeight, setTargetWeight] = useState(existingGoal?.targetWeight ? String(existingGoal.targetWeight) : '');
  const [targetBodyFat, setTargetBodyFat] = useState(existingGoal?.targetBodyFat ? String(existingGoal.targetBodyFat) : '');
  const [goalNote, setGoalNote] = useState(existingGoal?.goalNote ?? '');
  const [tasks, setTasks] = useState<BodyPlanTask[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, sportKey: '', note: '' }))
  );
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [exSearch, setExSearch] = useState('');
  const [customExName, setCustomExName] = useState('');
  const [customExSets, setCustomExSets] = useState('');
  const [customExReps, setCustomExReps] = useState('');
  const [showCustomEx, setShowCustomEx] = useState<number | null>(null);
  const [exFilter, setExFilter] = useState<'all' | 'traditional' | 'modern'>('all');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedExIds, setSelectedExIds] = useState<Set<string>>(new Set());
  const [pickingDate, setPickingDate] = useState<'start' | 'end' | null>(null);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; undoFn: (() => void) | null }>({
    visible: false,
    message: '',
    undoFn: null,
  });

  const showSnackbar = useCallback((message: string, undoFn: () => void) => {
    setSnackbar({ visible: true, message, undoFn });
  }, []);

  const dismissSnackbar = useCallback(() => {
    setSnackbar(s => ({ ...s, visible: false }));
  }, []);

  const handleUndo = useCallback(() => {
    snackbar.undoFn?.();
    dismissSnackbar();
  }, [snackbar.undoFn, dismissSnackbar]);

  // Load existing plan for editing
  useEffect(() => {
    if (!editPlanId) return;
    const plan = (bodyTrainingPlans ?? []).find(p => p.id === editPlanId);
    if (!plan) return;
    setName(plan.name);
    setStartDate(plan.startDate);
    setEndDate(plan.endDate);
    if (plan.strategy) setStrategy(plan.strategy);
    if (plan.targetWeight) setTargetWeight(String(plan.targetWeight));
    if (plan.targetBodyFat) setTargetBodyFat(String(plan.targetBodyFat));
    if (plan.goalNote) setGoalNote(plan.goalNote);
    if (plan.tasks.length > 0) {
      setTasks(prev => prev.map((t, i) => {
        const existing = plan.tasks.find(pt => pt.weekday === t.weekday);
        return existing ?? t;
      }));
    }
  }, [editPlanId, bodyTrainingPlans]);

  // ── Derived ──
  const exercisesByCategory = useMemo(() => {
    const map = new Map<string, ExerciseDef[]>();
    for (const ex of exerciseLibrary) {
      if (!map.has(ex.category)) map.set(ex.category, []);
      map.get(ex.category)!.push(ex);
    }
    return map;
  }, [exerciseLibrary]);

  const currentTask = activeDay ? tasks.find(t => t.weekday === activeDay) : null;
  const searchedExs = useMemo(() => {
    let exs = exerciseLibrary;
    if (exFilter === 'traditional') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type === 'traditional');
    } else if (exFilter === 'modern') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type === 'modern');
    }
    if (exSearch.trim()) {
      exs = exs.filter(ex => ex.nameZh.includes(exSearch.trim()));
    }
    return exs;
  }, [exerciseLibrary, exSearch, exFilter]);

  // ── Actions ──
  const setTaskSportKey = (weekday: number, sportKey: string) => {
    setTasks(prev => prev.map(t => t.weekday === weekday ? { ...t, sportKey, exercises: [] } : t));
  };

  const addExercise = useCallback((weekday: number, ex: ExerciseDef) => {
    setTasks(prev => prev.map(t =>
      t.weekday === weekday ? {
        ...t,
        exercises: [...(t.exercises ?? []), { ...ex, id: `planex_${weekday}_${Date.now()}`, sortOrder: (t.exercises?.length ?? 0) + 1 }]
      } : t
    ));
  }, []);

  const addCustomExercise = (weekday: number) => {
    if (!customExName.trim()) return;
    const def: ExerciseDef = {
      id: `custom_${weekday}_${Date.now()}`,
      nameZh: customExName.trim(),
      nameI18nKey: '', icon: '🏋️', category: 'full_body',
      type: 'strength', muscleGroups: [], difficulty: 'beginner',
      defaultSets: parseInt(customExSets) || undefined,
      defaultReps: parseInt(customExReps) || undefined,
    };
    addExercise(weekday, def);
    setCustomExName(''); setCustomExSets(''); setCustomExReps('');
    setShowCustomEx(null);
  };

  const removeExercise = (weekday: number, exId: string) => {
    setTasks(prev => prev.map(t =>
      t.weekday === weekday ? { ...t, exercises: (t.exercises ?? []).filter(e => e.id !== exId) } : t
    ));
  };

  const addSelectedExercises = useCallback(() => {
    if (!activeDay || selectedExIds.size === 0) return;
    const selected = searchedExs.filter(ex => selectedExIds.has(ex.id));
    setTasks(prev => prev.map(t =>
      t.weekday === activeDay ? {
        ...t,
        sportKey: t.sportKey || selected[0]?.category || 'full_body',
        exercises: [
          ...(t.exercises ?? []),
          ...selected.map((ex, i) => ({
            ...ex,
            id: `planex_${activeDay}_${Date.now()}_${i}`,
            sortOrder: (t.exercises?.length ?? 0) + i + 1,
          })),
        ],
      } : t
    ));
    setSelectedExIds(new Set());
  }, [activeDay, selectedExIds, searchedExs]);

  const toggleExSelect = useCallback((exId: string) => {
    setSelectedExIds(prev => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  }, []);

  const durationWeeks = useMemo(() => {
    const s = new Date(startDate), e = new Date(endDate);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 604800000));
  }, [startDate, endDate]);

  const handleSelectTemplate = useCallback((template: PlanTemplate) => {
    setName(T(template.nameI18nKey as never));
    setStrategy(template.strategy ?? '');
    if (template.targetWeight) setTargetWeight(String(template.targetWeight));
    if (template.targetBodyFat) setTargetBodyFat(String(template.targetBodyFat));

    // Calculate end date from duration
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + template.durationDays);
    setEndDate(end.toISOString().slice(0, 10));

    // Map week schedule to tasks
    setTasks(prev => prev.map((t, i) => {
      const scheduleDay = template.weekSchedule.find(s => s.weekday === t.weekday);
      if (!scheduleDay) return t;
      const exercises = (scheduleDay.exercises ?? []).map(ex => {
        // Try to find matching ExerciseDef in the library
        const def = exerciseLibrary.find(e => e.nameZh === ex.name);
        if (def) return { ...def, id: `template_${template.id}_${t.weekday}_${ex.name}` };
        // Fallback: create a minimal ExerciseDef
        return {
          id: `template_${template.id}_${t.weekday}_${ex.name}`,
          nameZh: ex.name,
          nameI18nKey: '',
          icon: EXERCISE_CATEGORIES.find(c => c.key === scheduleDay.sportKey)?.icon ?? '🏋️',
          category: scheduleDay.sportKey as ExerciseDef['category'],
          type: 'strength' as const,
          muscleGroups: [],
          difficulty: template.intensity,
          defaultSets: ex.targetSets,
          defaultReps: ex.targetReps,
          defaultWeight: ex.targetWeight,
          defaultDurationSec: ex.targetDurationSec,
          defaultRestSec: ex.restSec,
        };
      });
      return {
        ...t,
        sportKey: scheduleDay.sportKey,
        exercises,
      };
    }));
  }, [T, startDate, exerciseLibrary]);

  const handleSave = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(), startDate, endDate,
      strategy: strategy || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      goalNote: goalNote || undefined,
      tasks: tasks.filter(t => t.sportKey && t.sportKey !== 'rest'),
      status: 'active' as const,
    };
    if (isEditing && editPlanId) {
      updateBodyTrainingPlan(editPlanId, data);
    } else {
      addBodyTrainingPlan(data);
    }
    nav.goBack();
  };

  const activePlan = useMemo(() => getActivePlan(bodyTrainingPlans ?? []), [bodyTrainingPlans]);

      return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12, flex: 1 }}>{isEditing ? T('bodyPlanEdit') : T('bodyPlanCreate')}</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setShowTemplatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: `${P}15` }}>
            <Download size={16} color={P} />
            <Text style={{ fontSize: FONT_SMALL(), color: P, fontWeight: '600' }}>{T('bodyPlanTemplate') || '模板'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* ── Plan Name + Duration ── */}
        <View style={[styles.card, { backgroundColor: TH.card }]}>
          <TextInput value={name} onChangeText={setName} placeholder={T('bodyPlanNamePlaceholder')} placeholderTextColor={TH.sub}
            style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanStart')}</Text>
              <TouchableOpacity onPress={() => setPickingDate('start')} style={[styles.dateInput, { backgroundColor: TH.bg, borderColor: TH.border, justifyContent: 'center' }]}>
                <Text style={{ color: TH.text, fontSize: FONT_BODY() }}>{startDate}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanEnd')}</Text>
              <TouchableOpacity onPress={() => setPickingDate('end')} style={[styles.dateInput, { backgroundColor: TH.bg, borderColor: TH.border, justifyContent: 'center' }]}>
                <Text style={{ color: TH.text, fontSize: FONT_BODY() }}>{endDate}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 6, textAlign: 'center' }}>{`约 ${durationWeeks} 周`}</Text>
        </View>

        {/* ── Goal (collapsible) ── */}
        <TouchableOpacity onPress={() => setShowGoal(!showGoal)} style={[styles.card, { backgroundColor: TH.card, flexDirection: 'row', alignItems: 'center' }]}>
          <Target size={18} color={P} />
          <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text, marginLeft: 8, flex: 1 }}>{T('bodyGoal')}</Text>
          {showGoal ? <ChevronUp size={18} color={TH.sub} /> : <ChevronDown size={18} color={TH.sub} />}
        </TouchableOpacity>
        {showGoal && (
          <View style={[styles.card, { backgroundColor: TH.card, marginTop: -8 }]}>
            <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 8 }}>{T('bodyStrategyLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {BODY_STRATEGIES.map(s => (
                <TouchableOpacity key={s.key} onPress={() => setStrategy(strategy === s.key ? '' : s.key)}
                  style={[styles.chip, { borderColor: strategy === s.key ? P : TH.border, backgroundColor: strategy === s.key ? `${P}18` : 'transparent' }]}>
                  <Text style={{ fontSize: FONT_SMALL(), color: strategy === s.key ? P : TH.text }}>{T(s.nameKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyTargetWeight')}</Text>
                <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="—" placeholderTextColor={TH.sub}
                  style={[styles.smallInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border, textAlign: 'center' }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyTargetBodyFat')}</Text>
                <TextInput value={targetBodyFat} onChangeText={setTargetBodyFat} keyboardType="numeric" placeholder="—" placeholderTextColor={TH.sub}
                  style={[styles.smallInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border, textAlign: 'center' }]} />
              </View>
            </View>
            <TextInput value={goalNote} onChangeText={setGoalNote} placeholder={T('bodyGoalNotePlaceholder')} placeholderTextColor={TH.sub} multiline
              style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, minHeight: 56, textAlignVertical: 'top' }} />
          </View>
        )}

        {/* ── Weekly tasks ── */}
        <View style={[styles.card, { backgroundColor: TH.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ClipboardList size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyWeeklyPlan')}</Text>
          </View>

          {/* ── Week Overview Bar ── */}
          <MiniWeekCalendar
            days={getDayOverview(activePlan, new Date())}
            activeWeekday={activeDay}
            onPressDay={setActiveDay}
          />

          {/* Quick overview row */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
            {tasks.map((task, i) => {
              const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
              const filled = !!task.sportKey;
              const exCount = (task.exercises ?? []).length;
              const isRest = task.sportKey === 'rest';
              return (
                <TouchableOpacity key={i} onPress={() => {
                  setActiveDay(activeDay === task.weekday ? null : task.weekday);
                  setExSearch('');
                }} style={[styles.dayDot, {
                  backgroundColor: filled ? (isRest ? `${P}20` : `${P}15`) : TH.bg,
                  borderColor: activeDay === task.weekday ? P : filled ? `${P}40` : TH.border,
                }]}>
                  <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: filled ? (isRest ? TH.sub : P) : TH.sub }}>
                    {['', '一', '二', '三', '四', '五', '六', '日'][task.weekday]}
                  </Text>
                  {filled && !isRest && (
                    <Text style={{ fontSize: 12 }}>{cat?.icon ?? '🏋️'}</Text>
                  )}
                  {filled && isRest && (
                    <Text style={{ fontSize: 12 }}>😴</Text>
                  )}
                  {exCount > 0 && (
                    <Text style={{ fontSize: 9, color: P, fontWeight: '700' }}>{String(exCount)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active day detail */}
          {activeDay !== null && currentTask && (
            <DayPlanCard
              TH={TH}
              task={currentTask}
              exerciseLibrary={exerciseLibrary}
              selectedIds={selectedExIds}
              onShowSnackbar={showSnackbar}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Snackbar for undo ── */}
      <SnackbarHost
        TH={TH}
        visible={snackbar.visible}
        message={snackbar.message}
        onUndo={handleUndo}
        onDismiss={dismissSnackbar}
      />

      {/* ── Floating Save ── */}
      <View style={[styles.footer, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
        <TouchableOpacity onPress={handleSave} disabled={!name.trim()}
          style={[styles.saveBtn, { backgroundColor: name.trim() ? P : TH.border }]}>
          <Save size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyPlanSave')}</Text>
        </TouchableOpacity>
      </View>

      <TemplatePickerModal
        visible={showTemplatePicker}
        TH={TH} T={T}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleSelectTemplate}
      />

      <DatePickerModal
        visible={pickingDate !== null}
        value={pickingDate === 'start' ? startDate : endDate}
        onConfirm={(date) => {
          if (pickingDate === 'start') setStartDate(date);
          else setEndDate(date);
          setPickingDate(null);
        }}
        onClose={() => setPickingDate(null)}
        minDate={pickingDate === 'end' ? startDate : dateStr()}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' },
  card: { borderRadius: 16, padding: 14, marginBottom: 12 },
  dateInput: { borderRadius: 10, padding: 10, fontSize: FONT_BODY(), borderWidth: 1, textAlign: 'center' },
  smallInput: { borderRadius: 8, padding: 8, fontSize: FONT_BODY(), borderWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sportChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  exChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  dayDot: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, gap: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 24, borderTopWidth: 1 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});