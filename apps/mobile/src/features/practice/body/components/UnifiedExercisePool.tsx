import { FONT_SMALL, FONT_SUB, EXERCISE_CATEGORIES, type ExerciseDef, type Theme } from '@egoless-do/core';
import { Search, X } from 'lucide-react-native';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const P = '#f59e0b';

type ExFilter = 'all' | 'traditional' | 'modern';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  exerciseLibrary: ExerciseDef[];
  dayTasks: Map<number, ExerciseDef[]>;       // weekday → exercises already in each day
  activeDay: number | null;                    // currently expanded day
  selectedDays: Set<number>;                   // current day-chooser selection
  onDayChooserChange: (days: Set<number>) => void;
  onDayChooserEx: ExerciseDef | null;
  onDayChooserSetEx: (ex: ExerciseDef | null) => void;
  onAddToDays: (ex: ExerciseDef, days: number[]) => void;
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
  activeDay, selectedDays, onDayChooserChange,
  onDayChooserEx, onDayChooserSetEx, onAddToDays,
}: Props) {
  const [exFilter, setExFilter] = useState<ExFilter>('all');
  const [exSearch, setExSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string>('all');

  // Debounce timer ref for auto-save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Handle auto-save with debounce
  const triggerAutoSave = useCallback((ex: ExerciseDef, days: Set<number>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const daysArr = Array.from(days);
      if (daysArr.length > 0) {
        onAddToDays(ex, daysArr);
      }
    }, 500);
  }, [onAddToDays]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle exercise tap: show day chooser
  const handleExerciseTap = useCallback((ex: ExerciseDef) => {
    if (onDayChooserEx?.id === ex.id) {
      // Tapping the same exercise again deselects it
      onDayChooserSetEx(null);
      onDayChooserChange(new Set(activeDay ? [activeDay] : []));
    } else {
      // Set the selected exercise and pre-check activeDay
      const initialDays = new Set<number>(activeDay ? [activeDay] : []);
      onDayChooserSetEx(ex);
      onDayChooserChange(initialDays);
    }
  }, [onDayChooserEx, onDayChooserSetEx, onDayChooserChange, activeDay]);

  // Handle day checkbox toggle
  const handleDayToggle = useCallback((weekday: number) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(weekday)) {
      newDays.delete(weekday);
    } else {
      newDays.add(weekday);
    }
    onDayChooserChange(newDays);
    // Trigger auto-save if there's a selected exercise
    if (onDayChooserEx) {
      triggerAutoSave(onDayChooserEx, newDays);
    }
  }, [selectedDays, onDayChooserChange, onDayChooserEx, triggerAutoSave]);

  // Handle select all / deselect all days
  const handleToggleAllDays = useCallback(() => {
    if (selectedDays.size >= 7) {
      onDayChooserChange(new Set());
    } else {
      onDayChooserChange(new Set([1, 2, 3, 4, 5, 6, 7]));
    }
    if (onDayChooserEx) {
      const newDays = selectedDays.size >= 7 ? new Set<number>() : new Set([1, 2, 3, 4, 5, 6, 7]);
      triggerAutoSave(onDayChooserEx, newDays);
    }
  }, [selectedDays, onDayChooserChange, onDayChooserEx, triggerAutoSave]);

  const renderItem = useCallback(({ item }: { item: ExerciseDef }) => {
    const existingDays = exerciseDayMap.get(item.nameZh);
    const isSelected = onDayChooserEx?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleExerciseTap(item)}
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
  }, [exerciseDayMap, onDayChooserEx, handleExerciseTap, TH, getDayLabel, T]);

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

      {/* Day checkbox row (shown when an exercise is selected) */}
      {onDayChooserEx && (
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
              const existingDays = exerciseDayMap.get(onDayChooserEx.nameZh);
              const isExisting = existingDays?.has(weekday) ?? false;
              const isChecked = selectedDays.has(weekday);
              const isDimmed = isExisting && !isChecked;

              return (
                <TouchableOpacity
                  key={weekday}
                  onPress={() => !isDimmed && handleDayToggle(weekday)}
                  activeOpacity={isDimmed ? 1 : 0.7}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${getDayLabel(weekday)}${isChecked ? ` ${T('bodyPlanSelected') || '已选'}` : ''}${isExisting ? ` ${T('bodyPlanAlreadyExists') || '已有'}` : ''}`}
                  style={[
                    styles.dayCheckbox,
                    {
                      backgroundColor: isChecked ? `${P}20` : isDimmed ? TH.border : TH.bg,
                      borderColor: isChecked ? P : isDimmed ? `${P}20` : TH.border,
                      opacity: isDimmed ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={[
                    styles.dayCheckboxLabel,
                    { color: isChecked ? P : isDimmed ? `${P}60` : TH.sub },
                  ]}>
                    {getDayLabel(weekday)}
                  </Text>
                  {isChecked && (
                    <Text style={styles.dayCheckboxCheck}>✓</Text>
                  )}
                  {isExisting && !isChecked && (
                    <Text style={[styles.dayCheckboxExisting, { color: `${P}60` }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
  dayCheckboxExisting: {
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
});