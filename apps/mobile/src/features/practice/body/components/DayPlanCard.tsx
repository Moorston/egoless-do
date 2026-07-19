import {
  EXERCISE_CATEGORIES,
  type BodyPlanTask,
  type ExerciseDef,
  type Theme,
} from '@egoless-do/core';
import { Search, X } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { useT } from '../../../../components/UI';

const P = '#f59e0b';

type ExFilter = 'all' | 'traditional' | 'modern';

interface Props {
  TH: Theme;
  task: BodyPlanTask;
  exerciseLibrary: ExerciseDef[];
  onShowSnackbar: (message: string, undoFn: () => void) => void;
  selectedIds: Set<string>;
}

export default function DayPlanCard({
  TH,
  task,
  exerciseLibrary,
  onShowSnackbar,
  selectedIds,
}: Props) {
  const T = useT();
  const [exFilter, setExFilter] = useState<ExFilter>('all');
  const [exSearch, setExSearch] = useState('');
  const [selectedExIds, setSelectedExIds] = useState<Set<string>>(new Set());

  const isRest = task.sportKey === 'rest';

  const searchedExs = useMemo(() => {
    let exs = exerciseLibrary;
    if (exFilter === 'traditional') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type === 'traditional');
    } else if (exFilter === 'modern') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type === 'modern');
    }
    if (exSearch.trim()) exs = exs.filter(e => e.nameZh.includes(exSearch.trim()));
    return exs;
  }, [exerciseLibrary, exSearch, exFilter]);

  const groups = useMemo(() => {
    const result: { cat: typeof EXERCISE_CATEGORIES[number]; items: ExerciseDef[] }[] = [];
    const addedKeys = new Set<string>();
    for (const ex of searchedExs) {
      if (!addedKeys.has(ex.category)) {
        addedKeys.add(ex.category);
        const cat = EXERCISE_CATEGORIES.find(c => c.key === ex.category);
        if (cat) result.push({ cat, items: searchedExs.filter(e => e.category === ex.category) });
      }
    }
    const uncategorized = searchedExs.filter(e => !EXERCISE_CATEGORIES.some(c => c.key === e.category));
    if (uncategorized.length > 0) {
      result.push({ cat: { category: '', key: '__other__', icon: '🏋️', type: 'modern', i18nKey: 'bodyCatModern' }, items: uncategorized });
    }
    return result;
  }, [searchedExs]);

  const addedExs = useMemo(() => task.exercises ?? [], [task.exercises]);

  const handleToggle = useCallback((ex: ExerciseDef) => {
    const isSelected = selectedIds.has(ex.id);
    const isAlreadyAdded = addedExs.some(e => e.nameZh === ex.nameZh);
    if (isSelected) {
      setSelectedExIds(prev => { const n = new Set(prev); n.delete(ex.id); return n; });
      onShowSnackbar(`${ex.nameZh} 已移除`, () => setSelectedExIds(prev => new Set([...prev, ex.id])));
    } else if (!isAlreadyAdded) {
      setSelectedExIds(prev => new Set([...prev, ex.id]));
      onShowSnackbar(`${ex.nameZh} 已添加`, () => setSelectedExIds(prev => { const n = new Set(prev); n.delete(ex.id); return n; }));
    }
  }, [selectedIds, addedExs, onShowSnackbar]);

  if (isRest) {
    return (
      <View style={[styles.restCard, { backgroundColor: TH.card }]}>
        <Text style={{ fontSize: 32, textAlign: 'center' }}>😴</Text>
        <Text style={[styles.restText, { color: TH.sub }]}>{T('bodyPlanRestDay')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: TH.bg, borderColor: TH.border }]}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {([
          { key: 'all', label: T('bodyPlanFreeTraining'), icon: '🎯' },
          { key: 'traditional', label: T('bodyPlanTraditional'), icon: '☯️' },
          { key: 'modern', label: T('bodyPlanModern'), icon: '💪' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setExFilter(tab.key)}
            style={[styles.filterTab, exFilter === tab.key && { backgroundColor: `${P}15`, borderColor: P }]}
          >
            <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
            <Text style={[styles.filterText, { color: exFilter === tab.key ? P : TH.sub }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <Search size={14} color={TH.sub} />
        <TextInput
          value={exSearch}
          onChangeText={setExSearch}
          placeholder={T('bodySearchExercise') || '搜索动作'}
          placeholderTextColor={TH.sub}
          style={[styles.searchInput, { color: TH.text }]}
        />
        {exSearch ? <TouchableOpacity onPress={() => setExSearch('')}><X size={14} color={TH.sub} /></TouchableOpacity> : null}
      </View>

      {/* Selected count */}
      {selectedIds.size > 0 && (
        <View style={[styles.selectedBar, { backgroundColor: `${P}10`, borderColor: `${P}30` }]}>
          <Text style={[styles.selectedText, { color: P }]}>{T('bodyPlanSelectedCount') || `已选 ${selectedIds.size} 个`}</Text>
        </View>
      )}

      {/* Exercise grid */}
      <View style={styles.grid}>
        {groups.length === 0 ? (
          <Text style={[styles.emptyText, { color: TH.sub }]}>{T('bodyPlanNoExercises') || '未找到动作'}</Text>
        ) : groups.map(group => (
          <View key={group.cat.key} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={{ fontSize: 18 }}>{group.cat.icon}</Text>
              <Text style={[styles.groupTitle, { color: TH.text }]}>{T(group.cat.i18nKey)}</Text>
            </View>
            <View style={styles.groupGrid}>
              {group.items.map(ex => {
                const alreadyAdded = addedExs.some(e => e.nameZh === ex.nameZh);
                const isSelected = selectedIds.has(ex.id);
                return (
                  <TouchableOpacity
                    key={ex.id}
                    onPress={() => alreadyAdded || isSelected ? undefined : handleToggle(ex)}
                    style={[
                      styles.exCard,
                      {
                        width: '31%',
                        minWidth: 90,
                        borderColor: isSelected ? P : alreadyAdded ? `${P}30` : TH.border,
                        backgroundColor: isSelected ? `${P}18` : alreadyAdded ? `${P}08` : TH.card,
                        opacity: alreadyAdded ? 0.4 : 1,
                      },
                    ]}
                  >
                    <View style={styles.exHeader}>
                      <Text style={styles.exIcon}>{ex.icon}</Text>
                      <Text numberOfLines={1} style={[styles.exName, { color: isSelected ? P : TH.text }]}>
                        {isSelected && '☑ '}{alreadyAdded && !isSelected && '✓ '}{ex.nameZh}
                      </Text>
                    </View>
                    {ex.defaultSets && ex.defaultReps && (
                      <Text style={[styles.exMeta, { color: isSelected ? P : TH.sub }]}>{ex.defaultSets}×{ex.defaultReps}</Text>
                    )}
                    {!ex.defaultSets && ex.defaultDurationSec && (
                      <Text style={[styles.exMeta, { color: isSelected ? P : TH.sub }]}>{String(Math.round(ex.defaultDurationSec / 60))}分钟</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Selected exercises list */}
      {addedExs.length > 0 && (
        <View style={styles.addedSection}>
          <Text style={[styles.addedTitle, { color: TH.text }]}>{T('bodyPlanAddedExercises') || '当天动作'}</Text>
          {addedExs.map(ex => (
            <View key={ex.id} style={[styles.addedRow, { backgroundColor: `${P}08` }]}>
              <View style={styles.addedInfo}>
                <Text style={{ fontSize: 16 }}>{ex.icon}</Text>
                <Text style={[styles.addedName, { color: TH.text }]}>{ex.nameZh || ex.name}</Text>
                {ex.defaultSets && ex.defaultReps && (
                  <TouchableOpacity
                    onPress={() => { setEditingEx({ id: ex.id, field: 'sets' }); setEditValue(String(ex.defaultSets)); }}
                    style={styles.editPill}
                  >
                    <Text style={[styles.addedMeta, { color: TH.sub }]}>{String(ex.defaultSets)}×</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => onRemoveExercise(ex.id)} accessibilityLabel="移除">
                <X size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Start Training CTA */}
      {addedExs.length > 0 && (
        <TouchableOpacity onPress={() => {}} style={[styles.ctaBtn, { backgroundColor: P }]}>
          <Text style={styles.ctaText}>{T('bodyStartTraining') || '开始训练'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  restCard: { borderRadius: 12, padding: 24, alignItems: 'center' },
  restText: { fontSize: 14, marginTop: 8 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13 },
  selectedBar: { padding: 8, borderRadius: 8, borderWidth: 1 },
  selectedText: { fontSize: 14, fontWeight: '600' },
  grid: {},
  emptyText: { textAlign: 'center', paddingVertical: 16 },
  group: { marginBottom: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  groupTitle: { fontSize: 14, fontWeight: '600' },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exCard: { borderRadius: 10, padding: 10, borderWidth: 1 },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  exIcon: { fontSize: 16 },
  exName: { fontSize: 12, fontWeight: '500', flex: 1 },
  exMeta: { fontSize: 10 },
  addedSection: { marginTop: 4 },
  addedTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  addedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 8, marginBottom: 4 },
  addedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  addedName: { fontSize: 14, fontWeight: '500', flex: 1 },
  addedMeta: { fontSize: 12 },
  editPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  ctaBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
