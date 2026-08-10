import { FONT_BACK, FONT_BODY, FONT_SUB, FONT_HERO, FONT_STAT_SECTION, fmt, TARGET_PRESETS, getSoftTarget } from '@egoless-do/core';
import type { ExerciseEntry } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import type { ExercisePageProps } from './types';

export default function PrepPage(props: ExercisePageProps) {
  const {
    sportName, sportType, bg, mode, setMode, targetType, setTargetType, targetValue, setTargetValue,
    breathGuideEnabled, setBreathGuideEnabled, isMeditative,
    handleGo, onGoBack, exerciseLog, T, TH,
    musicTrack, onPressMusic,
  } = props;

  const presets: Record<string, Array<{ label: string; labelEn: string; value: number }> | undefined> = TARGET_PRESETS[sportType] ?? {};
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [customTargetValue, setCustomTargetValue] = useState<Record<string, number>>({});
  const isCustomActive = (t: string) => !!customTargetValue[t] && !presets[t]?.some((p: { value: number }) => p.value === targetValue);

  const modeLabels = {
    free: sportType === 'repetition' ? T('exerciseFreeReps') : sportType === 'timed' ? T('exerciseFreeSport') : T('exerciseFreeRun'),
    target: sportType === 'repetition' ? T('exerciseTargetReps') : sportType === 'timed' ? T('exerciseTargetSport') : T('exerciseTargetRun'),
  };

  const targetTypeLabels: Record<string, string> = {
    distance: T('exerciseDistanceGoal'),
    time: T('exerciseTimeGoal'),
    calories: T('exerciseCalGoal'),
    reps: T('exerciseRepsGoal'),
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: bg }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{sportName}</Text>
          <TouchableOpacity onPress={onGoBack}>
            <X size={22} color="rgba(255,255,255,.9)" />
          </TouchableOpacity>
        </View>

        {/* Music selector — inline compact */}
        <View style={styles.musicBar}>
          <TouchableOpacity onPress={onPressMusic} style={styles.musicBarButton}>
            <Text style={[styles.musicBarText, { color: musicTrack ? '#fff' : 'rgba(255,255,255,.6)' }]}>
              {musicTrack ? `🎵 ${musicTrack.name}` : `🎵 ${T('exerciseAddMusic')}`}
            </Text>
            <Text style={styles.musicBarArrow}>▸</Text>
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(['free', 'target'] as const).map(m => (
            <TouchableOpacity key={m} onPress={() => setMode(m)}
              style={mode === m ? styles.modeOptionActive : styles.modeOptionInactive}>
              <Text style={{ color: '#fff', fontWeight: mode === m ? '700' : '400', fontSize: FONT_BODY() }}>
                {modeLabels[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target selection */}
        {mode === 'target' && (
          <View style={styles.targetSection}>
            <View style={styles.targetTypeRow}>
              {availableTargetTypes.map(t => (
                <TouchableOpacity key={t} onPress={() => { setTargetType(t); setTargetValue(presets[t]?.[0]?.value ?? 0); setShowCustomInput(false); setCustomInputValue(''); }}
                  style={targetType === t ? styles.targetTypePillActive : styles.targetTypePillInactive}>
                  <Text style={{ color: '#fff', fontSize: FONT_SUB(), fontWeight: targetType === t ? '700' : '400' }}>
                    {targetTypeLabels[t] ?? t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.presetRow}>
              {(presets[targetType as keyof typeof presets] ?? []).map((p: { label: string; value: number }) => (
                <TouchableOpacity key={p.label} onPress={() => { setTargetValue(p.value); setShowCustomInput(false); setCustomInputValue(''); setCustomTargetValue(v => { const n = { ...v }; delete n[targetType]; return n; }); }}
                  style={targetValue === p.value ? styles.presetPillActive : styles.presetPillInactive}>
                  <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: targetValue === p.value ? '700' : '400' }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              {(targetType === 'time' || targetType === 'calories') && (() => {
                const customActive = isCustomActive(targetType);
                const customLabel = customActive
                  ? (targetType === 'time' ? `${customTargetValue[targetType] / 60} ${T('exerciseMin')}` : `${customTargetValue[targetType]} kcal`)
                  : T('exerciseCustom');
                return (
                  <TouchableOpacity onPress={() => {
                    if (customActive) {
                      setShowCustomInput(false);
                      setCustomInputValue('');
                      setCustomTargetValue(v => { const n = { ...v }; delete n[targetType]; return n; });
                      const firstPreset = presets[targetType]?.[0]?.value ?? 0;
                      setTargetValue(firstPreset);
                    } else {
                      setShowCustomInput(v => !v);
                    }
                  }}
                    style={customActive || showCustomInput ? styles.presetPillActive : styles.presetPillInactive}>
                    <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: customActive || showCustomInput ? '700' : '400' }}>{customLabel}</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
            {showCustomInput && (targetType === 'time' || targetType === 'calories') && (
              <View style={styles.customInputRow}>
                <TextInput
                  value={customInputValue}
                  onChangeText={setCustomInputValue}
                  keyboardType="numeric"
                  placeholder={targetType === 'time' ? '30' : '200'}
                  placeholderTextColor="rgba(255,255,255,.7)"
                  style={styles.customInput}
                />
                <Text style={styles.customUnitLabel}>
                  {targetType === 'time' ? T('exerciseMin') : 'kcal'}
                </Text>
                <TouchableOpacity onPress={() => {
                  const num = parseFloat(customInputValue);
                  if (isNaN(num) || num <= 0) {
                    Alert.alert('', T('exerciseCustomInvalid'));
                    return;
                  }
                  const finalValue = targetType === 'time' ? Math.round(num * 60) : Math.round(num);
                  setTargetValue(finalValue);
                  setCustomTargetValue(v => ({ ...v, [targetType]: finalValue }));
                  setCustomInputValue('');
                  setShowCustomInput(false);
                }}
                  style={styles.customConfirmBtn}>
                  <Text style={styles.customConfirmText}>{T('commonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Breathing guide toggle (meditative sports) */}
        {isMeditative && (
          <TouchableOpacity onPress={() => setBreathGuideEnabled(v => !v)}
            style={styles.breathToggle}>
            <Text style={styles.breathToggleLabel}>{T('exerciseBreathGuide')}</Text>
            <View style={[styles.switchTrack, { backgroundColor: breathGuideEnabled ? (TH?.accent ?? '#18CEFF') : 'rgba(255,255,255,.2)' }]}>
              <View style={breathGuideEnabled ? styles.switchThumbOn : styles.switchThumbOff} />
            </View>
          </TouchableOpacity>
        )}

        {/* Soft target recommendation */}
        {mode === 'free' && (() => {
          const st = getSoftTarget(sportName);
          if (!st) return null;
          const label = st.unit === 'min' ? T('exerciseSoftTargetMin').replace('{n}', String(st.intermediate)) : T('exerciseSoftTargetReps').replace('{n}', String(st.intermediate));
          return (
            <View style={styles.softTargetCard}>
              <Text style={styles.softTargetText}>{label}</Text>
            </View>
          );
        })()}

        {/* Last workout data */}
        {(() => {
          const lastEntry = exerciseLog?.filter((e: ExerciseEntry) => !e.deleted && e.sportKey === sportName).slice(-1)[0];
          if (!lastEntry) return null;
          return (
            <View style={styles.lastWorkoutCard}>
              <Text style={styles.lastWorkoutText}>
                {T('exerciseLastTime')} {lastEntry.durationSec ? fmt(lastEntry.durationSec) : ''}{lastEntry.reps ? ` · ${lastEntry.reps} ${T('exerciseReps')}` : ''}{lastEntry.calories ? ` · ${lastEntry.calories}kcal` : ''}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Centered circle + GO button */}
      <View style={styles.goSection}>
        <View style={styles.circle}>
          {sportType === 'repetition' ? (
            <>
              <Text style={styles.circleValue}>0</Text>
              <Text style={styles.circleUnit}>{T('exerciseReps')}</Text>
            </>
          ) : sportType === 'timed' ? (
            <>
              <Text style={styles.circleValue}>0:00</Text>
              <Text style={styles.circleUnit}>{T('exerciseMin')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.circleValue}>0.00</Text>
              <Text style={styles.circleUnit}>km</Text>
            </>
          )}
        </View>

        <TouchableOpacity onPress={handleGo}
          style={styles.goButton}>
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '900', color: bg, letterSpacing: 4 }}>GO</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FONT_BACK(),
    fontWeight: '700',
    color: '#fff',
  },
  musicBar: {
    marginTop: 10,
  },
  musicBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.12)',
  },
  musicBarText: {
    fontSize: FONT_SUB(),
  },
  musicBarArrow: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.4)',
  },
  modeToggle: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,.2)',
    borderRadius: 12,
    padding: 3,
  },
  modeOptionActive: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.25)',
  },
  modeOptionInactive: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  targetSection: {
    marginTop: 16,
  },
  targetTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  targetTypePillActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.7)',
  },
  targetTypePillInactive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.1)',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetPillActive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.7)',
  },
  presetPillInactive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.1)',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.15)',
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: FONT_BODY(),
  },
  customUnitLabel: {
    color: 'rgba(255,255,255,.7)',
    fontSize: FONT_SUB(),
  },
  customConfirmBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customConfirmText: {
    color: '#fff',
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },
  breathToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.08)',
  },
  breathToggleLabel: {
    color: 'rgba(255,255,255,.9)',
    fontSize: FONT_BODY(),
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumbOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  softTargetCard: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  softTargetText: {
    color: 'rgba(255,255,255,.8)',
    fontSize: FONT_SUB(),
  },
  lastWorkoutCard: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  lastWorkoutText: {
    color: 'rgba(255,255,255,.8)',
    fontSize: FONT_SUB(),
  },
  goSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  circleValue: {
    fontSize: FONT_HERO(),
    fontWeight: '900',
    color: '#fff',
  },
  circleUnit: {
    fontSize: FONT_SUB(),
    color: 'rgba(255,255,255,.8)',
    marginTop: 4,
  },
  goButton: {
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
