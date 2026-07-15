import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, type BodyPlan, type DayOverride, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, type Theme, scaleFontSize, FONT_STAT_SECTION} from '@egoless-do/core';
import { Play, ChevronRight, RefreshCw, SkipForward, Settings, Edit3, Undo2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  todayPlan?: BodyPlan;
  todayWeekday: number;
  onStart: () => void;
  override?: DayOverride;
  hasOverride?: boolean;
  onSkip?: () => void;
  onUndoOverride?: () => void;
  onSwap?: () => void;
  onAdjust?: () => void;
  onEditPlan?: () => void;
}

function resolvePlanDisplay(plan: BodyPlan | undefined, T: (k: string) => string) {
  if (!plan || !plan.part) return null;
  const mappedKey = PART_STRING_TO_KEY[plan.part] ?? plan.part;
  const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
  if (cat) {
    return { icon: cat.icon, label: T(cat.i18nKey), isRest: mappedKey === 'rest' };
  }
  // Fallback: display raw string. Use the 'rest' key from EXERCISE_CATEGORIES
  // (category='', so it's in modern group) to detect rest day plans reliably.
  return { icon: plan.part === 'rest' ? undefined : '🏋️', label: plan.part, isRest: plan.part === 'rest' };
}

const WEEKDAY_LABELS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

export default function BodyTodayPlanCard({ TH, T, todayPlan, todayWeekday, onStart, override, hasOverride, onSkip, onUndoOverride, onSwap, onAdjust, onEditPlan }: Props) {
  const display = resolvePlanDisplay(todayPlan, T);
  const dayLabel = T(WEEKDAY_LABELS[todayWeekday - 1]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for start button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Rest day or no plan
  if (!display || display.isRest) {
    return (
      <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, alignItems: 'center' }}>
          {/* Override status bar (for skip overrides) */}
          {hasOverride && override?.type === 'skip' && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ef444415', paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FONT_SMALL(), color: '#ef4444' }}>{T('bodyOverrideSkip') || '已标记跳过'}</Text>
              {onUndoOverride && (
                <TouchableOpacity onPress={onUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Undo2 size={12} color="#ef4444" />
                  <Text style={{ fontSize: FONT_SMALL(), color: '#ef4444', fontWeight: '600' }}>{T('bodyUndo') || '撤销'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={{ fontSize: scaleFontSize(36), marginBottom: 8, marginTop: hasOverride && override?.type === 'skip' ? 16 : 0 }}>😴</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 4 }}>{T('bodyTodayPlanRest')}</Text>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{dayLabel}</Text>
          {/* Micro-adjust buttons for rest day */}
          {onSwap && (
            <TouchableOpacity onPress={onSwap} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f59e0b15', marginTop: 12 }}>
              <RefreshCw size={14} color="#f59e0b" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#f59e0b' }}>{T('bodySwapExercise') || '换动作'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Normal plan display
  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
      {/* Main today-plan card */}
      <View style={{ backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 0, overflow: 'hidden' }}>
        {/* Override status bar */}
        {hasOverride && override && (
          <View style={{ backgroundColor: override.type === 'skip' ? '#ef444415' : '#f59e0b15', paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FONT_SMALL(), color: override.type === 'skip' ? '#ef4444' : '#f59e0b' }}>
              {override.type === 'skip' ? (T('bodyOverrideSkip') || '已标记跳过')
                : override.type === 'swap' ? (T('bodyOverrideSwap') || '已换动作')
                : override.type === 'adjust' ? (T('bodyOverrideAdjust') || '已调整组数')
                : (T('bodyOverrideCustom') || '已自定义')}
              {override.note ? ` · ${override.note}` : ''}
            </Text>
            {onUndoOverride && (
              <TouchableOpacity onPress={onUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Undo2 size={12} color={override.type === 'skip' ? '#ef4444' : '#f59e0b'} />
                <Text style={{ fontSize: FONT_SMALL(), color: override.type === 'skip' ? '#ef4444' : '#f59e0b', fontWeight: '600' }}>{T('bodyUndo') || '撤销'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Header stripe */}
        <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: FONT_SUB() }}>📋</Text>
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: '#fff' }}>{T('bodyTodayPlan')}</Text>
          </View>
          <Text style={{ fontSize: FONT_BADGE(), color: 'rgba(255,255,255,.85)' }}>{dayLabel}</Text>
        </View>

        {/* Body */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f59e0b20', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION() }}>{display.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text }}>{display.label}</Text>
              {todayPlan?.note ? (
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }} numberOfLines={1}>{todayPlan.note}</Text>
              ) : (
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>{T('bodyToday')}</Text>
              )}
            </View>
          </View>

          {/* Micro-adjust buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {onSwap && (
              <TouchableOpacity onPress={onSwap} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f59e0b12' }}>
                <RefreshCw size={12} color="#f59e0b" />
                <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b', fontWeight: '600' }}>{T('bodySwapExercise') || '换动作'}</Text>
              </TouchableOpacity>
            )}
            {onSkip && (
              <TouchableOpacity onPress={() => {
                Alert.alert(T('bodySkipConfirm') || '跳过今天', T('bodySkipConfirmMsg') || '确定跳过今天的训练？', [
                  { text: T('cancel') || '取消', style: 'cancel' },
                  { text: T('bodySkip') || '跳过', style: 'destructive', onPress: onSkip },
                ]);
              }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef444412' }}>
                <SkipForward size={12} color="#ef4444" />
                <Text style={{ fontSize: FONT_SMALL(), color: '#ef4444', fontWeight: '600' }}>{T('bodySkip') || '跳过'}</Text>
              </TouchableOpacity>
            )}
            {onAdjust && (
              <TouchableOpacity onPress={onAdjust} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#6366f1' + '12' }}>
                <Settings size={12} color="#6366f1" />
                <Text style={{ fontSize: FONT_SMALL(), color: '#6366f1', fontWeight: '600' }}>{T('bodyAdjust') || '调整'}</Text>
              </TouchableOpacity>
            )}
            {onEditPlan && (
              <TouchableOpacity onPress={onEditPlan} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: TH.border + '60' }}>
                <Edit3 size={12} color={TH.sub} />
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, fontWeight: '600' }}>{T('bodyPlanEdit') || '编辑计划'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={onStart} activeOpacity={0.85}
            style={{ backgroundColor: '#f59e0b', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Play size={20} color="#fff" />
            </Animated.View>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyStartToday')}</Text>
          </TouchableOpacity>

          {/* 计划提示 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyFlowChooseExercise') || '也可选择其他运动'}</Text>
            <ChevronRight size={12} color={TH.sub} />
          </View>
        </View>
      </View>
    </View>
  );
}
