import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_LABEL, dateStr, EXERCISE_CATEGORIES, BODY_STRATEGIES, buildExerciseLibrary, getDayOverview, type BodyGoal, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy, type ExerciseDef, type PlanTemplate, type I18nKey } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Target, ClipboardList, Save, ChevronDown, ChevronUp, Download, Play } from 'lucide-react-native';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DatePickerModal from '../../../../components/DatePickerModal';
import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation, type RootStackParamList } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';
import DayPlanCard from '../components/DayPlanCard';
import MiniWeekCalendar from '../components/MiniWeekCalendar';
import SnackbarHost from '../components/SnackbarHost';
import UnifiedExercisePool from '../components/UnifiedExercisePool';
import TemplatePickerModal from '../modals/TemplatePickerModal';

const P = '#f59e0b';
type EditorRoute = RouteProp<RootStackParamList, 'BodyPlanEditor'>;

type ThemeTokens = ReturnType<typeof useTheme>;
type TranslateFn = ReturnType<typeof useT>;

// ── Goal Section (collapsible card) ──
interface GoalSectionProps {
  TH: ThemeTokens;
  T: TranslateFn;
  strategy: BodyStrategy | '';
  setStrategy: (v: BodyStrategy | '') => void;
  targetWeight: string;
  setTargetWeight: (v: string) => void;
  targetBodyFat: string;
  setTargetBodyFat: (v: string) => void;
  goalNote: string;
  setGoalNote: (v: string) => void;
}

function GoalSection({ TH, T, strategy, setStrategy, targetWeight, setTargetWeight, targetBodyFat, setTargetBodyFat, goalNote, setGoalNote }: GoalSectionProps) {
  return (
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
  );
}

// ── Plan Name + Duration card ──
interface PlanNameCardProps {
  TH: ThemeTokens;
  T: TranslateFn;
  name: string;
  setName: (v: string) => void;
  startDate: string;
  endDate: string;
  setPickingDate: (v: 'start' | 'end' | null) => void;
  durationWeeks: number;
}

function PlanNameCard({ TH, T, name, setName, startDate, endDate, setPickingDate, durationWeeks }: PlanNameCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: TH.card }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, fontWeight: '600' }}>{T('bodyPlanName')}</Text>
        <Text style={{ color: '#ef4444', fontSize: FONT_LABEL(), marginLeft: 2 }}>*</Text>
      </View>
      <TextInput value={name} onChangeText={setName} placeholder={T('bodyPlanNamePlaceholder')} placeholderTextColor={TH.sub}
        style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: name.trim() ? 12 : 4 }} />
      {!name.trim() && (
        <Text style={{ color: '#ef4444', fontSize: FONT_SMALL(), marginBottom: 8 }}>{T('bodyPlanNameRequired')}</Text>
      )}
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
      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 6, textAlign: 'center' }}>{`${T('bodyPlanApprox')} ${durationWeeks} ${T('bodyPlanWeeks')}`}</Text>
    </View>
  );
}

// ── Weekly Plan section ──
interface WeeklyPlanProps {
  TH: ThemeTokens;
  T: TranslateFn;
  dayOverviews: ReturnType<typeof getDayOverview>;
  activeDay: number | null;
  setActiveDay: (v: number | null) => void;
  exerciseLibrary: ExerciseDef[];
  dayTasksMap: Map<number, ExerciseDef[]>;
  selectedExIds: Set<string>;
  selectedDays: Set<number>;
  onExerciseToggle: (exId: string) => void;
  onDayChooserChange: (days: Set<number>) => void;
  onBatchAddToDays: () => void;
  tasks: BodyPlanTask[];
  onStartDayTraining: (weekday: number) => void;
  onUpdateTask: (weekday: number, updates: Partial<BodyPlanTask>) => void;
  onShowSnackbar: (message: string, undoFn: () => void) => void;
}

