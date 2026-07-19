import { FONT_SMALL, FONT_SUB, EXERCISE_CATEGORIES, type ExerciseDef, type Theme } from '@egoless-do/core';
import { Search, X } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const P = '#f59e0b';

type ExFilter = 'all' | 'traditional' | 'modern';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  exerciseLibrary: ExerciseDef[];
  addedExIds: Set<string>;          // IDs of exercises already in the day plan
  selectedIds: Set<string>;         // transient selection (for undo)
  onToggle: (ex: ExerciseDef) => void;
}

// Extract unique muscle groups from the exercise library
function extractMuscleGroups(library: ExerciseDef[]): string[] {
  const groups = new Set<string>();
  for (const ex of library) {
    for (const mg of ex.muscleGroups) {
      groups.add(mg);
    }
  }
  return Array.from(groups).sort();
}

export default function ExercisePickerGrid({ TH, T, exerciseLibrary, addedExIds, selectedIds, onToggle }: Props) {
  const [exFilter, setExFilter] = useState<ExFilter>('all');
  const [exSearch, setExSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string>('all');

  const allMuscleGroups = useMemo(() => extractMuscleGroups(exerciseLibrary), [exerciseLibrary]);

  const filteredExercises = useMemo(() => {
    let exs = exerciseLibrary;

    // Filter by type
    if (exFilter === 'traditional') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type === 'traditional');
    } else if (exFilter === 'modern') {
      exs = exs.filter(e => EXERCISE_CATEGORIES.find(c => c.key === e.category)?.type !== 'traditional');
    }

    // Filter by search
    if (exSearch.trim()) {
      const q = exSearch.trim().toLowerCase();
      exs = exs.filter(e => e.nameZh.toLowerCase().includes(q) || (e.nameI18nKey?.toLowerCase() ?? '').includes(q));
    }

    // Filter by muscle group
    if (muscleGroup !== 'all') {
      exs = exs.filter(e => e.muscleGroups.includes(muscleGroup));
    }

    return exs;
  }, [exerciseLibrary, exFilter, exSearch, muscleGroup]);

  const renderItem = useCallback(({ item }: { item: ExerciseDef }) => {
    const isAdded = addedExIds.has(item.id);
    const isSelected = selectedIds.has(item.id);
    const isDimmed = isAdded && !isSelected;

    return (
      <TouchableOpacity
        onPress={() => onToggle(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.nameZh}${isAdded ? ' 已添加' : ''}`}
        style={[
          styles.exCard,
          {
            borderColor: isSelected ? P : isAdded ? `${P}40` : TH.border,
            backgroundColor: isSelected ? `${P}18` : isAdded ? `${P}08` : TH.card,
            opacity: isDimmed ? 0.5 : 1,
          },
        ]}
      >
        {/* Checkmark overlay for selected */}
        {isSelected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}

        {/* Already-added indicator */}
        {isAdded && !isSelected && (
          <View style={[styles.addedBadge, { backgroundColor: `${P}40` }]}>
            <Text style={[styles.addedBadgeText, { color: P }]}>✓</Text>
          </View>
        )}

        <Text style={styles.exIconText}>{item.icon}</Text>
        <Text style={[styles.exNameText, { color: isSelected ? P : TH.text }]} numberOfLines={2}>
          {item.nameZh}
        </Text>

        {(item.defaultSets ?? 0) > 0 && (item.defaultReps ?? 0) > 0 && (
          <Text style={[styles.exMetaText, { color: isSelected ? P : TH.sub }]}>
            {String(item.defaultSets)}×{String(item.defaultReps)}
          </Text>
        )}
        {(item.defaultDurationSec ?? 0) > 0 && (
          <Text style={[styles.exMetaText, { color: isSelected ? P : TH.sub }]}>
            {String(Math.round(item.defaultDurationSec / 60))}min
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [addedExIds, selectedIds, onToggle, TH]);

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {([
          { key: 'all' as ExFilter, label: T('bodyPlanFreeTraining') || '全部', icon: '🎯' },
          { key: 'traditional' as ExFilter, label: T('bodyPlanTraditional') || '传统', icon: '☯️' },
          { key: 'modern' as ExFilter, label: T('bodyPlanModern') || '现代', icon: '💪' },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setExFilter(tab.key)}
            style={[styles.filterTab, { borderColor: exFilter === tab.key ? P : TH.border }, exFilter === tab.key && { backgroundColor: `${P}15` }]}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
            <Text style={[styles.filterTabText, { color: exFilter === tab.key ? P : TH.sub }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: TH.bg, borderColor: TH.border }]}>
        <Search size={14} color={TH.sub} />
        <TextInput
          value={exSearch}
          onChangeText={setExSearch}
          placeholder={T('bodySearchExercise') || '搜索动作'}
          placeholderTextColor={TH.sub}
          style={[styles.searchInput, { color: TH.text }]}
          accessibilityLabel={T('bodySearchExercise') || '搜索动作'}
        />
        {exSearch.length > 0 && (
          <TouchableOpacity onPress={() => setExSearch('')} accessibilityLabel={T('bodyClear') || '清除'}>
            <X size={14} color={TH.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Muscle group filter chips */}
      {allMuscleGroups.length > 0 && (
        <View style={styles.muscleRow}>
          <TouchableOpacity
            onPress={() => setMuscleGroup('all')}
            style={[styles.muscleChip, { borderColor: muscleGroup === 'all' ? P : TH.border }, muscleGroup === 'all' && { backgroundColor: `${P}15` }]}
          >
            <Text style={[styles.muscleChipText, { color: muscleGroup === 'all' ? P : TH.sub }]}>
              {T('bodyAll') || '全部'}
            </Text>
          </TouchableOpacity>
          {allMuscleGroups.map(mg => (
            <TouchableOpacity
              key={mg}
              onPress={() => setMuscleGroup(mg)}
              style={[styles.muscleChip, { borderColor: muscleGroup === mg ? P : TH.border }, muscleGroup === mg && { backgroundColor: `${P}15` }]}
            >
              <Text style={[styles.muscleChipText, { color: muscleGroup === mg ? P : TH.sub }]}>{mg}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Exercise grid */}
      <FlatList
        data={filteredExercises}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: TH.sub }]}>
              {T('bodyPlanNoExercises') || '未找到动作'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: FONT_SMALL(),
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  muscleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  muscleChipText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  gridRow: {
    gap: 6,
    marginBottom: 6,
  },
  exCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 72,
    justifyContent: 'center',
  },
  exIconText: {
    fontSize: 20,
    marginBottom: 2,
  },
  exNameText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
    textAlign: 'center',
  },
  exMetaText: {
    fontSize: 10,
    marginTop: 1,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: P,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  addedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SUB(),
  },
  // Legacy style names kept for compatibility
  group: {},
  groupHeader: {},
  groupTitle: {},
  exHeader: {},
});