import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_LABEL, dateStr, EXERCISE_CATEGORIES, BODY_STRATEGIES, buildExerciseLibrary, getDayOverview, type BodyGoal, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy, type ExerciseDef, type PlanTemplate } from '@egoless-do/core';
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
      let msg = `${T('bodyPlanAddedTo') || '已添加到'} ${totalAdded} ${T('bodyPlanDays') || '天'}`;
      if (totalSkipped > 0) {
        msg += `，${T('bodyPlanSkipped') || '已跳过'} ${totalSkipped} ${T('bodyPlanDays') || '天'}（${T('bodyPlanAlreadyExists') || '已存在'}）`;
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
        `${T('bodyPlanAlreadyExists') || '已存在'} — ${T('bodyPlanSkipped') || '跳过'} ${totalSkipped} ${T('bodyPlanDays') || '天'}`,
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
    setName(T(template.nameI18nKey as never));
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
    nav.navigate('MainTabs' as never, { screen: 'Practice' } as never);
  }, [handleSave, nav]);

  const handleStartDayTraining = useCallback((_weekday: number) => {
    handleSave();
    nav.navigate('MainTabs' as never, { screen: 'Practice' } as never);
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

  const renderGoalSection = () => (
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

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {/* ── Plan Name + Duration ── */}
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

          {/* ── Goal (collapsible) ── */}
          <TouchableOpacity onPress={() => setShowGoal(!showGoal)} style={[styles.card, { backgroundColor: TH.card, flexDirection: 'row', alignItems: 'center' }]}>
            <Target size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text, marginLeft: 8, flex: 1 }}>{T('bodyGoal')}</Text>
            {showGoal ? <ChevronUp size={18} color={TH.sub} /> : <ChevronDown size={18} color={TH.sub} />}
          </TouchableOpacity>
          {showGoal && renderGoalSection()}

          {/* ── Weekly Plan ── */}
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

            {/* Unified Exercise Pool — screen-level, replaces per-day ExercisePickerGrid */}
            <View style={[styles.unifiedPoolContainer, { backgroundColor: TH.bg, borderColor: TH.border }]}>
              <Text style={[styles.unifiedPoolTitle, { color: TH.text }]}>
                {T('bodyPlanExercisePool') || '动作库'}
              </Text>
              <UnifiedExercisePool
                TH={TH}
                T={T}
                exerciseLibrary={exerciseLibrary}
                dayTasks={dayTasksMap}
                activeDay={activeDay}
                selectedExIds={selectedExIds}
                selectedDays={selectedDays}
                onExerciseToggle={handleExerciseToggle}
                onDayChooserChange={handleDayChooserChange}
                onBatchAddToDays={handleBatchAddToDays}
              />
            </View>

            {tasks.map((task) => (
              <DayPlanCard
                key={task.weekday}
                TH={TH}
                T={T}
                task={task}
                onStartTraining={handleStartDayTraining}
                onUpdateTask={updateTask}
                onShowSnackbar={showSnackbar}
              />
            ))}
          </View>
        </ScrollView>

        <SnackbarHost
          TH={TH}
          T={T}
          visible={snackbar.visible}
          message={snackbar.message}
          onUndo={handleUndo}
          onDismiss={dismissSnackbar}
        />

        {/* ── Bottom CTA Bar ── */}
        <View style={[styles.footer, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()}
            style={[styles.saveBtn, { backgroundColor: name.trim() ? `${P}80` : TH.border }]}>
            <Save size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_SMALL() }}>{T('bodyPlanSave')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStartTraining}
            disabled={!name.trim()}
            style={[styles.startBtn, { backgroundColor: name.trim() ? P : TH.border }]}
            accessibilityRole="button"
            accessibilityLabel={T('bodyStartTraining') || '开始训练'}
          >
            <Play size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyStartTraining') || '开始训练'}</Text>
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