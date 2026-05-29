// ─── App entry point ──────────────────────────────────────────────
import './src/i18n';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AMapSdk } from 'react-native-amap3d';
import AppNavigator from './src/navigation';
import SplashScreen from './src/features/splash/SplashScreen';

const AMAP_KEY = Platform.select({
  android: 'fb01a15f17ec665d46422ab1769d2427',
  ios: 'efb232210c5328248abffe22437e2b89',
});

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      AMapSdk?.init?.(AMAP_KEY);
    } catch {}
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
