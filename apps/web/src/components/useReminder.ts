'use client';

import { useEffect, useRef } from 'react';
import { useWebStore } from '../store/useWebStore';

export function useReminder() {
  const remindEnabled = useWebStore((s) => s.remindEnabled);
  const remindTime = useWebStore((s) => s.remindTime);
  const lastNotified = useRef('');

  useEffect(() => {
    if (!remindEnabled || typeof Notification === 'undefined') return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toDateString();
      const key = `${today}-${hm}`;
      if (hm === remindTime && lastNotified.current !== key) {
        lastNotified.current = key;
        new Notification('Egoless Do', {
          body: '该打卡了！记录今天的禁食、冥想和运动吧 🧘',
          icon: '/favicon.ico',
        });
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [remindEnabled, remindTime]);
}
