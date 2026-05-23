import { useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './utils/store';
import { runMiniprogramSync } from './utils/sync';
import './app.scss';

function App({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  const isSignedIn = useAuthStore(s => s.isSignedIn);
  const remindEnabled = useStore(s => s.remindEnabled);
  const remindTime = useStore(s => s.remindTime);
  const lastRemindedRef = useRef('');

  // Sync on app show if signed in
  useDidShow(() => {
    // Check auth expiry
    useAuthStore.getState().checkAuthExpiry();
    if (!isSignedIn || !token) return;
    runMiniprogramSync(token).then(({ pulled }) => {
      if (pulled > 0) {
        const data = Taro.getStorageSync('egoless-server-data');
        if (data) useStore.getState().hydrateFromServer(data);
      }
    }).catch((e) => console.error('[err]', e));

    // Check reminder on each show
    if (remindEnabled) {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().slice(0, 10);
      const key = `${today}-${remindTime}`;
      // If current time is near remindTime and we haven't reminded today
      if (hhmm === remindTime && lastRemindedRef.current !== key) {
        lastRemindedRef.current = key;
        Taro.showToast({ title: '该打卡了！记录今天的修行与感念', icon: 'none', duration: 3000 });
      }
    }
  });

  return children;
}

export default App;
