import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, type BodyPlan, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, type Theme, scaleFontSize, FONT_STAT_SECTION} from '@egoless-do/core';
import { Play, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  todayPlan?: BodyPlan;
  todayWeekday: number;
  onStart: () => void;
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

export default function BodyTodayPlanCard({ TH, T, todayPlan, todayWeekday, onStart }: Props) {
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

  // Rest day or no plan → render a small muted hint (no actionable button since user can use WeekPlanCard)
  if (!display || display.isRest) {
    return (
      <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: scaleFontSize(36), marginBottom: 8 }}>😴</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 4 }}>{T('bodyTodayPlanRest')}</Text>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{dayLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
      {/* Main today-plan card */}
      <View style={{ backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 0, overflow: 'hidden' }}>
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
