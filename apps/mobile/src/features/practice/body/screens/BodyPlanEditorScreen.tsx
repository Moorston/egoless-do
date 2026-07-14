import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, EXERCISE_CATEGORIES, BODY_STRATEGIES, type BodyTrainingPlan, type BodyPlanTask, type BodyStrategy } from '@egoless-do/core';
import { ChevronLeft, Target, ClipboardList, Save } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

export default function BodyPlanEditorScreen() {
  const TH = useTheme();
  const T = useT();
  const P = '#f59e0b';
  const nav = useRootNavigation();
  const addBodyTrainingPlan = useShallowStore(s => s.addBodyTrainingPlan);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10);
  });
  const [strategy, setStrategy] = useState<BodyStrategy | ''>('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [goalNote, setGoalNote] = useState('');
  const [tasks, setTasks] = useState<BodyPlanTask[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, sportKey: '', note: '' }))
  );
  const [pickDay, setPickDay] = useState<number | null>(null);

  // Group exercise categories for the picker
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
  };

  const setTaskNote = (weekday: number, note: string) => {
    setTasks(prev => prev.map(t => t.weekday === weekday ? { ...t, note } : t));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addBodyTrainingPlan({
      name: name.trim(),
      startDate,
      endDate,
      strategy: strategy || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      goalNote: goalNote || undefined,
      tasks: tasks.filter(t => t.sportKey),
      status: 'active',
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: TH.border }}>
        <TouchableOpacity onPress={() => nav.goBack()}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>{T('bodyPlanCreate')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Plan name ── */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text, marginBottom: 8 }}>{T('bodyPlanName')}</Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder={T('bodyPlanNamePlaceholder')} placeholderTextColor={TH.sub}
            style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border }}
          />
        </View>

        {/* ── Date range ── */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text, marginBottom: 10 }}>{T('bodyPlanDateRange')}</Text>
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

        {/* ── Goal ── */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Target size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyGoal')}</Text>
          </View>
          {/* Strategy */}
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('bodyStrategyLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {BODY_STRATEGIES.map(s => (
              <TouchableOpacity key={s.key} onPress={() => setStrategy(strategy === s.key ? '' : s.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: strategy === s.key ? P : TH.border, backgroundColor: strategy === s.key ? `${P}20` : 'transparent' }}>
                <Text style={{ fontSize: FONT_SMALL(), color: strategy === s.key ? P : TH.text }}>{T(s.nameKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Target weight & body fat */}
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
          {/* Goal note */}
          <TextInput value={goalNote} onChangeText={setGoalNote} placeholder={T('bodyGoalNotePlaceholder')} placeholderTextColor={TH.sub} multiline numberOfLines={2}
            style={{ backgroundColor: TH.bg, borderRadius: 10, padding: 10, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, minHeight: 60, textAlignVertical: 'top' }} />
        </View>

        {/* ── Tasks ── */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ClipboardList size={18} color={P} />
            <Text style={{ fontWeight: '600', fontSize: FONT_BODY(), color: TH.text }}>{T('bodyWeeklyPlan')}</Text>
          </View>
          {tasks.map((task, idx) => {
            const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
            return (
              <View key={idx} style={{ marginBottom: idx < 6 ? 14 : 0 }}>
                <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 6 }}>{T(WEEKDAY_KEYS[idx])}</Text>
                {pickDay === task.weekday ? (
                  // Sport picker
                  <View style={{ marginBottom: 6 }}>
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
                    <TouchableOpacity onPress={() => setPickDay(null)} style={{ paddingVertical: 4 }}>
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center' }}>{T('bodyCancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setPickDay(task.weekday)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: TH.bg, borderWidth: 1, borderColor: TH.border, marginBottom: 6 }}>
                    {cat ? <Text style={{ fontSize: FONT_BODY() }}>{cat.icon}</Text> : null}
                    <Text style={{ fontSize: FONT_BODY(), color: cat ? TH.text : TH.sub, flex: 1 }}>
                      {cat ? T(cat.i18nKey) : T('bodySelectExercise')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TextInput value={task.note ?? ''} onChangeText={v => setTaskNote(task.weekday, v)}
                  placeholder={T('bodyPlanNote')} placeholderTextColor={TH.sub}
                  style={{ backgroundColor: TH.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: TH.text, fontSize: FONT_SMALL(), borderWidth: 1, borderColor: TH.border }} />
              </View>
            );
          })}
        </View>

        {/* ── Save ── */}
        <TouchableOpacity onPress={handleSave} disabled={!name.trim()}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: name.trim() ? P : TH.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Save size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyPlanSave')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}