import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, AppState, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, CheckCircle2, Wind, Activity, Brain, Play } from 'lucide-react-native';
import {
  FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, FONT_STAT_SECTION, FONT_BUTTON,
  EXERCISE_CATEGORIES, ALL_SPORTS, BODY_TAGS_PRESET, type BodyPlan, type BodyCheckin,
} from '@egoless-do/core';
import { PrimaryButton, OutlineButton, TagPill, Card } from '../../../components/UI';

// ── Types ──
type FlowStep = 'prepare' | 'practice' | 'breathing' | 'awareness' | 'summary';

interface FlowProps {
  TH: any;
  T: (key: string) => string;
  onExit: () => void;
  nav: any;
  todayPlan?: BodyPlan;
  store: any;
}

// ── Helpers ──
function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Step indicator ──
const STEPS: { key: FlowStep; icon: string; labelKey: string }[] = [
  { key: 'prepare', icon: '📋', labelKey: 'bodyFlowPrepare' },
  { key: 'practice', icon: '🏃', labelKey: 'bodyFlowPractice' },
  { key: 'breathing', icon: '🌬️', labelKey: 'bodyFlowBreathing' },
  { key: 'awareness', icon: '🧠', labelKey: 'bodyFlowAwareness' },
  { key: 'summary', icon: '✅', labelKey: 'bodyFlowSummary' },
];

