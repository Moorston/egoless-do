import { FONT_SMALL, FONT_SUB, EXERCISE_CATEGORIES, type ExerciseDef, type Theme } from '@egoless-do/core';
import { Search, X } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const P = '#f59e0b';

type ExFilter = 'all' | 'traditional' | 'modern';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  exerciseLibrary: ExerciseDef[];
  dayTasks: Map<number, ExerciseDef[]>;       // weekday → exercises already in each day
  activeDay: number | null;                    // currently expanded day
  selectedExIds: Set<string>;                 // multi-select: set of selected exercise IDs
  selectedDays: Set<number>;                   // current day-chooser selection
  onExerciseToggle: (exId: string) => void;
  onDayChooserChange: (days: Set<number>) => void;
  onBatchAddToDays: () => void;
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

// Weekday labels (compact, for day checkbox row)
const WEEKDAY_COMPACT_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

export default function UnifiedExercisePool({
  TH, T, exerciseLibrary, dayTasks,
  activeDay, selectedExIds, selectedDays,
  onExerciseToggle, onDayChooserChange, onBatchAddToDays,
}: Props) {
  const [exFilter, setExFilter] = useState<ExFilter>('all');
  const [exSearch, setExSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string>('all');

  const allMuscleGroups = useMemo(() => extractMuscleGroups(exerciseLibrary), [exerciseLibrary]);

  // Build a Set of exercise IDs that exist in each day, keyed by nameZh
  // Plan exercises have generated IDs (planex_1_...), so we use nameZh for matching
  const exerciseDayMap = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const [weekday, exs] of dayTasks.entries()) {
      for (const ex of exs) {
        if (!map.has(ex.nameZh)) map.set(ex.nameZh, new Set());
        map.get(ex.nameZh)!.add(weekday);
      }
    }
    return map;
  }, [dayTasks]);

  // Get compact weekday label ("一", "二", ... or "Mon", "Tue", ...)
  const getDayLabel = useCallback((weekday: number): string => {
    const key = WEEKDAY_COMPACT_KEYS[weekday - 1] ?? '';
    const label = T(key);
    // Take first character for compact display
    return label.length > 2 ? label.slice(0, 1) : label;
  }, [T]);

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

  // Handle exercise tap: toggle multi-select
  const handleExerciseToggle = useCallback((ex: ExerciseDef) => {
    onExerciseToggle(ex.id);
    // Auto-pre-check activeDay when first exercise is selected
    if (selectedExIds.size === 0 && activeDay) {
      onDayChooserChange(new Set([activeDay]));
    }
  }, [onExerciseToggle, selectedExIds.size, activeDay, onDayChooserChange]);

  // Handle day checkbox toggle
  const handleDayToggle = useCallback((weekday: number) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(weekday)) {
      newDays.delete(weekday);
    } else {
      newDays.add(weekday);
    }
    onDayChooserChange(newDays);
  }, [selectedDays, onDayChooserChange]);

  // Handle select all / deselect all days
  const handleToggleAllDays = useCallback(() => {
    const newDays = selectedDays.size >= 7 ? new Set<number>() : new Set([1, 2, 3, 4, 5, 6, 7]);
    onDayChooserChange(newDays);
  }, [selectedDays, onDayChooserChange]);

  const renderItem = useCallback(({ item }: { item: ExerciseDef }) => {
    const existingDays = exerciseDayMap.get(item.nameZh);
    const isSelected = selectedExIds.has(item.id);

    return (
      <TouchableOpacity
        onPress={() => handleExerciseToggle(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.nameZh}${existingDays ? ` (${T('bodyPlanAlreadyExists') || '已存在'} ${existingDays.size} ${T('bodyPlanDays') || '天'})` : ''}`}
        style={[
          styles.exCard,
          {
            borderColor: isSelected ? P : existingDays ? `${P}40` : TH.border,
            backgroundColor: isSelected ? `${P}18` : existingDays ? `${P}08` : TH.card,
          },
        ]}
      >
        {/* Checkmark overlay for selected */}
        {isSelected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}

        {/* Existing-day badge */}
        {existingDays && existingDays.size > 0 && !isSelected && (
          <View style={[styles.existingDayBadge, { backgroundColor: `${P}30` }]}>
            <Text style={[styles.existingDayText, { color: P }]}>
              {Array.from(existingDays).map(getDayLabel).join('/')}
            </Text>
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
  }, [exerciseDayMap, selectedExIds, handleExerciseToggle, TH, getDayLabel, T]);

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {([
          { key: 'all' as ExFilter, label: T('bodyPlanAll') || '全部', icon: '🎯' },
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

      {/* Search bar + muscle group chips row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchInputRow, { backgroundColor: TH.bg, borderColor: TH.border }]}>
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
      <ScrollView
        style={{ maxHeight: 280 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredExercises.map(item => (
            <View key={item.id} style={styles.gridCell}>
              {renderItem({ item })}
            </View>
          ))}
          {filteredExercises.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: TH.sub }]}>
                {T('bodyPlanNoExercises') || '未找到动作'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Selection count badge */}
      {selectedExIds.size > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: `${P}12`, borderColor: `${P}30` }]}>
          <Text style={[styles.selectionText, { color: P }]}>
            {T('bodyPlanSelected') || '已选'} {String(selectedExIds.size)} {T('bodyPlanUnitExercise')}
          </Text>
          <TouchableOpacity
            onPress={() => onExerciseToggle('__clear__')}
            style={styles.clearBtn}
            accessibilityRole="button"
          >
            <Text style={[styles.clearBtnText, { color: P }]}>
              {T('bodyClear') || '清除'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day checkbox row + batch add button (shown when exercises are selected) */}
      {selectedExIds.size > 0 && (
        <View style={[styles.dayChooserRow, { borderTopColor: TH.border }]}>
          <View style={styles.dayChooserHeader}>
            <Text style={[styles.dayChooserTitle, { color: TH.text }]}>
              {T('bodyPlanAddToDays') || '分配到天'}
            </Text>
            <TouchableOpacity
              onPress={handleToggleAllDays}
              style={styles.toggleAllBtn}
              accessibilityRole="button"
              accessibilityLabel={T('bodyPlanSelectAll') || '全选/取消'}
            >
              <Text style={[styles.toggleAllText, { color: P }]}>
                {selectedDays.size >= 7 ? (T('bodyPlanDeselectAll') || '取消全选') : (T('bodyPlanSelectAll') || '全选')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayCheckboxRow}>
            {[1, 2, 3, 4, 5, 6, 7].map(weekday => {
              const isChecked = selectedDays.has(weekday);

              return (
                <TouchableOpacity
                  key={weekday}
                  onPress={() => handleDayToggle(weekday)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${getDayLabel(weekday)}${isChecked ? ` ${T('bodyPlanSelected') || '已选'}` : ''}`}
                  style={[
                    styles.dayCheckbox,
                    {
                      backgroundColor: isChecked ? `${P}20` : TH.bg,
                      borderColor: isChecked ? P : TH.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.dayCheckboxLabel,
                    { color: isChecked ? P : TH.sub },
                  ]}>
                    {getDayLabel(weekday)}
                  </Text>
                  {isChecked && (
                    <Text style={styles.dayCheckboxCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Batch add button */}
          <TouchableOpacity
            onPress={onBatchAddToDays}
            disabled={selectedDays.size === 0}
            style={[
              styles.batchAddBtn,
              { backgroundColor: selectedDays.size > 0 ? P : `${P}40` },
            ]}
            accessibilityRole="button"
            accessibilityLabel={T('bodyPlanAddSelected') || '添加到选中天'}
          >
            <Text style={styles.batchAddBtnText}>
              {T('bodyPlanAddSelected') || '添加到选中天'} ({String(selectedDays.size)}{T('bodyDayUnit')})
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 0,
  },
  searchInputRow: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridCell: {
    width: '32%',
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
  existingDayBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: '60%',
  },
  existingDayText: {
    fontSize: 8,
    fontWeight: '600',
  },
  // Selection bar
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectionText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  // Day checkbox row
  dayChooserRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  dayChooserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayChooserTitle: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  toggleAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  toggleAllText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  dayCheckboxRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  dayCheckbox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  dayCheckboxLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayCheckboxCheck: {
    fontSize: 10,
    color: P,
    fontWeight: '700',
  },
  // Batch add button
  batchAddBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchAddBtnText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: FONT_SUB(),
  },
});