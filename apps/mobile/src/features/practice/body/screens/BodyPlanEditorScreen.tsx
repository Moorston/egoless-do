import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, EXERCISE_CATEGORIES, BODY_STRATEGIES, PLAN_TEMPLATES, buildExerciseLibrary, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy, type PlanTemplate, type ExerciseDef } from '@egoless-do/core';
import { ChevronLeft, Target, ClipboardList, Save, Dumbbell, LayoutTemplate } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

type PageStep = 'template' | 'editor';

export default function BodyPlanEditorScreen() {
  const TH = useTheme();
  const T = useT();
  const P = '#f59e0b';
  const nav = useRootNavigation();
  const addBodyTrainingPlan = useShallowStore(s => s.addBodyTrainingPlan);

  const exerciseLibrary = useMemo(() => buildExerciseLibrary(), []);

  const [step, setStep] = useState<PageStep>('template');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10); });
  const [strategy, setStrategy] = useState<BodyStrategy | ''>('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [goalNote, setGoalNote] = useState('');
  const [tasks, setTasks] = useState<BodyPlanTask[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, sportKey: '', note: '' }))
  );
  const [pickDay, setPickDay] = useState<number | null>(null);
  const [pickExerciseDay, setPickExerciseDay] = useState<number | null>(null);
  const [hasEdited, setHasEdited] = useState(false);

  // Track edits for overwrite confirmation
  const markEdited = () => { if (!hasEdited) setHasEdited(true); };

  // Select a template → populate editor (with overwrite confirmation)
  const applyTemplate = (tmpl: PlanTemplate) => {
    if (hasEdited) {
      Alert.alert(
        T('bodyPlanOverwriteTitle'),
        T('bodyPlanOverwriteMsg'),
        [
          { text: T('bodyCancel'), style: 'cancel' },
          { text: T('bodyPlanOverwriteConfirm'), style: 'destructive', onPress: () => doApplyTemplate(tmpl) },
        ]
      );
    } else {
      doApplyTemplate(tmpl);
    }
  };

  const doApplyTemplate = (tmpl: PlanTemplate) => {
    setName(T(tmpl.nameI18nKey) || tmpl.name);
    if (tmpl.strategy) setStrategy(tmpl.strategy);
    setTasks(tmpl.weekSchedule.map(day => ({
      weekday: day.weekday,
      sportKey: day.sportKey,
      note: '',
      exercises: day.exercises?.map(ex => ({
        id: `planex_${day.weekday}_${ex.name}`,
        name: ex.name,
        category: 'strength' as const,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
        targetDurationSec: ex.targetDurationSec,
        restSec: ex.restSec,
        sortOrder: 1,
        type: 'strength' as const,
        muscleGroups: [],
        difficulty: 'beginner' as const,
      })) ?? [],
    })));
    setHasEdited(false);
    setStep('editor');
  };

  // Group exercises by category for picker
  const exercisesByCategory = useMemo(() => {
    const map = new Map<string, ExerciseDef[]>();
    for (const ex of exerciseLibrary) {
      if (!map.has(ex.category)) map.set(ex.category, []);
      map.get(ex.category)!.push(ex);
    }
    return map;
  }, [exerciseLibrary]);

  const filteredExercises = useMemo(() => {
    if (pickExerciseDay === null) return [];
    const task = tasks.find(t => t.weekday === pickExerciseDay);
    if (!task) return [];
    return exercisesByCategory.get(task.sportKey) ?? [];
  }, [pickExerciseDay, tasks, exercisesByCategory]);

  const addExerciseToDay = (weekday: number, ex: ExerciseDef) => {
    setTasks(prev => prev.map(t =>
      t.weekday === weekday ? {
        ...t,
        exercises: [...(t.exercises ?? []), { ...ex, id: `planex_${weekday}_${Date.now()}`, sortOrder: (t.exercises?.length ?? 0) + 1 }]
      } : t
    ));
  };

  const removeExercise = (weekday: number, exId: string) => {
    setTasks(prev => prev.map(t =>
      t.weekday === weekday ? { ...t, exercises: (t.exercises ?? []).filter(e => e.id !== exId) } : t
    ));
  };

  const groupedCategories = useMemo(() => {
    const map = new Map<string, { key: string; label: string; icon: string }[]>();
    for (const cat of EXERCISE_CATEGORIES) {
      const gk = cat.category || 'bodyCatModern';
      if (!map.has(gk)) map.set(gk, []);
      map.get(gk)!.push({ key: cat.key, label: T(cat.i18nKey), icon: cat.icon });
    }
    return [
      { label: T('bodyCatTraditional'), items: map.get('bodyCatTraditional') ?? [] },
      { label: T('bodyCatModern'), items: map.get('bodyCatModern') ?? [] },
    ];
  }, [T]);

  const setTaskSportKey = (weekday: number, sportKey: string) => {
    setTasks(prev => prev.map(t => t.weekday === weekday ? { ...t, sportKey } : t));
    setPickDay(null);
    markEdited();
  };

  const setTaskNote = (weekday: number, note: string) => {
    setTasks(prev => prev.map(t => t.weekday === weekday ? { ...t, note } : t));
    markEdited();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addBodyTrainingPlan({
      name: name.trim(),
      startDate, endDate,
      strategy: strategy || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      goalNote: goalNote || undefined,
      tasks: tasks.filter(t => t.sportKey && t.sportKey !== 'rest'),
      status: 'active',
    });
    nav.goBack();
  };

  // ── Template selection screen ──
  if (step === 'template') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: TH.border }}>
          <TouchableOpacity onPress={() => nav.goBack()}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
          <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>{T('bodyPlanCreate')}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginBottom: 16, textAlign: 'center' }}>{T('bodyPlanTemplateChoose')}</Text>
          {PLAN_TEMPLATES.map(tmpl => (
            <TouchableOpacity key={tmpl.id} onPress={() => applyTemplate(tmpl)}
              style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 28 }}>{tmpl.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T(tmpl.nameI18nKey)}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>
                    {tmpl.durationDays}{T('bodyDays')} · {tmpl.intensity === 'beginner' ? T('bodyLevelBeginner') : tmpl.intensity === 'intermediate' ? T('bodyLevelIntermediate') : T('bodyLevelAdvanced')}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, lineHeight: 20 }}>{T(tmpl.descriptionI18nKey)}</Text>
              {tmpl.weekSchedule.filter(d => d.sportKey !== 'rest').slice(0, 3).map(d => {
                const cat = EXERCISE_CATEGORIES.find(c => c.key === d.sportKey);
                return (
                  <View key={d.weekday} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Text style={{ fontSize: FONT_SMALL() }}>{cat?.icon ?? '🏋️'}</Text>
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.text }}>
                      {T(WEEKDAY_KEYS[d.weekday - 1])} · {cat ? T(cat.i18nKey) : d.sportKey}
                    </Text>
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <Text style={{ fontSize: FONT_SMALL(), color: P, fontWeight: '600' }}>{T('bodyPlanUseTemplate')} →</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setStep('editor')}
            style={{ paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('bodyPlanCustom')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Editor screen (with template data or custom) ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: TH.border }}>
        <TouchableOpacity onPress={() => { setHasEdited(false); setStep('template'); }}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12, flex: 1 }}>{name || T('bodyPlanCreate')}</Text>
        <TouchableOpacity onPress={() => { setHasEdited(false); setStep('template'); }}>
          <LayoutTemplate size={20} color={P} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Plan name + dates */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <TextInput value={name} onChangeText={setName} placeholder={T('bodyPlanNamePlaceholder')} placeholderTextColor={TH.sub}
            style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanStart')}</Text>
              <TextInput value={startDate} onChangeText={setStartDate} style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, textAlign: 'center' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanEnd')}</Text>
              <TextInput value={endDate} onChangeText={setEndDate} style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, textAlign: 'center' }} />
            </View>
          </View>
        </View>

        {/* Goal */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Target size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyGoal')}</Text>
          </View>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('bodyStrategyLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {BODY_STRATEGIES.map(s => (
              <TouchableOpacity key={s.key} onPress={() => setStrategy(strategy === s.key ? '' : s.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: strategy === s.key ? P : TH.border, backgroundColor: strategy === s.key ? `${P}20` : 'transparent' }}>
                <Text style={{ fontSize: FONT_SMALL(), color: strategy === s.key ? P : TH.text }}>{T(s.nameKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 4 }}>{T('bodyTargetWeight')}</Text>
              <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="—" placeholderTextColor={TH.sub}
                style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, textAlign: 'center' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 4 }}>{T('bodyTargetBodyFat')}</Text>
              <TextInput value={targetBodyFat} onChangeText={setTargetBodyFat} keyboardType="numeric" placeholder="—" placeholderTextColor={TH.sub}
                style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, textAlign: 'center' }} />
            </View>
          </View>
          <TextInput value={goalNote} onChangeText={setGoalNote} placeholder={T('bodyGoalNotePlaceholder')} placeholderTextColor={TH.sub} multiline numberOfLines={2}
            style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, minHeight: 60, textAlignVertical: 'top' }} />
        </View>

        {/* Weekly tasks with exercises */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ClipboardList size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyWeeklyPlan')}</Text>
          </View>
          {tasks.map((task, idx) => {
            const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
            return (
              <View key={idx} style={{ marginBottom: idx < 6 ? 16 : 0, padding: 10, borderRadius: 12, backgroundColor: TH.bg, borderWidth: 1, borderColor: TH.border }}>
                {/* Day header + sport selector */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text }}>{T(WEEKDAY_KEYS[idx])}</Text>
                  {pickDay === task.weekday ? (
                    <TouchableOpacity onPress={() => setPickDay(null)}><Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyCancel')}</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setPickDay(task.weekday)}>
                      {cat ? <Text style={{ fontSize: FONT_SMALL() }}>{cat.icon} {T(cat.i18nKey)}</Text> : <Text style={{ fontSize: FONT_SMALL(), color: P }}>{T('bodySelectExercise')}</Text>}
                    </TouchableOpacity>
                  )}
                </View>
                {pickDay === task.weekday && (
                  <View style={{ marginBottom: 8 }}>
                    {groupedCategories.map(group => (
                      <View key={group.label} style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 4 }}>{group.label}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {group.items.map(item => (
                            <TouchableOpacity key={item.key} onPress={() => setTaskSportKey(task.weekday, item.key)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: task.sportKey === item.key ? P : TH.border, backgroundColor: task.sportKey === item.key ? `${P}20` : 'transparent' }}>
                              <Text style={{ fontSize: FONT_SMALL() }}>{item.icon}</Text>
                              <Text style={{ fontSize: FONT_SMALL(), color: task.sportKey === item.key ? P : TH.text }}>{item.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Exercises list */}
                {(task.exercises ?? []).length > 0 && (
                  <View style={{ marginBottom: 6 }}>
                    {(task.exercises ?? []).map(ex => (
                      <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: `${P}08`, marginBottom: 4 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.text, flex: 1 }}>
                          {ex.name}
                          {ex.targetSets && ex.targetReps ? ` ${ex.targetSets}×${ex.targetReps}` : ''}
                          {ex.targetWeight ? ` ${ex.targetWeight}kg` : ''}
                          {ex.targetDurationSec ? ` ${Math.round(ex.targetDurationSec / 60)}min` : ''}
                        </Text>
                        <TouchableOpacity onPress={() => removeExercise(task.weekday, ex.id)}><Text style={{ fontSize: FONT_SMALL(), color: '#EF4444' }}>✕</Text></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add exercise button */}
                {task.sportKey && task.sportKey !== 'rest' && (
                  pickExerciseDay === task.weekday ? (
                    <View style={{ marginTop: 4 }}>
                      {filteredExercises.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                          {filteredExercises.map(ex => (
                            <TouchableOpacity key={ex.id} onPress={() => addExerciseToDay(task.weekday, ex)}
                              style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: P, backgroundColor: `${P}10` }}>
                              <Text style={{ fontSize: FONT_SMALL(), color: P }}>+{ex.nameZh}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanNoExercises')}</Text>
                      )}
                      <TouchableOpacity onPress={() => setPickExerciseDay(null)}><Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyCancel')}</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setPickExerciseDay(task.weekday)} style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: FONT_SMALL(), color: P }}>+ {T('bodyPlanAddExercise')}</Text>
                    </TouchableOpacity>
                  )
                )}

                {task.sportKey !== 'rest' && (
                  <TextInput value={task.note ?? ''} onChangeText={v => setTaskNote(task.weekday, v)}
                    placeholder={T('bodyPlanNote')} placeholderTextColor={TH.sub}
                    style={{ backgroundColor: TH.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, color: TH.text, fontSize: FONT_SMALL(), marginTop: 4 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} disabled={!name.trim()}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: name.trim() ? P : TH.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Save size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyPlanSave')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}