function StepIndicator({ current, TH, T }: { current: FlowStep; TH: any; T: (key: string) => string }) {
  const currentIdx = STEPS.findIndex(s => s.key === current);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <View style={{
              width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? '#f59e0b' : done ? '#10b981' : TH.card,
              borderWidth: active || done ? 0 : 1, borderColor: TH.border,
            }}>
              <Text style={{ fontSize: 14 }}>{done ? '✓' : step.icon}</Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={{ width: 20, height: 2, backgroundColor: done ? '#10b981' : TH.border }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Exercise category picker (inline) ──
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

// ── BodyCheckinInline (inline awareness form) ──
function BodyCheckinInline({ TH, T, plan, onSave, onSkip }: {
  TH: any; T: (key: string) => string;
  plan?: BodyPlan;
  onSave: (data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => void;
  onSkip: () => void;
}) {
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(1);
  const [comfort, setComfort] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const allTags = BODY_TAGS_PRESET.flatMap(g => g.tags);

  const handleSave = () => {
    onSave({
      date: new Date().toISOString().slice(0, 10),
      energy, pain, comfort, sleep: sleepQuality,
      tags: selectedTags, note: note || undefined,
    });
  };

  const renderSlider = (label: string, value: number, onChange: (v: number) => void, lowLabel: string, highLabel: string) => (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{label}</Text>
        <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#f59e0b' }}>{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <TouchableOpacity key={v} onPress={() => onChange(v)}
            style={{
              flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: v === value ? '#f59e0b' : TH.card,
              borderWidth: v === value ? 0 : 1, borderColor: TH.border,
            }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: v === value ? '700' : '400', color: v === value ? '#fff' : TH.text }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{lowLabel}</Text>
        <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{highLabel}</Text>
      </View>
    </View>
  );

  return (
    <View>
      {plan && (
        <View style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('bodyFlowPrepare')}</Text>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginTop: 4 }}>
            {plan.part} {plan.note ? `— ${plan.note}` : ''}
          </Text>
        </View>
      )}

      {renderSlider(T('bodyEnergy') || '精力', energy, setEnergy, '低', '高')}
      {renderSlider(T('bodyPain') || '疼痛', pain, setPain, '无痛', '剧痛')}
      {renderSlider(T('bodyComfort') || '舒适', comfort, setComfort, '不适', '舒适')}
      {renderSlider(T('bodySleepQuality') || '睡眠', sleepQuality, setSleepQuality, '差', '好')}

      <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('bodyTags') || '标签'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {allTags.map(tag => (
          <TagPill key={tag} label={tag} active={selectedTags.includes(tag)}
            onPress={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            color="#f59e0b"
          />
        ))}
      </View>

      <TextInput
        style={{ backgroundColor: TH.card, borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, minHeight: 60, marginBottom: 16, textAlignVertical: 'top' }}
        placeholder={T('bodyCheckinNotePlaceholder') || '补充说明...'}
        placeholderTextColor={TH.sub}
        multiline maxLength={500}
        value={note} onChangeText={setNote}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <OutlineButton label={T('bodyFlowSkip')} onPress={onSkip} style={{ flex: 1 }} />
        <PrimaryButton label={T('bodySave')} onPress={handleSave} color="#f59e0b" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

// ── Main BodyFlow component ──
export default function BodyFlow({ TH, T, onExit, nav, todayPlan, store }: FlowProps) {
  const [step, setStep] = useState<FlowStep>('prepare');
  const [startTime] = useState(() => Date.now());
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [selectedSportKey, setSelectedSportKey] = useState<string | undefined>(todayPlan?.sportKey || todayPlan?.part);
  const [breathingCompleted, setBreathingCompleted] = useState(false);
  const [awarenessData, setAwarenessData] = useState<BodyCheckin | null>(null);
  const [practiceStartTime, setPracticeStartTime] = useState<number>(0);
  const [breathingStartTime, setBreathingStartTime] = useState<number>(0);
  const [breathingDuration, setBreathingDuration] = useState<number>(0);
  const [totalElapsed, setTotalElapsed] = useState<number>(0);

  const appStateRef = useRef(AppState.currentState);
  const practiceNavRef = useRef(false);
  const breathingNavRef = useRef(false);

  // Detect return from SportPage
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // Returning to app after navigating to Sport
      if (practiceNavRef.current && prev.match(/inactive|background/) && nextState === 'active') {
        practiceNavRef.current = false;
        setPracticeCompleted(true);
        setPracticeStartTime(Date.now() - (practiceStartTime || Date.now()));
      }
      // Returning from Breathing
      if (breathingNavRef.current && prev.match(/inactive|background/) && nextState === 'active') {
        breathingNavRef.current = false;
        setBreathingCompleted(true);
        setBreathingDuration(Date.now() - breathingStartTime);
      }
    });
    return () => sub.remove();
  }, [practiceStartTime, breathingStartTime]);

  // Also track focus changes (when navigating back from Sport/Breathing within app)
  useEffect(() => {
    const unsubscribe = nav.addListener?.('focus', () => {
      if (practiceNavRef.current) {
        practiceNavRef.current = false;
        setPracticeCompleted(true);
      }
      if (breathingNavRef.current) {
        breathingNavRef.current = false;
        setBreathingCompleted(true);
      }
    });
    return unsubscribe;
  }, [nav]);

  // ── Exit confirmation ──
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

  // ── Navigate to Sport ──
  const navigateToSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    practiceNavRef.current = true;
    setPracticeStartTime(Date.now());
    (nav as any).navigate('Sport', {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    });
  }, [nav]);

  // ── Navigate to Breathing ──
  const navigateToBreathing = useCallback(() => {
    breathingNavRef.current = true;
    setBreathingStartTime(Date.now());
    (nav as any).navigate('Breathing' as never);
  }, [nav]);

  // ── Resolve sport info for display ──
  const sportInfo = useMemo(() => {
    if (!selectedSportKey) return null;
    return ALL_SPORTS.find(s => s.key === selectedSportKey || s.keyEn === selectedSportKey)
      ?? EXERCISE_CATEGORIES.find(c => c.key === selectedSportKey);
  }, [selectedSportKey]);

  // Capture total elapsed time once when entering summary
  useEffect(() => {
    if (step === 'summary' && totalElapsed === 0) {
      setTotalElapsed(Date.now() - startTime);
    }
  }, [step, totalElapsed, startTime]);

  // ── Prepare step ──
  if (step === 'prepare') {
    return (
      <View>
        {/* Close button */}
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>

        <StepIndicator current="prepare" TH={TH} T={T} />

        {/* Gradient header */}
        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🏃</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginBottom: 4 }}>{T('bodyStartFlow') || '开始调身练习'}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)' }}>{T('bodyFlowPrepare') || '准备阶段'}</Text>
          </LinearGradient>
        </View>

        {/* Today's plan */}
        {todayPlan && todayPlan.part && todayPlan.part !== 'rest' ? (
          <Card>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('bodyFlowChooseExercise') || '今日方案'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 28 }}>{sportInfo?.icon ?? '🏋️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>
                  {sportInfo && 'i18nKey' in sportInfo ? T((sportInfo as any).i18nKey) : todayPlan.part}
                </Text>
                {todayPlan.note && <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{todayPlan.note}</Text>}
              </View>
            </View>
          </Card>
        ) : todayPlan && todayPlan.part === 'rest' ? (
          <Card>
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>😴</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, textAlign: 'center', fontWeight: '600' }}>{T('bodyDayRest') || '今日休息'}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('bodyPlanNotSet') || '可选择其他运动'}</Text>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{T('bodyPlanNotSet') || '未设置今日方案'}</Text>
          </Card>
        )}

        <PrimaryButton
          label={T('bodyFlowStartBreathing') || '开始练习'}
          onPress={() => {
            if (todayPlan && todayPlan.part && todayPlan.part !== 'rest') {
              setStep('practice');
            } else {
              // No plan or rest day - show picker inline
              setStep('practice');
            }
          }}
          color="#f59e0b"
          icon={<Play size={18} color="#fff" />}
        />
      </View>
    );
  }

  // ── Practice step ──
  if (step === 'practice') {
    return (
      <View>
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>

        <StepIndicator current="practice" TH={TH} T={T} />

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Activity size={22} color="#f59e0b" />
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('bodyFlowPractice') || '运动练习'}</Text>
          </View>

          {practiceCompleted ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <CheckCircle2 size={48} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10b981', marginTop: 8 }}>
                {T('bodyFlowPracticeDone') || '运动已完成'}
              </Text>
            </View>
          ) : todayPlan && todayPlan.part && todayPlan.part !== 'rest' && selectedSportKey ? (
            <>
              {/* Show plan info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Text style={{ fontSize: 28 }}>{sportInfo?.icon ?? '🏋️'}</Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {sportInfo && 'i18nKey' in sportInfo ? T((sportInfo as any).i18nKey) : todayPlan.part}
                </Text>
              </View>

              <PrimaryButton
                label={T('bodyFlowStartBreathing') || '开始运动'}
                onPress={() => navigateToSport(selectedSportKey)}
                color="#f59e0b"
                icon={<Play size={18} color="#fff" />}
              />
              <View style={{ height: 8 }} />
              <OutlineButton
                label={T('bodyFlowChooseExercise') || '自选运动'}
                onPress={() => setSelectedSportKey(undefined)}
                color="#f59e0b"
              />
            </>
          ) : (
            /* Exercise picker */
            <>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('bodyFlowChooseExercise') || '选择运动'}</Text>
              <ExercisePicker TH={TH} T={T} onSelect={(key) => {
                setSelectedSportKey(key);
                navigateToSport(key);
              }} />
            </>
          )}
        </Card>

        {/* Bottom buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {practiceCompleted ? (
            <PrimaryButton
              label={T('bodyFlowBreathing') || '下一步: 调息'}
              onPress={() => setStep('breathing')}
              color="#10b981"
              icon={<ChevronRight size={18} color="#fff" />}
              style={{ flex: 1 }}
            />
          ) : (
            <OutlineButton
              label={T('bodyFlowSkip') || '跳过'}
              onPress={() => { setPracticeCompleted(false); setStep('breathing'); }}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    );
  }

  // ── Breathing step ──
  if (step === 'breathing') {
    return (
      <View>
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>

        <StepIndicator current="breathing" TH={TH} T={T} />

        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <LinearGradient colors={['#06b6d4', '#0891b2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
            <Wind size={40} color="#fff" />
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4 }}>{T('bodyFlowBreathing') || '调息安神'}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)' }}>
              {breathingCompleted
                ? `${T('bodyFlowBreathingTime') || '调息时长'}: ${Math.floor(breathingDuration / 60000)}${T('bodyMin') || '分钟'}`
                : T('bodyFlowBreathingHint') || '深呼吸，放松身心'}
            </Text>
          </LinearGradient>
        </View>

        {breathingCompleted ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <CheckCircle2 size={40} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10b981', marginTop: 8 }}>
                {T('bodyFlowBreathingDone') || '调息已完成'}
              </Text>
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, textAlign: 'center', lineHeight: 22 }}>
              {T('bodyFlowBreathingDesc') || '运动后调息有助于恢复身心平衡，提升觉知力。'}
            </Text>
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!breathingCompleted && (
            <>
              <PrimaryButton
                label={T('bodyFlowStartBreathing') || '开始调息'}
                onPress={navigateToBreathing}
                color="#06b6d4"
                icon={<Wind size={18} color="#fff" />}
                style={{ flex: 1 }}
              />
              <OutlineButton
                label={T('bodyFlowSkip') || '跳过'}
                onPress={() => { setBreathingCompleted(false); setStep('awareness'); }}
                color="#06b6d4"
                style={{ flex: 1 }}
              />
            </>
          )}
          {breathingCompleted && (
            <PrimaryButton
              label={T('bodyFlowAwareness') || '下一步: 觉知'}
              onPress={() => setStep('awareness')}
              color="#8b5cf6"
              icon={<ChevronRight size={18} color="#fff" />}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    );
  }

  // ── Awareness step ──
  if (step === 'awareness') {
    return (
      <View>
        <TouchableOpacity onPress={handleExitPress} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>

        <StepIndicator current="awareness" TH={TH} T={T} />

        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
            <Brain size={40} color="#fff" />
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 12 }}>{T('bodyFlowAwareness') || '身体觉知'}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{T('bodyFlowAwarenessHint') || '记录练习后的身体感受'}</Text>
          </LinearGradient>
        </View>

        {awarenessData ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <CheckCircle2 size={40} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10b981', marginTop: 8 }}>
                {T('bodyFlowAwarenessSaved') || '觉知记录已保存'}
              </Text>
            </View>
          </Card>
        ) : (
          <Card>
            <BodyCheckinInline
              TH={TH} T={T} plan={todayPlan}
              onSave={(data) => {
                const checkin: BodyCheckin = {
                  ...data,
                  id: `checkin_${Date.now()}`,
                  updatedAt: Date.now(),
                  deleted: false,
                  synced: false,
                };
                store.upsertBodyCheckin?.(checkin) ?? store.addBodyCheckin?.(checkin);
                setAwarenessData(checkin);
                setStep('summary');
              }}
              onSkip={() => setStep('summary')}
            />
          </Card>
        )}

        {awarenessData && (
          <PrimaryButton
            label={T('bodyFlowSummary') || '查看总结'}
            onPress={() => setStep('summary')}
            color="#8b5cf6"
            icon={<ChevronRight size={18} color="#fff" />}
          />
        )}
      </View>
    );
  }

  // ── Summary step ──
  return (
    <View>
      <TouchableOpacity onPress={onExit} style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 8 }}>
        <X size={24} color={TH.sub} />
      </TouchableOpacity>

      <StepIndicator current="summary" TH={TH} T={T} />

      <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
          <CheckCircle2 size={48} color="#fff" />
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 12 }}>{T('bodyFlowSummary') || '练习总结'}</Text>
        </LinearGradient>
      </View>

      <Card>
        {/* Total time */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('bodyFlowTotalTime') || '总耗时'}</Text>
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#f59e0b' }}>{formatElapsed(totalElapsed)}</Text>
        </View>

        {/* Practice status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 20 }}>{practiceCompleted ? '✅' : '⏭️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('bodyFlowPractice') || '运动'}</Text>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: practiceCompleted ? '#10b981' : TH.sub }}>
            {practiceCompleted ? (T('bodyFlowDone') || '已完成') : (T('bodyFlowSkipped') || '已跳过')}
          </Text>
        </View>

        {/* Breathing status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 20 }}>{breathingCompleted ? '✅' : '⏭️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('bodyFlowBreathing') || '调息'}</Text>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: breathingCompleted ? '#10b981' : TH.sub }}>
            {breathingCompleted
              ? `${Math.floor(breathingDuration / 60000)}${T('bodyMin') || '分钟'}`
              : (T('bodyFlowSkipped') || '已跳过')}
          </Text>
        </View>

        {/* Awareness scores */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Text style={{ fontSize: 20 }}>{awarenessData ? '✅' : '⏭️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('bodyFlowAwareness') || '觉知'}</Text>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: awarenessData ? '#10b981' : TH.sub }}>
            {awarenessData ? (T('bodyFlowRecorded') || '已记录') : (T('bodyFlowSkipped') || '已跳过')}
          </Text>
        </View>

        {awarenessData && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            {[
              { label: T('bodyEnergy'), value: awarenessData.energy, color: '#f59e0b' },
              { label: T('bodyPain'), value: awarenessData.pain, color: '#ef4444' },
              { label: T('bodyComfort'), value: awarenessData.comfort, color: '#10b981' },
              { label: T('bodySleepQuality'), value: awarenessData.sleep, color: '#3b82f6' },
            ].map(item => (
              <View key={item.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <PrimaryButton
        label={T('bodyFlowFinish') || '完成'}
        onPress={onExit}
        color="#10b981"
        icon={<CheckCircle2 size={18} color="#fff" />}
      />
    </View>
  );
}
