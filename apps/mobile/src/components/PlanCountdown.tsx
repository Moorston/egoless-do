import { COLORS, FONT_STAT_SECTION, FONT_SUB } from '@egoless-do/core';
import type { Plan, PlanStatus } from '@egoless-do/core';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, AppState } from 'react-native';

import { useTheme, useT } from './UI';

interface Props {
  plan: Plan;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type CountdownType = 'start' | 'end' | 'overdue' | 'none';

function getCountdownType(plan: Plan, now: Date): CountdownType {
  const { status, startDate, endDate } = plan;
  
  // 不显示倒计时的状态
  if (status === 'paused' || status === 'completed' || status === 'cancelled') {
    return 'none';
  }
  
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // 未开始计划
  if (status === 'not_started') {
    return 'start';
  }
  
  // 进行中的计划
  if (status === 'in_progress') {
    // 检查是否超期
    if (endDate < today) {
      return 'overdue';
    }
    return 'end';
  }
  
  return 'none';
}

function calculateTimeDiff(targetDate: string, now: Date, isOverdue: boolean = false): CountdownTime {
  // Parse date components manually to get local midnight (not UTC).
  // new Date('2026-01-15T00:00:00') would be UTC midnight, which is wrong
  // for users outside UTC+0.
  const [y, m, d] = targetDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const diffMs = isOverdue 
    ? now.getTime() - target.getTime()
    : target.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { days, hours, minutes, seconds };
}

function formatNumber(num: number): string {
  return String(num).padStart(2, '0');
}

export default function PlanCountdown({ plan }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const countdownType = getCountdownType(plan, now);
  
  // 计算倒计时
  const calculateCountdown = useCallback((): CountdownTime => {
    switch (countdownType) {
      case 'start':
        return calculateTimeDiff(plan.startDate, now, false);
      case 'end':
        return calculateTimeDiff(plan.endDate, now, false);
      case 'overdue':
        return calculateTimeDiff(plan.endDate, now, true);
      default:
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
  }, [countdownType, plan.startDate, plan.endDate, now]);
  
  const time = calculateCountdown();
  
  // 每秒更新倒计时
  useEffect(() => {
    if (countdownType === 'none') return;
    
    intervalRef.current = setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdownType]);
  
  // 监听 AppState 变化，恢复时立即刷新
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setNow(new Date());
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // 不显示倒计时
  if (countdownType === 'none') {
    return null;
  }
  
  // 获取标签和颜色
  const getLabelAndColor = () => {
    switch (countdownType) {
      case 'start':
        return { label: T('planCountdownStart'), color: COLORS.BLUE };
      case 'end':
        return { label: T('planCountdownEnd'), color: P };
      case 'overdue':
        return { label: T('planDelayed'), color: COLORS.RED };
      default:
        return { label: '', color: P };
    }
  };
  
  const { label, color } = getLabelAndColor();
  
  return (
    <View style={{
      backgroundColor: `${color}10`,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        {time.days > 0 && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color }}>
              {formatNumber(time.days)}
            </Text>
            <Text style={{ fontSize: 10, color: TH.sub }}>{T('planDays')}</Text>
          </View>
        )}
        {time.days > 0 && (
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color, marginHorizontal: 2 }}>:</Text>
        )}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color }}>
            {formatNumber(time.hours)}
          </Text>
          <Text style={{ fontSize: 10, color: TH.sub }}>{T('planHours')}</Text>
        </View>
        <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color, marginHorizontal: 2 }}>:</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color }}>
            {formatNumber(time.minutes)}
          </Text>
          <Text style={{ fontSize: 10, color: TH.sub }}>{T('planMinutes')}</Text>
        </View>
        <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color, marginHorizontal: 2 }}>:</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color }}>
            {formatNumber(time.seconds)}
          </Text>
          <Text style={{ fontSize: 10, color: TH.sub }}>{T('planSeconds')}</Text>
        </View>
      </View>
    </View>
  );
}
