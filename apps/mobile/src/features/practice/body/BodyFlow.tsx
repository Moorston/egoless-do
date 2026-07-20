import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, ALL_SPORTS, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, SPORT_GROUPS, FONT_LABEL, FONT_STAT_SECTION, scaleFontSize,
  type BodyPlan, type BodyPlanTask, type BodyCheckin, type Theme, type BodySlice} from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, CheckCircle2, Wind, Activity } from 'lucide-react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated } from 'react-native';

import { PrimaryButton, OutlineButton, Card } from '../../../components/UI';

import BodyCheckinInline from './BodyCheckinInline';
import CheckinSuccessCard from './CheckinSuccessCard';
import { useBodyFlowState } from './hooks/useBodyFlowState';

type FlowStep = 'practice' | 'breathing' | 'checkin' | 'success';

interface FlowProps {
  TH: Theme;
  T: (key: string) => string;
  onExit: () => void;
  todayPlan?: BodyPlan;
  trainingPlanTask?: { planId: string; planName: string; task: BodyPlanTask } | null;
  store: Record<string, unknown> & Pick<BodySlice, 'upsertBodyCheckin'>;
  returnTick?: number;
  onGoToSport?: (sportKey: string) => void;
  onGoToBreathing?: () => void;
}

const STEPS = [
  { key: 'practice', color: '#f59e0b' },
  { key: 'breathing', color: '#06b6d4' },
  { key: 'checkin', color: '#8b5cf6' },
] as const;

const STEP_ICONS: Record<string, string> = {
  practice: '🏃',
  breathing: '🌬️',
  checkin: '🧠',
};

const TRANSITION_DURATION = 300;

