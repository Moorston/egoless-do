import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { FONT_BACK, FONT_BODY, FONT_SUB, FONT_HERO, FONT_STAT_SECTION, fmt, TARGET_PRESETS, getSoftTarget } from '@egoless-do/core';
import type { ExercisePageProps } from './types';

export default function PrepPage(props: ExercisePageProps) {
  const {
    sportName, sportType, bg, mode, setMode, targetType, setTargetType, targetValue, setTargetValue,
    breathGuideEnabled, setBreathGuideEnabled, isMeditative,
    handleGo, onGoBack, exerciseLog, T, TH,
  } = props;

  const presets = TARGET_PRESETS[sportType] ?? {};
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
      style={{ flex: 1, backgroundColor: bg }}
    >
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: FONT_BACK, fontWeight: '700', color: '#fff' }}>{sportName}</Text>
          <TouchableOpacity onPress={onGoBack}>
            <X size={22} color="rgba(255,255,255,.9)" />
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={{ flexDirection: 'row', marginTop: 24, backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 3 }}>
          {(['free', 'target'] as const).map(m => (
            <TouchableOpacity key={m} onPress={() => setMode(m)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === m ? 'rgba(255,255,255,.25)' : 'transparent', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: mode === m ? '700' : '400', fontSize: FONT_BODY }}>
                {modeLabels[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target selection */}
        {mode === 'target' && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {availableTargetTypes.map(t => (
                <TouchableOpacity key={t} onPress={() => { setTargetType(t); setTargetValue(presets[t]?.[0]?.value ?? 0); setShowCustomInput(false); setCustomInputValue(''); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: targetType === t ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                  <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: targetType === t ? '700' : '400' }}>
                    {targetTypeLabels[t] ?? t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(presets[targetType as keyof typeof presets] ?? []).map((p: { label: string; value: number }) => (
                <TouchableOpacity key={p.label} onPress={() => { setTargetValue(p.value); setShowCustomInput(false); setCustomInputValue(''); setCustomTargetValue(v => { const n = { ...v }; delete n[targetType]; return n; }); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: targetValue === p.value ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                  <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: targetValue === p.value ? '700' : '400' }}>{p.label}</Text>
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
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: customActive || showCustomInput ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                    <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: customActive || showCustomInput ? '700' : '400' }}>{customLabel}</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
            {showCustomInput && (targetType === 'time' || targetType === 'calories') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <TextInput
                  value={customInputValue}
                  onChangeText={setCustomInputValue}
                  keyboardType="numeric"
                  placeholder={targetType === 'time' ? '30' : '200'}
                  placeholderTextColor="rgba(255,255,255,.4)"
                  style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 14, color: '#fff', fontSize: FONT_BODY }}
                />
                <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SUB }}>
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
                  style={{ height: 44, paddingHorizontal: 18, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>{T('commonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Breathing guide toggle (meditative sports) */}
        {isMeditative && (
          <TouchableOpacity onPress={() => setBreathGuideEnabled(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.08)' }}>
            <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: FONT_BODY }}>{T('exerciseBreathGuide')}</Text>
            <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: breathGuideEnabled ? (TH?.accent ?? '#18CEFF') : 'rgba(255,255,255,.2)', padding: 2, justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: breathGuideEnabled ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Soft target recommendation */}
        {mode === 'free' && (() => {
          const st = getSoftTarget(sportName);
          if (!st) return null;
          const label = st.unit === 'min' ? T('exerciseSoftTargetMin').replace('{n}', String(st.intermediate)) : T('exerciseSoftTargetReps').replace('{n}', String(st.intermediate));
          return (
            <View style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
              <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: FONT_SUB }}>{label}</Text>
            </View>
          );
        })()}

        {/* Last workout data */}
        {(() => {
          const lastEntry = exerciseLog?.filter((e: any) => !e.deleted && e.sportKey === sportName).slice(-1)[0];
          if (!lastEntry) return null;
          return (
            <View style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
              <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: FONT_SUB }}>
                {T('exerciseLastTime')} {lastEntry.durationSec ? fmt(lastEntry.durationSec) : ''}{lastEntry.reps ? ` · ${lastEntry.reps} ${T('exerciseReps')}` : ''}{lastEntry.calories ? ` · ${lastEntry.calories}kcal` : ''}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Centered circle + GO button */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={{ width: 180, height: 180, borderRadius: 90, borderWidth: 4, borderColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          {sportType === 'repetition' ? (
            <>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{T('exerciseReps')}</Text>
            </>
          ) : sportType === 'timed' ? (
            <>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0:00</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{T('exerciseMin')}</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0.00</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>km</Text>
            </>
          )}
        </View>

        <TouchableOpacity onPress={handleGo}
          style={{ height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: bg, letterSpacing: 4 }}>GO</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
