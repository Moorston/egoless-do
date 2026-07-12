import { dateStr, createLogger } from '@egoless-do/core';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppStore, useShallowStore } from '../../store/useAppStore';

const log = createLogger('SleepNotify');

// Lazy-loaded expo-notifications — deferred until first actual use
let _Notifications: typeof import('expo-notifications') | null = null;
let _handlerConfigured = false;

function getNotifications(): typeof import('expo-notifications') {
  if (!_Notifications) {
    _Notifications = require('expo-notifications');
  }
  // Configure handler once on first access
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

export function useSleepNotifications() {
  const { sleepGoal, getTodaySleep, saveSleepDiary } = useShallowStore(s => ({
    sleepGoal: s.sleepGoal,
    getTodaySleep: s.getTodaySleep,
    saveSleepDiary: s.saveSleepDiary,
  }));
  const [showBedtimeModal, setShowBedtimeModal] = useState(false);
  const autoRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

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

  // Schedule sleep reminders
  const scheduleReminders = useCallback(async () => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();

    // Cancel existing sleep notifications
    await cancelReminders();

    const granted = await requestPermissions();
    if (!granted) {
      log.warn('Notification permission not granted');
      return;
    }

    const [bedHour, bedMin] = sleepGoal.targetBedtime.split(':').map(Number);

    // Reminder 1: before bedtime
    const reminderMin = bedMin - sleepGoal.reminderBeforeMin;
    let reminderHour = bedHour;
    let adjustedMin = reminderMin;
    if (reminderMin < 0) {
      reminderHour = (bedHour - 1 + 24) % 24;
      adjustedMin = reminderMin + 60;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 距离目标入睡还有 ' + sleepGoal.reminderBeforeMin + ' 分钟',
        body: '准备放下手机，开始睡眠仪轨',
        data: { type: 'sleep-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminderHour,
        minute: adjustedMin,
      },
      identifier: 'sleep-reminder-before',
    });

    // Reminder 2: at bedtime
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 现在是 ' + sleepGoal.targetBedtime + '，该入睡了',
        body: '点击开始睡眠仪轨',
        data: { type: 'sleep-bedtime' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: bedHour,
        minute: bedMin,
      },
      identifier: 'sleep-reminder-bedtime',
    });

    log.info('Sleep reminders scheduled', { bedtime: sleepGoal.targetBedtime, before: sleepGoal.reminderBeforeMin });
  }, [sleepGoal, requestPermissions]);

  // Cancel sleep notifications
  const cancelReminders = useCallback(async () => {
    const Notifications = getNotifications();
    await Notifications.cancelScheduledNotificationAsync('sleep-reminder-before').catch(() => {});
    await Notifications.cancelScheduledNotificationAsync('sleep-reminder-bedtime').catch(() => {});
  }, []);

  // Handle foreground notification (show modal instead)
  useEffect(() => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const type = notification.request.content.data?.type;
      if (type === 'sleep-bedtime') {
        // Show modal instead of notification when app is in foreground
        if (AppState.currentState === 'active') {
          setShowBedtimeModal(true);
          // Start 1-min auto-record timer
          autoRecordTimerRef.current = setTimeout(() => {
            const today = dateStr();
            const existing = getTodaySleep();
            if (!existing) {
              saveSleepDiary({ bedtimeAt: Date.now(), barrierDone: false });
            }
            setShowBedtimeModal(false);
          }, 60000);
        }
      }
    });

    return () => subscription.remove();
  }, [sleepGoal.enabled]);

  // Handle notification tap (when app was in background)
  useEffect(() => {
    if (!sleepGoal.enabled) return;
    const Notifications = getNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const type = response.notification.request.content.data?.type;
      if (type === 'sleep-bedtime' || type === 'sleep-reminder') {
        // Navigate to sleep screen - handled by the caller
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
    setShowBedtimeModal(false);
  }, []);

  // Start ritual from modal
  const startRitualFromModal = useCallback(() => {
    dismissBedtimeModal();
    // Caller should navigate to barrier
  }, [dismissBedtimeModal]);

  // Schedule/cancel when goal changes
  useEffect(() => {
    if (sleepGoal.enabled) {
      scheduleReminders();
    } else {
      cancelReminders();
    }
  }, [sleepGoal.enabled, sleepGoal.targetBedtime, sleepGoal.reminderBeforeMin]);

  return {
    showBedtimeModal,
    dismissBedtimeModal,
    startRitualFromModal,
    scheduleReminders,
    cancelReminders,
    requestPermissions,
  };
}
