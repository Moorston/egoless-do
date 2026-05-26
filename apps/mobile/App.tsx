// ─── App entry point ──────────────────────────────────────────────
import './src/i18n';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AMapSdk } from 'react-native-amap3d';
import AppNavigator from './src/navigation';

const AMAP_KEY = Platform.select({
  android: 'YOUR_AMAP_ANDROID_KEY',
  ios: 'YOUR_AMAP_IOS_KEY',
});

export default function App() {
  useEffect(() => {
    AMapSdk.init(AMAP_KEY);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
