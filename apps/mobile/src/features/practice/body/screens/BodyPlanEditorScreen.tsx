import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_LABEL, EXERCISE_CATEGORIES, BODY_STRATEGIES, buildExerciseLibrary, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy, type ExerciseDef } from '@egoless-do/core';
import { ChevronLeft, Target, ClipboardList, Save, Plus, X, Search, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
const P = '#f59e0b';

export default function BodyPlanEditorScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const addBodyTrainingPlan = useShallowStore(s => s.addBodyTrainingPlan);
  const exerciseLibrary = useMemo(() => buildExerciseLibrary(), []);

  // ── State ──
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10); });
  const [showGoal, setShowGoal] = useState(false);
  const [strategy, setStrategy] = useState<BodyStrategy | ''>('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [goalNote, setGoalNote] = useState('');
  const [tasks, setTasks] = useState<BodyPlanTask[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, sportKey: '', note: '' }))
  );
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [exSearch, setExSearch] = useState('');
  const [customExName, setCustomExName] = useState('');
  const [customExSets, setCustomExSets] = useState('');
  const [customExReps, setCustomExReps] = useState('');
  const [showCustomEx, setShowCustomEx] = useState<number | null>(null);

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
  const currentExs = currentTask?.sportKey ? (exercisesByCategory.get(currentTask.sportKey) ?? []) : [];
  const searchedExs = exSearch.trim()
    ? currentExs.filter(ex => ex.nameZh.includes(exSearch.trim()))
    : currentExs;

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

  const groupedCategories = useMemo(() => {
    const map = new Map<string, { key: string; icon: string; label: string; count: number }[]>();
    for (const cat of EXERCISE_CATEGORIES) {
      const gk = cat.category || 'bodyCatModern';
      if (!map.has(gk)) map.set(gk, []);
      const count = exercisesByCategory.get(cat.key)?.length ?? 0;
      map.get(gk)!.push({ key: cat.key, icon: cat.icon, label: T(cat.i18nKey), count });
    }
    const order = ['bodyCatTraditional', 'bodyCatModern'];
    return order.map(k => ({ label: T(k), items: map.get(k) ?? [] }));
  }, [T, exercisesByCategory]);

  const durationWeeks = useMemo(() => {
    const s = new Date(startDate), e = new Date(endDate);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 604800000));
  }, [startDate, endDate]);

  const handleSave = () => {
    if (!name.trim()) return;
    addBodyTrainingPlan({
      name: name.trim(), startDate, endDate,
      strategy: strategy || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      goalNote: goalNote || undefined,
      tasks: tasks.filter(t => t.sportKey && t.sportKey !== 'rest'),
      status: 'active',
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>{T('bodyPlanCreate')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* ── Plan Name + Duration ── */}
        <View style={[styles.card, { backgroundColor: TH.card }]}>
          <TextInput value={name} onChangeText={setName} placeholder={T('bodyPlanNamePlaceholder')} placeholderTextColor={TH.sub}
            style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanStart')}</Text>
              <TextInput value={startDate} onChangeText={setStartDate} style={[styles.dateInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 4 }}>{T('bodyPlanEnd')}</Text>
              <TextInput value={endDate} onChangeText={setEndDate} style={[styles.dateInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]} />
            </View>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 6, textAlign: 'center' }}>约 {durationWeeks} 周</Text>
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

          {/* Quick overview row */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
            {tasks.map((task, i) => {
              const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
              const filled = !!task.sportKey;
              return (
                <TouchableOpacity key={i} onPress={() => {
                  setActiveDay(activeDay === task.weekday ? null : task.weekday);
                  setExSearch('');
                }} style={[styles.dayDot, {
                  backgroundColor: filled ? (task.sportKey === 'rest' ? `${P}30` : P) : TH.bg,
                  borderColor: activeDay === task.weekday ? P : TH.border
                }]}>
                  <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: filled ? '#fff' : TH.sub }}>
                    {['', '一', '二', '三', '四', '五', '六', '日'][task.weekday]}
                  </Text>
                  {filled && <Text style={{ fontSize: 10 }}>{cat?.icon ?? ''}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active day detail */}
          {activeDay !== null && (() => {
            const task = currentTask!;
            const isRest = task.sportKey === 'rest';
            const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
            const hasExs = (task.exercises ?? []).length > 0;

            return (
              <View style={{ backgroundColor: TH.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T(WEEKDAY_KEYS[activeDay - 1])}</Text>
                  {task.sportKey && !isRest && hasExs && (
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{hasExs} 个动作</Text>
                  )}
                </View>

                {/* Sport picker */}
                {!task.sportKey ? (
                  <View style={{ marginTop: 4, marginBottom: 4 }}>
                    {groupedCategories.map(group => (
                      <View key={group.label} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 6, fontWeight: '600' }}>{group.label}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                          {group.items.map(item => (
                            <TouchableOpacity key={item.key} onPress={() => setTaskSportKey(activeDay, item.key === 'rest' ? 'rest' : item.key)}
                              style={[styles.sportChip, { borderColor: TH.border, backgroundColor: TH.card }]}>
                              <Text style={{ fontSize: FONT_SMALL() }}>{item.icon}</Text>
                              <Text style={{ fontSize: FONT_SMALL(), color: TH.text, marginLeft: 4 }}>{item.label}</Text>
                              {item.count > 0 && (
                                <View style={{ marginLeft: 4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: `${P}20` }}>
                                  <Text style={{ fontSize: 10, color: P, fontWeight: '600' }}>{item.count}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : isRest ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 32 }}>😴</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginTop: 4 }}>{T('bodyPlanRestDay')}</Text>
                  </View>
                ) : (
                  <>
                    {/* Selected sport with change button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => setTaskSportKey(activeDay, '')}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: TH.border }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyPlanChange')}</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{cat?.icon} {cat ? T(cat.i18nKey) : task.sportKey}</Text>
                    </View>

                    {/* Search exercises */}
                    {currentExs.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: TH.card, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: TH.border }}>
                        <Search size={14} color={TH.sub} />
                        <TextInput value={exSearch} onChangeText={setExSearch} placeholder="搜索动作" placeholderTextColor={TH.sub}
                          style={{ flex: 1, paddingVertical: 8, color: TH.text, fontSize: FONT_SMALL() }} />
                        {exSearch ? <TouchableOpacity onPress={() => setExSearch('')}><X size={14} color={TH.sub} /></TouchableOpacity> : null}
                      </View>
                    )}

                    {/* Exercise list */}
                    {searchedExs.length > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {searchedExs.map(ex => {
                          const alreadyAdded = hasExs && (task.exercises ?? []).some(e => e.nameZh === ex.nameZh);
                          return (
                            <TouchableOpacity key={ex.id} onPress={() => !alreadyAdded && addExercise(activeDay, ex)}
                              style={[styles.exChip, {
                                borderColor: alreadyAdded ? `${P}40` : P,
                                backgroundColor: alreadyAdded ? `${P}08` : `${P}12`,
                                opacity: alreadyAdded ? 0.5 : 1,
                              }]}>
                              <Text style={{ fontSize: FONT_SMALL(), color: alreadyAdded ? `${P}80` : P, fontWeight: '600' }}>{ex.icon} {ex.nameZh}</Text>
                              {ex.defaultSets && ex.defaultReps ? (
                                <Text style={{ fontSize: 10, color: alreadyAdded ? `${P}60` : `${P}cc`, marginLeft: 2 }}>{ex.defaultSets}×{ex.defaultReps}</Text>
                              ) : null}
                              {alreadyAdded ? <Text style={{ fontSize: 10, color: `${P}60`, marginLeft: 2 }}>✓</Text> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : currentExs.length > 0 && exSearch ? (
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 8 }}>{T('bodyPlanNoExercises')}</Text>
                    ) : null}

                    {/* Added exercises */}
                    {hasExs && (
                      <View style={{ marginBottom: 8 }}>
                        {(task.exercises ?? []).map(ex => (
                          <View key={ex.id} style={[styles.exRow, { backgroundColor: `${P}08` }]}>
                            <Text style={{ fontSize: FONT_SMALL(), color: TH.text, flex: 1 }}>
                              {ex.icon} {ex.nameZh || ex.name}
                              {ex.defaultSets && ex.defaultReps ? `  ${ex.defaultSets}×${ex.defaultReps}` : ''}
                              {ex.defaultWeight ? `  ${ex.defaultWeight}kg` : ''}
                              {ex.defaultDurationSec ? `  ${Math.round(ex.defaultDurationSec / 60)}min` : ''}
                            </Text>
                            <TouchableOpacity onPress={() => removeExercise(activeDay, ex.id)}><X size={14} color="#EF4444" /></TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Custom exercise */}
                    {showCustomEx === activeDay ? (
                      <View style={{ backgroundColor: TH.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: TH.border, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                          <TextInput value={customExName} onChangeText={setCustomExName} placeholder="动作名称" placeholderTextColor={TH.sub}
                            style={[styles.smallInput, { flex: 2, backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]} />
                          <TextInput value={customExSets} onChangeText={setCustomExSets} placeholder="组" keyboardType="numeric" placeholderTextColor={TH.sub}
                            style={[styles.smallInput, { flex: 1, backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]} />
                          <TextInput value={customExReps} onChangeText={setCustomExReps} placeholder="次" keyboardType="numeric" placeholderTextColor={TH.sub}
                            style={[styles.smallInput, { flex: 1, backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity onPress={() => addCustomExercise(activeDay)}
                            style={{ flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: P, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: FONT_SMALL(), fontWeight: '600' }}>{T('confirm')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setShowCustomEx(null); setCustomExName(''); }}
                            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                            <Text style={{ color: TH.sub, fontSize: FONT_SMALL() }}>{T('cancel')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setShowCustomEx(activeDay)} style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>+ {T('bodyPlanAddCustom')}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Note */}
                    <TextInput value={task.note ?? ''} onChangeText={v => setTasks(prev => prev.map(t => t.weekday === activeDay ? { ...t, note: v } : t))}
                      placeholder={T('bodyPlanNote')} placeholderTextColor={TH.sub}
                      style={{ backgroundColor: TH.card, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, color: TH.text, fontSize: FONT_SMALL(), borderWidth: 1, borderColor: TH.border }} />
                  </>
                )}
              </View>
            );
          })()}
        </View>
      </ScrollView>

      {/* ── Floating Save ── */}
      <View style={[styles.footer, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
        <TouchableOpacity onPress={handleSave} disabled={!name.trim()}
          style={[styles.saveBtn, { backgroundColor: name.trim() ? P : TH.border }]}>
          <Save size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyPlanSave')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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