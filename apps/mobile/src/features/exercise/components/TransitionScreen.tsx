// ─── TransitionScreen ────────────────────────────────────────────
// 动作间过渡页：显示当前动作完成摘要 + 休息倒计时 + 下一动作预览
// 组合锻炼（combo workout）动作切换时使用

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, scaleFontSize, type ExerciseDef, type Theme } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronRight, SkipForward } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  currentExercise: ExerciseDef;
  currentDuration: number;
  nextExercise: ExerciseDef | null;
  restSec: number;
  onSkipRest: () => void;
  onNext: () => void;
  onFinishAll: () => void;
  TH: Theme;
  T: (key: string, params?: Record<string, string | number>) => string;
}

export default function TransitionScreen({
  currentExercise, currentDuration, nextExercise, restSec,
  onSkipRest, onNext, onFinishAll, TH, T,
}: Props) {
  const insets = useSafeAreaInsets();
  const [restRemaining, setRestRemaining] = useState(restSec);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef(false);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    setRestRemaining(restSec);
    restTimerRef.current = setInterval(() => {
      setRestRemaining(prev => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restSec]);

  // 倒计时到 0 自动推进
  useEffect(() => {
    if (restRemaining === 0 && restTimerRef.current) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (!autoAdvanceRef.current) {
        autoAdvanceRef.current = true;
        onNextRef.current();
      }
    }
  }, [restRemaining]);

  const handleSkipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    autoAdvanceRef.current = true;
    onSkipRest();
  }, [onSkipRest]);

  const isAllDone = !nextExercise;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: `${TH.primary}15` }]}>
      {/* Current exercise summary */}
      <View style={[styles.summaryCard, { backgroundColor: TH.card }]}>
        <View style={styles.summaryHeader}>
          <CheckCircle2 size={28} color="#10b981" />
          <Text style={[styles.summaryTitle, { color: TH.text }]}>
            {T('bodyExerciseComplete')}
          </Text>
        </View>
        <View style={styles.summaryDetail}>
          <Text style={styles.summaryIcon}>{currentExercise.icon}</Text>
          <Text style={[styles.summaryName, { color: TH.text }]}>
            {currentExercise.nameI18nKey ? T(currentExercise.nameI18nKey) : currentExercise.nameZh}
          </Text>
          <Text style={[styles.summaryTime, { color: TH.sub }]}>
            {Math.floor(currentDuration / 60)}:{String(currentDuration % 60).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Rest countdown */}
      {!isAllDone && (
        <View style={[styles.restCard, { backgroundColor: TH.card }]}>
          <Text style={[styles.restLabel, { color: TH.sub }]}>
            {T('bodyRestCountdown')}
          </Text>
          <Text style={[styles.restTimer, { color: TH.text }]}>
            {restRemaining}
          </Text>
          <TouchableOpacity onPress={handleSkipRest} style={styles.skipBtn}>
            <SkipForward size={16} color={TH.primary} />
            <Text style={[styles.skipText, { color: TH.primary }]}>
              {T('bodySkipRest')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next exercise preview */}
      {isAllDone ? (
        <View style={[styles.nextCard, { backgroundColor: TH.card }]}>
          <Text style={[styles.nextLabel, { color: TH.sub }]}>
            {T('bodyAllDone')}
          </Text>
          <Text style={[styles.nextHint, { color: TH.sub, marginBottom: 16 }]}>
            {T('bodyComboCompleteHint')}
          </Text>
          <TouchableOpacity onPress={onFinishAll} style={styles.finishBtn}>
            <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.finishGradient}>
              <Text style={styles.finishText}>
                {T('bodyFinish')}
              </Text>
              <ChevronRight size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.nextCard, { backgroundColor: TH.card }]}>
          <Text style={[styles.nextLabel, { color: TH.sub }]}>
            {T('bodyNextExercise')}
          </Text>
          <View style={styles.nextDetail}>
            <Text style={styles.nextIcon}>{nextExercise.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextName, { color: TH.text }]}>
                {nextExercise.nameI18nKey ? T(nextExercise.nameI18nKey) : nextExercise.nameZh}
              </Text>
              {(nextExercise.defaultSets && nextExercise.defaultReps) ? (
                <Text style={[styles.nextMeta, { color: TH.sub }]}>
                  {T('bodyComboSetsReps', { sets: nextExercise.defaultSets, reps: nextExercise.defaultReps })}
                </Text>
              ) : nextExercise.defaultDurationSec ? (
                <Text style={[styles.nextMeta, { color: TH.sub }]}>
                  {T('bodyComboMinutes', { min: Math.round(nextExercise.defaultDurationSec / 60) })}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={onNext} style={styles.nextBtn}>
            <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGradient}>
              <Text style={styles.nextBtnText}>
                {T('bodyStartNext')}
              </Text>
              <ChevronRight size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  summaryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    fontSize: scaleFontSize(32),
  },
  summaryName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    flex: 1,
  },
  summaryTime: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
  restCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  restLabel: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
    marginBottom: 8,
  },
  restTimer: {
    fontSize: scaleFontSize(48),
    fontWeight: '800',
    marginBottom: 12,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  skipText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  nextCard: {
    borderRadius: 16,
    padding: 20,
  },
  nextLabel: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
    marginBottom: 12,
  },
  nextDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  nextIcon: {
    fontSize: scaleFontSize(28),
  },
  nextName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  nextMeta: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  nextHint: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
  },
  nextBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  nextBtnText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    color: '#fff',
  },
  finishBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  finishText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    color: '#fff',
  },
});