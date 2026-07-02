import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, CheckCircle2, Wind, Activity } from 'lucide-react-native';
import {
  FONT_TITLE, FONT_BODY, FONT_SUB, ALL_SPORTS, EXERCISE_CATEGORIES,
  type BodyPlan, type BodyCheckin,
} from '@egoless-do/core';
import { PrimaryButton, OutlineButton, Card } from '../../../components/UI';
import BodyCheckinInline from './BodyCheckinInline';
import CheckinSuccessCard from './CheckinSuccessCard';

type FlowStep = 'practice' | 'breathing' | 'checkin' | 'success';

interface FlowProps {
  TH: any;
  T: (key: string) => string;
  onExit: () => void;
  todayPlan?: BodyPlan;
  store: any;
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

function StepIndicator({ current, TH }: { current: FlowStep; TH: any }) {
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
              <Text style={{ fontSize: 14 }}>{done ? '✓' : STEP_ICONS[step.key]}</Text>
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

function ExercisePicker({ TH, T, onSelect }: { TH: any; T: (key: string) => string; onSelect: (key: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; icon: string }[]>();
    for (const cat of EXERCISE_CATEGORIES) {
      const gk = cat.category || 'bodyCatModern';
      if (!map.has(gk)) map.set(gk, []);
      map.get(gk)!.push({ key: cat.key, label: T(cat.i18nKey), icon: cat.icon });
    }
    return [
      { label: T('bodyCatTraditional'), items: map.get('bodyCatTraditional') ?? [] },
      { label: T('bodyCatModern'), items: map.get('bodyCatModern') ?? [] },
    ];
  }, [T]);

  return (
    <View style={{ marginTop: 12 }}>
      {groups.map(group => (
        <View key={group.label} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{group.label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {group.items.map(item => (
              <TouchableOpacity key={item.key} onPress={() => onSelect(item.key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                  borderWidth: 1, borderColor: TH.border, backgroundColor: TH.card,
                }}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BodyFlow({ TH, T, onExit, todayPlan, store, returnTick, onGoToSport, onGoToBreathing }: FlowProps) {
  const [step, setStep] = useState<FlowStep>('practice');
  const startTimeRef = useRef(Date.now());
  const practiceStartRef = useRef(0);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const breathingStartRef = useRef(0);
  const [breathingCompleted, setBreathingCompleted] = useState(false);
  const [breathingDurationMs, setBreathingDurationMs] = useState(0);
  const [awarenessData, setAwarenessData] = useState<BodyCheckin | null>(null);
  const [selectedSportKey, setSelectedSportKey] = useState<string | undefined>(todayPlan?.sportKey || todayPlan?.part);

  const prevReturnTick = useRef(returnTick);
  useEffect(() => {
    if (returnTick !== undefined && returnTick !== prevReturnTick.current) {
      prevReturnTick.current = returnTick;
      if (step === 'practice' && practiceStartRef.current > 0) {
        setPracticeCompleted(true);
      } else if (step === 'breathing' && breathingStartRef.current > 0) {
        setBreathingCompleted(true);
        setBreathingDurationMs(Date.now() - breathingStartRef.current);
      }
    }
  }, [step, returnTick]);

  const handleExitPress = useCallback(() => {
    Alert.alert(
      T('bodyFlowExitConfirm') || '退出练习流程？',
      undefined,
      [
        { text: T('bodyCancel') || '取消', style: 'cancel' },
        { text: T('bodyFlowSkip') || '退出', style: 'destructive', onPress: onExit },
      ]
    );
  }, [T, onExit]);

  const navigateToSport = useCallback((sportKey: string) => {
    practiceStartRef.current = Date.now();
    setPracticeCompleted(false);
    onGoToSport?.(sportKey);
  }, [onGoToSport]);

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

  if (step === 'success') {
    const totalMs = Date.now() - startTimeRef.current;
    return (
      <CheckinSuccessCard
        TH={TH} T={T}
        awarenessData={awarenessData}
        practiceCompleted={practiceCompleted}
        breathingCompleted={breathingCompleted}
        breathingDurationMs={breathingDurationMs}
        totalMs={totalMs}
        onFinish={onExit}
      />
    );
  }

  if (step === 'practice') {
    const isTodayRestDay = todayPlan?.part === 'rest';
    const hasTodayPlan = !!todayPlan?.part && todayPlan.part !== 'rest';

    return (
      <View>
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>
        <StepIndicator current="practice" TH={TH} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Activity size={22} color="#f59e0b" />
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('bodyFlowPractice')}</Text>
          </View>
          {practiceCompleted ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <CheckCircle2 size={48} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10b981', marginTop: 8 }}>{T('bodyFlowPracticeDone')}</Text>
            </View>
          ) : hasTodayPlan ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Text style={{ fontSize: 28 }}>{sportInfo && 'icon' in sportInfo ? (sportInfo as any).icon : '🏋️'}</Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {sportInfo && 'i18nKey' in sportInfo ? T((sportInfo as any).i18nKey) : todayPlan!.part}
                </Text>
              </View>
              <PrimaryButton
                label={T('bodyFlowStartBreathing')}
                onPress={() => navigateToSport(selectedSportKey || todayPlan!.sportKey || todayPlan!.part)}
                color="#f59e0b"
                icon={<Activity size={18} color="#fff" />}
              />
              <View style={{ height: 8 }} />
              <OutlineButton label={T('bodyFlowChooseExercise')} onPress={() => setSelectedSportKey(undefined)} color="#f59e0b" />
            </>
          ) : (
            <>
              {isTodayRestDay && (
                <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 12 }}>{T('bodyTodayPlanRest')}</Text>
              )}
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('bodyFlowChooseExercise')}</Text>
              <ExercisePicker TH={TH} T={T} onSelect={(key) => { setSelectedSportKey(key); navigateToSport(key); }} />
            </>
          )}
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {practiceCompleted ? (
            <PrimaryButton label={T('bodyFlowBreathing')} onPress={() => setStep('breathing')} color="#10b981" icon={<ChevronRight size={18} color="#fff" />} style={{ flex: 1 }} />
          ) : (
            <OutlineButton label={T('bodyFlowSkip')} onPress={() => setStep('breathing')} style={{ flex: 1 }} />
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
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4 }}>{T('bodyFlowBreathing')}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)' }}>
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
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10b981', marginTop: 8 }}>{T('bodyFlowBreathingDone')}</Text>
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, textAlign: 'center', lineHeight: 22 }}>{T('bodyFlowBreathingDesc')}</Text>
          </Card>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!breathingCompleted ? (
            <>
              <PrimaryButton label={T('bodyFlowStartBreathing')} onPress={navigateToBreathing} color="#06b6d4" icon={<Wind size={18} color="#fff" />} style={{ flex: 1 }} />
              <OutlineButton label={T('bodyFlowSkip')} onPress={() => setStep('checkin')} color="#06b6d4" style={{ flex: 1 }} />
            </>
          ) : (
            <PrimaryButton label={T('bodyFlowAwareness')} onPress={() => setStep('checkin')} color="#8b5cf6" icon={<ChevronRight size={18} color="#fff" />} style={{ flex: 1 }} />
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
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🧠</Text>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 4 }}>{T('bodyFlowAwareness')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{T('bodyFlowAwarenessHint')}</Text>
        </LinearGradient>
      </View>
      <Card style={{ borderWidth: 0 }}>
        <BodyCheckinInline
          TH={TH} T={T} plan={todayPlan}
          onSave={(data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => {
            store.upsertBodyCheckin(data);
            setAwarenessData({ ...data, id: '', updatedAt: Date.now(), deleted: false, synced: false } as BodyCheckin);
            setStep('success');
          }}
          onSkip={() => {
            setAwarenessData(null);
            setStep('success');
          }}
        />
      </Card>
    </View>
  );
}
