import { FONT_BODY, FONT_SMALL, FONT_SUB, type ExerciseDef, type Theme } from '@egoless-do/core';
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const P = '#f59e0b';

interface Props {
  exercise: ExerciseDef;
  TH: Theme;
  T: (key: string) => string;
  onRemove: (exId: string) => void;
  onUpdate: (exId: string, updates: Partial<Pick<ExerciseDef, 'defaultSets' | 'defaultReps' | 'defaultWeight'>>) => void;
}

export default function ExerciseCard({ exercise, TH, T, onRemove, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(String(exercise.defaultSets ?? ''));
  const [reps, setReps] = useState(String(exercise.defaultReps ?? ''));
  const [weight, setWeight] = useState(String(exercise.defaultWeight ?? ''));
  const slideAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const enterEditMode = useCallback(() => {
    setSets(String(exercise.defaultSets ?? ''));
    setReps(String(exercise.defaultReps ?? ''));
    setWeight(String(exercise.defaultWeight ?? ''));
    setEditing(true);
  }, [exercise]);

  const saveEdit = useCallback(() => {
    const updates: Partial<Pick<ExerciseDef, 'defaultSets' | 'defaultReps' | 'defaultWeight'>> = {};
    if (sets.trim()) updates.defaultSets = parseInt(sets, 10) || 0;
    if (reps.trim()) updates.defaultReps = parseInt(reps, 10) || 0;
    if (weight.trim()) updates.defaultWeight = parseFloat(weight) || 0;
    onUpdate(exercise.id, updates);
    setEditing(false);
  }, [exercise.id, sets, reps, weight, onUpdate]);

  const handleRemove = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onRemove(exercise.id);
    });
  }, [exercise.id, onRemove, slideAnim, opacityAnim]);

  const displaySets = exercise.defaultSets ?? (exercise.defaultDurationSec ? Math.round(exercise.defaultDurationSec / 60) : 0);
  const displayReps = exercise.defaultReps ?? 0;
  const displayWeight = exercise.defaultWeight ?? 0;
  const hasSetsReps = (exercise.defaultSets ?? 0) > 0 || (exercise.defaultReps ?? 0) > 0;
  const hasDuration = (exercise.defaultDurationSec ?? 0) > 0;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: TH.card,
          borderColor: TH.border,
          transform: [{ scaleX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Icon + Name */}
        <View style={styles.info}>
          <Text style={styles.icon}>{exercise.icon}</Text>
          <View style={styles.nameCol}>
            <Text style={[styles.name, { color: TH.text }]} numberOfLines={1}>
              {exercise.nameZh || exercise.name}
            </Text>

            {!editing && (
              <Text style={[styles.meta, { color: TH.sub }]}>
                {hasSetsReps
                  ? `${displaySets}×${displayReps}${displayWeight > 0 ? `  ${displayWeight}kg` : ''}`
                  : hasDuration
                  ? `${String(Math.round((exercise.defaultDurationSec ?? 0) / 60))}min`
                  : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {editing ? (
            <TouchableOpacity onPress={saveEdit} style={styles.saveBtn} accessibilityLabel={T('bodySave') || '保存'}>
              <Text style={styles.saveText}>{T('bodySave') || '保存'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={enterEditMode} style={[styles.editBtn, { borderColor: `${P}40` }]} accessibilityLabel={T('bodyAdjust') || '调整'}>
                <Text style={[styles.editText, { color: P }]}>{T('bodyAdjust') || '调整'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemove} style={styles.removeBtn} accessibilityLabel={T('bodyRemove') || '移除'}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Inline edit mode */}
      {editing && (
        <View style={[styles.editRow, { borderTopColor: TH.border }]}>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: TH.sub }]}>{T('bodySets') || '组'}</Text>
            <TextInput
              value={sets}
              onChangeText={setSets}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={TH.sub}
              style={[styles.editInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]}
              onBlur={saveEdit}
              returnKeyType="next"
            />
          </View>
          <Text style={[styles.editMul, { color: TH.sub }]}>×</Text>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: TH.sub }]}>{T('bodyReps') || '次'}</Text>
            <TextInput
              value={reps}
              onChangeText={setReps}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={TH.sub}
              style={[styles.editInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]}
              onBlur={saveEdit}
              returnKeyType="next"
            />
          </View>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: TH.sub }]}>{T('bodyWeightUnit') || 'kg'}</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={TH.sub}
              style={[styles.editInput, { backgroundColor: TH.bg, color: TH.text, borderColor: TH.border }]}
              onBlur={saveEdit}
              returnKeyType="done"
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  icon: {
    fontSize: 22,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  meta: {
    fontSize: FONT_SMALL(),
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: P,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
    fontWeight: '700',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  editField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    fontSize: FONT_BODY(),
    textAlign: 'center',
    minWidth: 40,
  },
  editMul: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
});