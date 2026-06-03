// ─── App entry point ──────────────────────────────────────────────
import './src/i18n';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';
import SplashScreen from './src/features/splash/SplashScreen';

const AMAP_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_AMAP_KEY_ANDROID ?? '',
  ios: process.env.EXPO_PUBLIC_AMAP_KEY_IOS ?? '',
});

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    import('react-native-amap3d').then(({ AMapSdk }) => {
      try { AMapSdk?.init?.(AMAP_KEY); } catch {}
    }).catch(() => {});
  }, []);

  if (!isReady) {
    return <SplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
