import { FONT_SMALL, FONT_SUB, FONT_BODY, EXERCISE_CATEGORIES, type BodyPlanTask, type ExerciseDef, type Theme } from '@egoless-do/core';
import { ChevronDown, ChevronUp, Play } from 'lucide-react-native';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, StyleSheet } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import ExerciseCard from './ExerciseCard';

const P = '#f59e0b';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  task: BodyPlanTask;
  isActive?: boolean;
  onStartTraining: (weekday: number) => void;
  onUpdateTask: (weekday: number, updates: Partial<BodyPlanTask>) => void;
  onShowSnackbar: (message: string, undoFn: () => void) => void;
}

export default function DayPlanCard({
  TH, T, task, isActive,
  onStartTraining, onUpdateTask, onShowSnackbar,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isRest = task.sportKey === 'rest';
  const addedExs = useMemo(() => task.exercises ?? [], [task.exercises]);

  // Part icon
  const partIcon = useMemo(() => {
    if (isRest) return '😴';
    const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
    return cat?.icon ?? '🏋️';
  }, [isRest, task.sportKey]);

  // Part name
  const partName = useMemo(() => {
    if (isRest) return T('bodyPlanRestDay');
    const cat = EXERCISE_CATEGORIES.find(c => c.key === task.sportKey);
    return cat ? T(cat.i18nKey) : task.sportKey;
  }, [isRest, T, task.sportKey]);

  // Estimated duration
  const estimatedDuration = useMemo(() => {
    if (addedExs.length === 0) return 0;
    const totalSec = addedExs.reduce((s, ex) => s + (ex.defaultDurationSec ?? ((ex.defaultSets ?? 3) * 45)), 0);
    return Math.round(totalSec / 60);
  }, [addedExs]);

  // Auto-expand when this card becomes active
  useEffect(() => {
    if (isActive) {
      LayoutAnimation.configureNext({
        duration: 250,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'easeInEaseOut' },
      });
      setExpanded(true);
    }
  }, [isActive]);

  // Weekday label
  const WEEKDAY_KEYS = ['', 'bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
  const weekdayLabel = T(WEEKDAY_KEYS[task.weekday] ?? '');

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setExpanded(prev => !prev);
  }, []);

  const handleRemoveExercise = useCallback((exId: string) => {
    const removedEx = addedExs.find(e => e.id === exId);
    const newExs = addedExs.filter(e => e.id !== exId);
    onUpdateTask(task.weekday, { exercises: newExs });

    if (removedEx) {
      onShowSnackbar(
        `${removedEx.nameZh} ${T('bodyPlanRemoved')}`,
        () => {
          onUpdateTask(task.weekday, { exercises: [...newExs, removedEx] });
        }
      );
    }
  }, [addedExs, task.weekday, onUpdateTask, onShowSnackbar, T]);

  const handleUpdateExercise = useCallback((exId: string, updates: Partial<Pick<ExerciseDef, 'defaultSets' | 'defaultReps' | 'defaultWeight'>>) => {
    const newExs = addedExs.map(ex =>
      ex.id === exId ? { ...ex, ...updates } : ex
    );
    onUpdateTask(task.weekday, { exercises: newExs });
  }, [addedExs, task.weekday, onUpdateTask]);

  // ── Rest day view ──
  if (isRest) {
    return (
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${weekdayLabel} ${T('bodyPlanRestDay')}`}
        style={[styles.restCard, { backgroundColor: TH.card, borderColor: TH.border }]}
      >
        <View style={styles.restContent}>
          <Text style={styles.restIcon}>😴</Text>
          <View style={styles.restTextCol}>
            <Text style={[styles.restDayLabel, { color: TH.sub }]}>{weekdayLabel}</Text>
            <Text style={[styles.restTitle, { color: TH.text }]}>{T('bodyPlanRestDay')}</Text>
          </View>
          {expanded ? <ChevronUp size={20} color={TH.sub} /> : <ChevronDown size={20} color={TH.sub} />}
        </View>
        {expanded && (
          <View style={[styles.restDetail, { borderTopColor: TH.border }]}>
            <Text style={[styles.restDetailText, { color: TH.sub }]}>
              {T('bodyPlanRestDayHint')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ── Training day view ──
  return (
    <View style={[styles.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Collapsed summary row (always visible) */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${weekdayLabel} ${partName}`}
        style={styles.summaryRow}
      >
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryIcon}>{partIcon}</Text>
          <View style={styles.summaryCol}>
            <Text style={styles.weekdayLabel}>{weekdayLabel}</Text>
            <Text style={[styles.partName, { color: TH.text }]}>{partName}</Text>
          </View>
        </View>
        <View style={styles.summaryRight}>
          {addedExs.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: `${P}15` }]}>
              <Text style={[styles.summaryCount, { color: P }]}>{String(addedExs.length)}{T('bodyPlanUnitExercise')}</Text>
            </View>
          )}
          {estimatedDuration > 0 && (
            <Text style={[styles.summaryDuration, { color: TH.sub }]}>{String(estimatedDuration)}min</Text>
          )}
          {expanded ? <ChevronUp size={18} color={TH.sub} /> : <ChevronDown size={18} color={TH.sub} />}
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: TH.border }]}>
          {/* Exercise List (already added) — only inline edit/remove */}
          {addedExs.length > 0 && (
            <View style={styles.exerciseListSection}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                {T('bodyPlanAddedExercises')} ({String(addedExs.length)})
              </Text>
              {addedExs.map(ex => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  TH={TH}
                  T={T}
                  onRemove={handleRemoveExercise}
                  onUpdate={handleUpdateExercise}
                />
              ))}
            </View>
          )}

          {/* Empty state when no exercises */}
          {addedExs.length === 0 && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: TH.sub }]}>
                {T('bodyPlanNoExercises')}
              </Text>
            </View>
          )}

          {/* CTA - Start Training this day */}
          {addedExs.length > 0 && (
            <TouchableOpacity
              onPress={() => onStartTraining(task.weekday)}
              activeOpacity={0.8}
              style={styles.ctaBtn}
              accessibilityRole="button"
              accessibilityLabel={T('bodyStartTraining')}
            >
              <Play size={18} color="#fff" />
              <Text style={styles.ctaText}>{T('bodyStartTraining')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryIcon: {
    fontSize: 24,
  },
  summaryCol: {
    flex: 1,
  },
  weekdayLabel: {
    fontSize: FONT_SMALL(),
    color: '#f59e0b',
    fontWeight: '600',
  },
  partName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginTop: 1,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryCount: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  summaryDuration: {
    fontSize: FONT_SMALL(),
  },
  expandedContent: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: FONT_SUB(),
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseListSection: {
    marginBottom: 4,
  },
  emptySection: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SUB(),
    textAlign: 'center',
  },
  ctaBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_BODY(),
  },
  // Rest day styles
  restCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  restContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  restIcon: {
    fontSize: 28,
  },
  restTextCol: {
    flex: 1,
  },
  restDayLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  restTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginTop: 1,
  },
  restDetail: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  restDetailText: {
    fontSize: FONT_SUB(),
    textAlign: 'center',
    lineHeight: 20,
  },
});