function StepIndicator({ current, TH }: { current: FlowStep; TH: Theme }) {
  const currentIdx = current === 'success' ? STEPS.length : STEPS.findIndex(s => s.key === current);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <View style={{
              width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? step.color : done ? '#10b981' : TH.card,
              borderWidth: active || done ? 0 : 1, borderColor: TH.border,
            }}>
              <Text style={{ fontSize: FONT_SUB() }}>{done ? '✓' : STEP_ICONS[step.key]}</Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={{ width: 24, height: 2, backgroundColor: done ? '#10b981' : TH.border }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function ExercisePicker({ TH, T, onSelect }: { TH: Theme; T: (key: string) => string; onSelect: (key: string) => void }) {
  const groups = useMemo(() => {
    // 按 SPORT_GROUPS 分组展示具体运动（而非训练类别）
    return SPORT_GROUPS.map(g => ({
      label: T(g.group) !== g.group ? T(g.group) : g.group,
      items: g.items.map(s => ({ key: s.key, label: s.key, icon: s.icon })),
    })).filter(g => g.items.length > 0);
  }, [T]);

  return (
    <View style={{ marginTop: 12 }}>
      {groups.map(group => (
        <View key={group.label} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{group.label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {group.items.map(item => (
              <TouchableOpacity key={item.key} onPress={() => onSelect(item.key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                  borderWidth: 1, borderColor: TH.border, backgroundColor: TH.card,
                }}>
                <Text style={{ fontSize: FONT_LABEL() }}>{item.icon}</Text>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BodyFlow({ TH, T, onExit, todayPlan, trainingPlanTask, store, returnTick, onGoToSport, onGoToBreathing }: FlowProps) {
  const {
    flowState,
    setStep,
    markPracticeDone,
    markBreathingDone,
    saveAwareness,
    setSelectedSport,
    resetFlow,
  } = useBodyFlowState();

  // 单一状态源：优先使用 store，否则本地
  const step = flowState?.step ?? 'practice';
  const getInitialSportKey = () => {
    const raw = todayPlan?.sportKey || todayPlan?.part || trainingPlanTask?.task.sportKey;
    if (!raw) return undefined;
    // 中文描述 → 标准 key（如"胸+三头" → "chest_triceps"）
    return PART_STRING_TO_KEY[raw] ?? raw;
  };
  const [selectedSportKey, setSelectedSportKey] = useState<string | undefined>(getInitialSportKey);

  // Animation for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const transitioningRef = useRef(false);

  const transitionTo = useCallback((newStep: FlowStep) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: TRANSITION_DURATION / 2,
      useNativeDriver: true,
    }).start(() => {
      setStep(newStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: TRANSITION_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        transitioningRef.current = false;
      });
    });
  }, [fadeAnim, setStep]);

  const startTimeRef = useRef(0);
  const practiceStartRef = useRef(0);
  const breathingStartRef = useRef(0);
  const [practiceCompleted, setPracticeCompleted] = useState(flowState?.practiceCompleted ?? false);
  const [breathingCompleted, setBreathingCompleted] = useState(flowState?.breathingCompleted ?? false);
  const [breathingDurationMs, setBreathingDurationMs] = useState(flowState?.breathingDurationMs ?? 0);
  const [awarenessData, setAwarenessData] = useState<BodyCheckin | null>(flowState?.awarenessData ?? null);

  // Sync completed flags from flowState
  useEffect(() => {
    if (flowState) {
      if (flowState.practiceCompleted) setPracticeCompleted(true);
      if (flowState.breathingCompleted) { setBreathingCompleted(true); setBreathingDurationMs(flowState.breathingDurationMs); }
      if (flowState.awarenessData) setAwarenessData(flowState.awarenessData);
    }
  }, [flowState]);

  // Return detection (fallback — will be replaced by navigation params in R2.3)
  const prevReturnTick = useRef(returnTick);
  useEffect(() => {
    if (returnTick !== undefined && returnTick !== prevReturnTick.current) {
      prevReturnTick.current = returnTick;
      if (step === 'practice' && practiceStartRef.current > 0) {
        const durSec = Math.floor((Date.now() - practiceStartRef.current) / 1000);
        setPracticeCompleted(true);
        markPracticeDone(durSec);
      } else if (step === 'breathing' && breathingStartRef.current > 0) {
        const durMs = Date.now() - breathingStartRef.current;
        setBreathingCompleted(true);
        setBreathingDurationMs(durMs);
        markBreathingDone(durMs);
      }
    }
  }, [step, returnTick, markPracticeDone, markBreathingDone]);

  const handleExitPress = useCallback(() => {
    Alert.alert(
      T('bodyFlowExitConfirm') || '退出练习流程？',
      undefined,
      [
        { text: T('bodyCancel') || '取消', style: 'cancel' },
        { text: T('bodyFlowSkip') || '退出', style: 'destructive', onPress: () => { resetFlow(); onExit(); } },
      ]
    );
  }, [T, onExit, resetFlow]);

  const navigateToSport = useCallback((sportKey: string) => {
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    practiceStartRef.current = Date.now();
    setPracticeCompleted(false);
    setSelectedSportKey(sportKey);
    setSelectedSport(sportKey);
    onGoToSport?.(sportKey);
  }, [onGoToSport, setSelectedSport]);

  // 进入流程时重置计时 ref，避免旧值残留
  useEffect(() => {
    if (step === 'practice') {
      practiceStartRef.current = 0;
      breathingStartRef.current = 0;
    }
  }, [step]);

  const navigateToBreathing = useCallback(() => {
    breathingStartRef.current = Date.now();
    setBreathingCompleted(false);
    setBreathingDurationMs(0);
    onGoToBreathing?.();
  }, [onGoToBreathing]);

  const sportInfo = useMemo(() => {
    if (!selectedSportKey) return null;
    return ALL_SPORTS.find(s => s.key === selectedSportKey || s.keyEn === selectedSportKey)
      ?? EXERCISE_CATEGORIES.find(c => c.key === selectedSportKey);
  }, [selectedSportKey]);

  // ── Helper: resolve current plan info ──
  const currentPlan = useMemo(() => {
    if (trainingPlanTask) {
      return {
        name: trainingPlanTask.planName,
        sportKey: trainingPlanTask.task.sportKey,
        exercises: trainingPlanTask.task.exercises ?? [],
        isRest: trainingPlanTask.task.sportKey === 'rest',
      };
    }
    if (todayPlan?.part && todayPlan.part !== 'rest') {
      return {
        name: todayPlan.part,
        sportKey: todayPlan.sportKey ?? todayPlan.part,
        exercises: [] as BodyPlanTask['exercises'],
        isRest: false,
      };
    }
    return null;
  }, [trainingPlanTask, todayPlan]);

  const handleSaveCheckin = useCallback((data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => {
    store.upsertBodyCheckin(data);
    const checkinData: BodyCheckin = { ...data, id: '', updatedAt: Date.now(), deleted: false, synced: false };
    setAwarenessData(checkinData);
    saveAwareness(checkinData);
    transitionTo('success');
  }, [store, saveAwareness, transitionTo]);

  const handleSkipCheckin = useCallback(() => {
    setAwarenessData(null);
    saveAwareness(null);
    transitionTo('success');
  }, [saveAwareness, transitionTo]);

  // ── Render steps ──
  const renderStep = () => {
    if (step === 'success') {
      const totalMs = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0;
      return (
        <CheckinSuccessCard
          TH={TH} T={T}
          awarenessData={awarenessData}
          practiceCompleted={practiceCompleted}
          breathingCompleted={breathingCompleted}
          breathingDurationMs={breathingDurationMs}
          totalMs={totalMs}
          onFinish={() => { resetFlow(); onExit(); }}
        />
      );
    }

    if (step === 'practice') {
      const isTodayRestDay = todayPlan?.part === 'rest' || trainingPlanTask?.task.sportKey === 'rest';
      const hasTodayPlan = currentPlan !== null && !currentPlan.isRest;
      const activeSportKey = currentPlan?.sportKey ?? '';
      const planExercises = currentPlan?.exercises ?? [];

      return (
        <View>
          <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
          <StepIndicator current="practice" TH={TH} />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Activity size={22} color="#f59e0b" />
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyFlowPractice')}</Text>
            </View>
            {practiceCompleted ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <CheckCircle2 size={48} color="#10b981" />
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#10b981', marginTop: 8 }}>{T('bodyFlowPracticeDone')}</Text>
              </View>
            ) : hasTodayPlan ? (
              <>
                {trainingPlanTask && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{currentPlan?.name}</Text>
                    {planExercises.length > 0 ? (
                      planExercises.map((ex, i) => (
                        <View key={ex.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: `${TH.border}40`, marginBottom: 4 }}>
                          <Text style={{ fontSize: FONT_SMALL(), color: TH.text, flex: 1 }}>
                            {ex.icon} {ex.nameZh || ex.name}
                            {ex.defaultSets && ex.defaultReps ? `  ${ex.defaultSets}×${ex.defaultReps}` : ''}
                            {ex.defaultWeight ? `  ${ex.defaultWeight}kg` : ''}
                            {ex.defaultDurationSec ? `  ${Math.round(ex.defaultDurationSec / 60)}min` : ''}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('bodyPlanNoExercises')}</Text>
                    )}
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION() }}>{sportInfo && 'icon' in sportInfo ? (sportInfo as { icon: string }).icon : '🏋️'}</Text>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
                    {sportInfo && 'i18nKey' in sportInfo ? T((sportInfo as { i18nKey: string }).i18nKey) : todayPlan?.part ?? ''}
                  </Text>
                </View>
                <PrimaryButton
                  label={T('bodyFlowStartSport')}
                  onPress={() => {
                    const key = selectedSportKey || activeSportKey;
                    if (key) {
                      navigateToSport(key);
                    } else {
                      Alert.alert(T('bodyFlowChooseExercise') || '请先选择运动');
                    }
                  }}
                  color="#f59e0b"
                  icon={<Activity size={18} color="#fff" />}
                />
                <View style={{ height: 8 }} />
                <OutlineButton label={T('bodyFlowChooseExercise')} onPress={() => setSelectedSportKey(undefined)} color="#f59e0b" />
              </>
            ) : (
              <>
                {isTodayRestDay && (
                  <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', marginBottom: 12 }}>{T('bodyTodayPlanRest')}</Text>
                )}
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('bodyFlowChooseExercise')}</Text>
                <ExercisePicker TH={TH} T={T} onSelect={(key) => { setSelectedSportKey(key); navigateToSport(key); }} />
              </>
            )}
          </Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {practiceCompleted ? (
              <PrimaryButton label={T('bodyFlowBreathing')} onPress={() => transitionTo('breathing')} color="#10b981" icon={<ChevronRight size={18} color="#fff" />} style={{ flex: 1 }} />
            ) : (
              <OutlineButton label={T('bodyFlowSkip')} onPress={() => transitionTo('breathing')} style={{ flex: 1 }} />
            )}
          </View>
        </View>
      );
    }

    if (step === 'breathing') {
      return (
        <View>
          <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
          <StepIndicator current="breathing" TH={TH} />
          <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
            <LinearGradient colors={['#06b6d4', '#0891b2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
              <Wind size={40} color="#fff" />
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4 }}>{T('bodyFlowBreathing')}</Text>
              <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.8)' }}>
                {breathingCompleted
                  ? `${T('bodyFlowBreathingTime')}: ${Math.floor(breathingDurationMs / 60000)}${T('bodyMin') || '分钟'}`
                  : T('bodyFlowBreathingHint')}
              </Text>
            </LinearGradient>
          </View>
          {breathingCompleted ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <CheckCircle2 size={40} color="#10b981" />
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#10b981', marginTop: 8 }}>{T('bodyFlowBreathingDone')}</Text>
              </View>
            </Card>
          ) : (
            <Card>
              <Text style={{ fontSize: FONT_BODY(), color: TH.text, textAlign: 'center', lineHeight: 22 }}>{T('bodyFlowBreathingDesc')}</Text>
            </Card>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!breathingCompleted ? (
              <>
                <PrimaryButton label={T('bodyFlowStartBreathing')} onPress={navigateToBreathing} color="#06b6d4" icon={<Wind size={18} color="#fff" />} style={{ flex: 1 }} />
                <OutlineButton label={T('bodyFlowSkip')} onPress={() => transitionTo('checkin')} color="#06b6d4" style={{ flex: 1 }} />
              </>
            ) : (
              <PrimaryButton label={T('bodyFlowAwareness')} onPress={() => transitionTo('checkin')} color="#8b5cf6" icon={<ChevronRight size={18} color="#fff" />} style={{ flex: 1 }} />
            )}
          </View>
        </View>
      );
    }

    // step === 'checkin'
    return (
      <View>
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>
        <StepIndicator current="checkin" TH={TH} />
        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: scaleFontSize(40), marginBottom: 8 }}>🧠</Text>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff', marginTop: 4 }}>{T('bodyFlowAwareness')}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{T('bodyFlowAwarenessHint')}</Text>
          </LinearGradient>
        </View>
        <Card style={{ borderWidth: 0 }}>
          <BodyCheckinInline
            TH={TH} T={T} plan={todayPlan}
            onSave={handleSaveCheckin}
            onSkip={handleSkipCheckin}
          />
        </Card>
      </View>
    );
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {renderStep()}
    </Animated.View>
  );
}