function WeeklyPlanSection({ TH, T, dayOverviews, activeDay, setActiveDay, exerciseLibrary, dayTasksMap, selectedExIds, selectedDays, onExerciseToggle, onDayChooserChange, onBatchAddToDays, tasks, onStartDayTraining, onUpdateTask, onShowSnackbar }: WeeklyPlanProps) {
  return (
    <View style={[styles.card, { backgroundColor: TH.card }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ClipboardList size={18} color={P} />
        <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyWeeklyPlan')}</Text>
      </View>

      <MiniWeekCalendar
        days={dayOverviews}
        activeWeekday={activeDay}
        onPressDay={setActiveDay}
        TH={TH}
        T={T}
      />

      <View style={[styles.unifiedPoolContainer, { backgroundColor: TH.bg, borderColor: TH.border }]}>
        <Text style={[styles.unifiedPoolTitle, { color: TH.text }]}>
          {T('bodyPlanExercisePool')}
        </Text>
        <UnifiedExercisePool
          TH={TH}
          T={T}
          exerciseLibrary={exerciseLibrary}
          dayTasks={dayTasksMap}
          activeDay={activeDay}
          selectedExIds={selectedExIds}
          selectedDays={selectedDays}
          onExerciseToggle={onExerciseToggle}
          onDayChooserChange={onDayChooserChange}
          onBatchAddToDays={onBatchAddToDays}
        />
      </View>

      {tasks.map((task) => (
        <DayPlanCard
          key={task.weekday}
          TH={TH}
          T={T}
          task={task}
          onStartTraining={onStartDayTraining}
          onUpdateTask={onUpdateTask}
          onShowSnackbar={onShowSnackbar}
        />
      ))}
    </View>
  );
}

// ── Footer CTA Bar ──
interface FooterBarProps {
  TH: ThemeTokens;
  T: TranslateFn;
  name: string;
  onSave: () => void;
  onStartTraining: () => void;
}

function FooterBar({ TH, T, name, onSave, onStartTraining }: FooterBarProps) {
  return (
    <View style={[styles.footer, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
      <TouchableOpacity onPress={onSave} disabled={!name.trim()}
        style={[styles.saveBtn, { backgroundColor: name.trim() ? `${P}80` : TH.border }]}>
        <Save size={16} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_SMALL() }}>{T('bodyPlanSave')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onStartTraining}
        disabled={!name.trim()}
        style={[styles.startBtn, { backgroundColor: name.trim() ? P : TH.border }]}
        accessibilityRole="button"
        accessibilityLabel={T('bodyStartTraining')}
      >
        <Play size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyStartTraining')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Bottom Modals (TemplatePicker + DatePicker) ──
interface BottomModalsProps {
  TH: ThemeTokens;
  T: TranslateFn;
  showTemplatePicker: boolean;
  setShowTemplatePicker: (v: boolean) => void;
  onSelectTemplate: (template: PlanTemplate) => void;
  pickingDate: 'start' | 'end' | null;
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setPickingDate: (v: 'start' | 'end' | null) => void;
}

function BottomModals({ TH, T, showTemplatePicker, setShowTemplatePicker, onSelectTemplate, pickingDate, startDate, endDate, setStartDate, setEndDate, setPickingDate }: BottomModalsProps) {
  return (
    <>
      <TemplatePickerModal
        visible={showTemplatePicker}
        TH={TH} T={T}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={onSelectTemplate}
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
    </>
  );
}

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
  const [goalNote, setGoalNote] = useState(existingGoal?.note ?? '');
  const [tasks, setTasks] = useState<BodyPlanTask[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, sportKey: '', note: '' }))
  );
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pickingDate, setPickingDate] = useState<'start' | 'end' | null>(null);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; undoFn: (() => void) | null }>({
    visible: false,
    message: '',
    undoFn: null,
  });

  // ── Multi-select state (UnifiedExercisePool) ──
  const [selectedExIds, setSelectedExIds] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

  const showSnackbar = useCallback((message: string, undoFn: () => void) => {
    setSnackbar({ visible: true, message, undoFn });
  }, []);

  const dismissSnackbar = useCallback(() => {
    setSnackbar(s => ({ ...s, visible: false }));
  }, []);

  const handleUndo = useCallback(() => {
    snackbar.undoFn?.();
    dismissSnackbar();
  }, [snackbar, dismissSnackbar]);

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
      setTasks(prev => prev.map((t, _i) => {
        const existing = plan.tasks.find(pt => pt.weekday === t.weekday);
        return existing ?? t;
      }));
    }
  }, [editPlanId, bodyTrainingPlans]);

  // ── Actions ──

  const updateTask = useCallback((weekday: number, updates: Partial<BodyPlanTask>) => {
    setTasks(prev => prev.map(t =>
      t.weekday === weekday ? { ...t, ...updates } : t
    ));
  }, []);

  // Build a map of weekday → exercises for the UnifiedExercisePool
  const dayTasksMap = useMemo(() => {
    const map = new Map<number, ExerciseDef[]>();
    for (const task of tasks) {
      map.set(task.weekday, task.exercises ?? []);
    }
    return map;
  }, [tasks]);

  // Handle exercise toggle (multi-select) from UnifiedExercisePool
  const handleExerciseToggle = useCallback((exId: string) => {
    if (exId === '__clear__') {
      setSelectedExIds(new Set());
      return;
    }
    setSelectedExIds(prev => {
      const next = new Set(prev);
      if (next.has(exId)) {
        next.delete(exId);
      } else {
        next.add(exId);
      }
      return next;
    });
  }, []);

  // Batch add all selected exercises to selected days
  const handleBatchAddToDays = useCallback(() => {
    const days = Array.from(selectedDays);
    if (days.length === 0 || selectedExIds.size === 0) return;

    // Resolve selected exercises from library
    const selectedExs = Array.from(selectedExIds).map(id =>
      exerciseLibrary.find(e => e.id === id)
    ).filter(Boolean) as ExerciseDef[];

    if (selectedExs.length === 0) return;

    let totalAdded = 0;
    let totalSkipped = 0;

    setTasks(prev => prev.map(t => {
      if (!days.includes(t.weekday)) return t;
      const currentExs = t.exercises ?? [];
      let added = 0;
      let skipped = 0;
      let updatedExs = [...currentExs];

      for (const ex of selectedExs) {
        const existingIdx = updatedExs.findIndex(e => e.nameZh === ex.nameZh);
        if (existingIdx >= 0) {
          skipped++;
          continue;
        }
        const newEx = {
          ...ex,
          id: `planex_${t.weekday}_${Date.now()}_${updatedExs.length}`,
        };
        updatedExs = [...updatedExs, newEx];
        added++;
      }

      totalAdded += added;
      totalSkipped += skipped;
      if (added === 0) return t;
      return { ...t, sportKey: t.sportKey || selectedExs[0].category || 'full_body', exercises: updatedExs };
    }));

    // Show snackbar feedback
    if (totalAdded > 0) {
      let msg = `${T('bodyPlanAddedTo')} ${totalAdded} ${T('bodyPlanDays')}`;
      if (totalSkipped > 0) {
        msg += `，${T('bodyPlanSkipped')} ${totalSkipped} ${T('bodyPlanDays')}（${T('bodyPlanAlreadyExists')}）`;
      }
      const snapshot = { exs: selectedExs, days: [...days] };
      showSnackbar(msg, () => {
        // Undo: remove all batch-added exercises from target days
        setTasks(prev => prev.map(t => {
          if (!snapshot.days.includes(t.weekday)) return t;
          const currentExs = t.exercises ?? [];
          const exNames = new Set(snapshot.exs.map(e => e.nameZh));
          return { ...t, exercises: currentExs.filter(e => !exNames.has(e.nameZh)) };
        }));
      });
    } else if (totalSkipped > 0) {
      showSnackbar(
        `${T('bodyPlanAlreadyExists')} — ${T('bodyPlanSkipped')} ${totalSkipped} ${T('bodyPlanDays')}`,
        () => {}
      );
    }

    // Clear selection after batch add
    setSelectedExIds(new Set());
    setSelectedDays(new Set());
  }, [selectedDays, selectedExIds, exerciseLibrary, T, showSnackbar]);

  // Handle day chooser changes from UnifiedExercisePool
  const handleDayChooserChange = useCallback((days: Set<number>) => {
    setSelectedDays(days);
  }, []);

  const handleSelectTemplate = useCallback((template: PlanTemplate) => {
    setName(T(template.nameI18nKey as I18nKey));
    setStrategy(template.strategy ?? '');

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + template.durationDays);
    setEndDate(end.toISOString().slice(0, 10));

    setTasks(prev => prev.map((t, _i) => {
      const scheduleDay = template.weekSchedule.find(s => s.weekday === t.weekday);
      if (!scheduleDay) return t;
      const exercises = (scheduleDay.exercises ?? []).map(ex => {
        const def = exerciseLibrary.find(e => e.nameZh === ex.name);
        if (def) return { ...def, id: `template_${template.id}_${t.weekday}_${ex.name}` };
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
      return { ...t, sportKey: scheduleDay.sportKey, exercises };
    }));
  }, [T, startDate, exerciseLibrary]);

  const handleSave = useCallback(() => {
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
  }, [name, startDate, endDate, strategy, targetWeight, targetBodyFat, goalNote, tasks, isEditing, editPlanId, updateBodyTrainingPlan, addBodyTrainingPlan, nav]);

  const handleStartTraining = useCallback(() => {
    handleSave();
    nav.navigate('MainTabs', { screen: 'Practice' });
  }, [handleSave, nav]);

  const handleStartDayTraining = useCallback((_weekday: number) => {
    handleSave();
    nav.navigate('MainTabs', { screen: 'Practice' });
  }, [handleSave, nav]);

  const dayOverviews = useMemo(() => {
    const syntheticPlan: BodyTrainingPlan = {
      id: 'editing',
      name: 'Editing',
      startDate,
      endDate,
      tasks,
      status: 'active',
      updatedAt: Date.now(),
      deleted: false,
    };
    return getDayOverview(syntheticPlan, new Date());
  }, [startDate, endDate, tasks]);

  const durationWeeks = useMemo(() => {
    const s = new Date(startDate), e = new Date(endDate);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 604800000));
  }, [startDate, endDate]);

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
              <Text style={{ fontSize: FONT_SMALL(), color: P, fontWeight: '600' }}>{T('bodyPlanTemplate')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <PlanNameCard TH={TH} T={T} name={name} setName={setName} startDate={startDate} endDate={endDate} setPickingDate={setPickingDate} durationWeeks={durationWeeks} />

          {/* ── Goal (collapsible) ── */}
          <TouchableOpacity onPress={() => setShowGoal(!showGoal)} style={[styles.card, { backgroundColor: TH.card, flexDirection: 'row', alignItems: 'center' }]}>
            <Target size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text, marginLeft: 8, flex: 1 }}>{T('bodyGoal')}</Text>
            {showGoal ? <ChevronUp size={18} color={TH.sub} /> : <ChevronDown size={18} color={TH.sub} />}
          </TouchableOpacity>
          {showGoal && (
            <GoalSection TH={TH} T={T} strategy={strategy} setStrategy={setStrategy} targetWeight={targetWeight} setTargetWeight={setTargetWeight} targetBodyFat={targetBodyFat} setTargetBodyFat={setTargetBodyFat} goalNote={goalNote} setGoalNote={setGoalNote} />
          )}

          <WeeklyPlanSection TH={TH} T={T} dayOverviews={dayOverviews} activeDay={activeDay} setActiveDay={setActiveDay} exerciseLibrary={exerciseLibrary} dayTasksMap={dayTasksMap} selectedExIds={selectedExIds} selectedDays={selectedDays} onExerciseToggle={handleExerciseToggle} onDayChooserChange={handleDayChooserChange} onBatchAddToDays={handleBatchAddToDays} tasks={tasks} onStartDayTraining={handleStartDayTraining} onUpdateTask={updateTask} onShowSnackbar={showSnackbar} />
        </ScrollView>

        <SnackbarHost TH={TH} T={T} visible={snackbar.visible} message={snackbar.message} onUndo={handleUndo} onDismiss={dismissSnackbar} />

        <FooterBar TH={TH} T={T} name={name} onSave={handleSave} onStartTraining={handleStartTraining} />

        <BottomModals TH={TH} T={T} showTemplatePicker={showTemplatePicker} setShowTemplatePicker={setShowTemplatePicker} onSelectTemplate={handleSelectTemplate} pickingDate={pickingDate} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} setPickingDate={setPickingDate} />
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
  footer: { padding: 16, borderTopWidth: 1, flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  startBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  unifiedPoolContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  unifiedPoolTitle: {
    fontSize: FONT_SUB(),
    fontWeight: '700',
    marginBottom: 8,
  },
});
