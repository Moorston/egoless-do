// ─── Sleep Notifications — 多阶段智能提醒 ─────────────────────────
// 支持：多阶段提醒 / 周末差异化 / 智能跳过 / Snooze / 跳过今晚

import { BODY_CLOCK, createLogger, type BodyClockPeriod } from '@egoless-do/core';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

import { useShallowStore } from '../../store/useAppStore';

const log = createLogger('SleepNotify');

// Lazy-loaded expo-notifications — deferred until first actual use
let _Notifications: typeof import('expo-notifications') | null = null;
let _handlerConfigured = false;

function getNotifications(): typeof import('expo-notifications') {
  if (!_Notifications) {
    _Notifications = require('expo-notifications') as typeof import('expo-notifications');
  }
  if (!_handlerConfigured) {
    _handlerConfigured = true;
    _Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return _Notifications;
}

/** 获取指定小时对应的时辰 */
function getPeriodForHour(hour: number): BodyClockPeriod {
  for (let i = BODY_CLOCK.length - 1; i >= 0; i--) {
    if (hour >= BODY_CLOCK[i].startHour || (i === 0 && hour < 1)) {
      return BODY_CLOCK[i];
    }
  }
  return BODY_CLOCK[0];
}

/** 根据提醒阶段获取文案前缀 + 紧迫度描述 */
function getStageLabel(minBefore: number): { icon: string; urgency: string } {
  if (minBefore >= 30) return { icon: '🌙', urgency: '宜调息静心，准备' };
  if (minBefore >= 15) return { icon: '⏰', urgency: '请' };
  return { icon: '⏰', urgency: '请立即' };
}

export function useSleepNotifications() {
  const { sleepGoal, getTodaySleep, saveSleepDiary } = useShallowStore(s => ({
    sleepGoal: s.sleepGoal,
    getTodaySleep: s.getTodaySleep,
    saveSleepDiary: s.saveSleepDiary,
  }));
  const [showBedtimeModal, setShowBedtimeModal] = useState(false);
  const autoRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snoozeCountRef = useRef(0);
  const modalVisibleRef = useRef(false);

  // Request notification permissions
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    const Notifications = getNotifications();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }, []);

  // Cancel all sleep notifications
  const cancelReminders = useCallback(async () => {
    const Notifications = getNotifications();
    const ids = [
      'sleep-reminder-bedtime',
      'sleep-reminder-30',
      'sleep-reminder-15',
      'sleep-reminder-5',
      'sleep-snooze',
    ];
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  }, []);

  // Schedule sleep reminders (multi-stage)
  const scheduleReminders = useCallback(async () => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();
    await cancelReminders();

    // 智能跳过：已记录睡眠 → 不提醒
    const todaySleep = getTodaySleep();
    if (todaySleep) {
      log.info('Already recorded sleep today, skipping reminders');
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      log.warn('Notification permission not granted');
      return;
    }

    // 判断周末（0=周日，6=周六）
    const isWeekend = [0, 6].includes(new Date().getDay());
    const bedtime = (isWeekend && sleepGoal.weekendBedtime)
      ? sleepGoal.weekendBedtime
      : sleepGoal.targetBedtime;

    const [bedHour, bedMin] = bedtime.split(':').map(Number);
    const stages = sleepGoal.reminderStages ?? [sleepGoal.reminderBeforeMin];

    // 阶段提醒
    for (const minBefore of stages) {
      let rHour = bedHour;
      let rMin = bedMin - minBefore;
      if (rMin < 0) {
        rHour = (rHour - 1 + 24) % 24;
        rMin += 60;
      }
      // 跳过过期的提醒（时间已过）
      const now = new Date();
      const remindTime = new Date();
      remindTime.setHours(rHour, rMin, 0, 0);
      if (remindTime <= now) continue;

      const period = getPeriodForHour(rHour);
      const { icon, urgency } = getStageLabel(minBefore);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${icon} 距离${period.nameZh}入睡还有 ${minBefore} 分钟`,
          body: `${period.organ}当令，${urgency}${period.advice}`,
          data: { type: 'sleep-reminder', stage: minBefore },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: rHour,
          minute: rMin,
        },
        identifier: `sleep-reminder-${minBefore}`,
      });
    }

    // 准时提醒
    const period = getPeriodForHour(bedHour);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌙 现在是 ${bedtime}，该入睡了`,
        body: `${period.organ}当令，${period.advice}`,
        data: { type: 'sleep-bedtime' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: bedHour,
        minute: bedMin,
      },
      identifier: 'sleep-reminder-bedtime',
    });

    log.info('Sleep reminders scheduled', { bedtime, stages, isWeekend });
  }, [sleepGoal, getTodaySleep, requestPermissions, cancelReminders]);

  // Snooze: 10 分钟后再提醒
  const snooze = useCallback(async () => {
    if (snoozeCountRef.current >= 3) return; // 最多 3 次/晚
    snoozeCountRef.current += 1;

    const Notifications = getNotifications();
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 再次提醒：该入睡了',
        body: '点击开始睡眠仪轨',
        data: { type: 'sleep-snooze' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: now,
      },
      identifier: 'sleep-snooze',
    });

    setShowBedtimeModal(false);
  }, []);

  // Skip tonight: 取消今晚所有提醒
  const skipTonight = useCallback(async () => {
    await cancelReminders();
    setShowBedtimeModal(false);
  }, [cancelReminders]);

  // Handle foreground notification (show modal instead)
  useEffect(() => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const type = notification.request.content.data?.type;
      if (type === 'sleep-bedtime' || type === 'sleep-snooze') {
        if (AppState.currentState === 'active' && !modalVisibleRef.current) {
          modalVisibleRef.current = true;
          setShowBedtimeModal(true);
          // 60s 自动记录定时器
          autoRecordTimerRef.current = setTimeout(() => {
            const existing = getTodaySleep();
            if (!existing) {
              saveSleepDiary({ bedtimeAt: Date.now(), barrierDone: false });
            }
            modalVisibleRef.current = false;
            setShowBedtimeModal(false);
          }, 60000);
        }
      }
    });

    return () => subscription.remove();
  }, [sleepGoal.enabled, getTodaySleep, saveSleepDiary]);

  // Handle notification tap (when app was in background)
  useEffect(() => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const type = response.notification.request.content.data?.type;
      if (type === 'sleep-bedtime' || type === 'sleep-reminder' || type === 'sleep-snooze') {
        // 由调用方处理导航（deep link）
      }
    });

    return () => subscription.remove();
  }, [sleepGoal.enabled]);

  // Dismiss bedtime modal and cancel auto-record
  const dismissBedtimeModal = useCallback(() => {
    if (autoRecordTimerRef.current) {
      clearTimeout(autoRecordTimerRef.current);
      autoRecordTimerRef.current = null;
    }
    modalVisibleRef.current = false;
    setShowBedtimeModal(false);
  }, []);

  // Schedule/cancel when goal changes
  useEffect(() => {
    if (sleepGoal.enabled) {
      void scheduleReminders();
    } else {
      void cancelReminders();
    }
  }, [sleepGoal.enabled, sleepGoal.targetBedtime, sleepGoal.weekendBedtime, sleepGoal.reminderStages, cancelReminders, scheduleReminders]);

  // 每天 00:01 重置 snooze 计数
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0);
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => { snoozeCountRef.current = 0; }, msUntilReset);
    return () => clearTimeout(timer);
  }, []);

  return {
    showBedtimeModal,
    dismissBedtimeModal,
    startRitualFromModal: dismissBedtimeModal, // 调用方处理导航
    scheduleReminders,
    cancelReminders,
    requestPermissions,
    snooze,
    skipTonight,
  };
}
