// ─── App entry point ──────────────────────────────────────────────
import './src/i18n';
import React, { useEffect, useState, useRef } from 'react';
import { Platform, InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';
import { AudioEngineProvider } from './src/features/music';
import SplashScreen from './src/features/splash/SplashScreen';
import { initApp } from './src/store/initApp';

const AMAP_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_AMAP_KEY_ANDROID ?? '',
  ios: process.env.EXPO_PUBLIC_AMAP_KEY_IOS ?? '',
});

// All lazy-loaded screen imports for preloading.
// After the first import() call, the module is cached — subsequent lazy()
// resolutions are instant.
const PRELOAD_SCREEN_MODULES = [
  // Main screens (highest priority)
  () => import('./src/features/practice/PracticeScreen'),
  () => import('./src/features/meditation/MeditationScreen'),
  () => import('./src/features/breathing/BreathingEngine'),
  () => import('./src/features/mantra/MantraEngine'),
  () => import('./src/features/sleep/SleepEngine'),
  () => import('./src/features/zhiguan/ZhiguanScreen'),
  () => import('./src/features/vow/VowScreen'),
  () => import('./src/features/mind/MindScreen'),
  () => import('./src/features/diet/DietScreen'),
  () => import('./src/features/practice/PreceptScreen'),
  () => import('./src/features/practice/GiveScreen'),
  () => import('./src/features/practice/BodyScreen'),
  () => import('./src/features/sutra/SutraScreen'),
  () => import('./src/features/habits/HabitsScreen'),
  () => import('./src/features/stats/StatsScreen'),
  () => import('./src/features/music/screens/MusicScreen'),
  // Thin wrappers (preload so second-level lazy resolves instantly)
  () => import('./src/features/breathing/BreathingScreen'),
  () => import('./src/features/mantra/MantraScreen'),
  () => import('./src/features/sleep/SleepScreen'),
  // History and secondary screens
  () => import('./src/features/zhiguan/ZhiguanHistoryScreen'),
  () => import('./src/features/sutra/SutraHistoryScreen'),
  () => import('./src/features/mantra/MantraHistoryScreen'),
  () => import('./src/features/sleep/SleepHistoryPage'),
  () => import('./src/features/breathing/BreathHistoryPage'),
  () => import('./src/features/practice/PreceptHistoryPage'),
  () => import('./src/features/practice/GiveHistoryPage'),
  () => import('./src/features/fasting/FastHistoryPage'),
  () => import('./src/features/meditation/MedHistoryPage'),
  () => import('./src/features/exercise/SportPage'),
  () => import('./src/features/exercise/ExerciseHistoryScreen'),
  () => import('./src/features/home/screens/GlobalPulseScreen'),
  () => import('./src/features/home/screens/FoodLogPage'),
  () => import('./src/features/home/screens/GracePage'),
  () => import('./src/features/home/screens/StreakBreakScreen'),
  () => import('./src/features/home/screens/CheckinHistoryScreen'),
  () => import('./src/features/home/screens/CheckinDetailScreen'),
  () => import('./src/features/home/screens/ReviewHistoryScreen'),
  () => import('./src/features/home/screens/ReviewDetailScreen'),
  () => import('./src/features/habits/HabitDetailScreen'),
  () => import('./src/features/plan/PlanCreateScreen'),
  () => import('./src/features/plan/PlanDetailScreen'),
  () => import('./src/features/plan/PlanHistoryScreen'),
  () => import('./src/features/music/screens/MusicCategoryScreen'),
  () => import('./src/features/settings/RecycleBinScreen'),
  () => import('./src/features/settings/ProfileScreen'),
  () => import('./src/features/settings/AISettingsScreen'),
  () => import('./src/features/settings/PrivacyPolicyScreen'),
];

/** Preload modules one at a time with a small gap to avoid blocking the JS thread. */
function staggerPreload(modules: Array<() => Promise<any>>, gapMs = 50) {
  let i = 0;
  function next() {
    if (i >= modules.length) return;
    modules[i++]().catch(() => {}).finally(() => {
      if (i < modules.length) setTimeout(next, gapMs);
    });
  }
  next();
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const preloadedRef = useRef(false);
  const initStartedRef = useRef(false);

  // Initialize app (SQLite, auth tokens, subscriptions) as early as possible
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    initApp().catch(() => {});
  }, []);

  useEffect(() => {
    import('react-native-amap3d').then(({ AMapSdk }) => {
      try { AMapSdk?.init?.(AMAP_KEY); } catch {}
    }).catch(() => {});
  }, []);

  // Start preloading after first render interactions are complete.
  // Only in production — in dev mode, Metro resolves modules on-the-fly
  // and preloading 45 screens would exhaust the Node.js heap (each screen
  // has ~2700 transitive deps, 45 × 2700 = 121K modules).
  // In production, all modules are pre-bundled, so import() just loads
  // from the bundle and caches instantly.
  useEffect(() => {
    if (__DEV__ || !isReady || preloadedRef.current) return;
    preloadedRef.current = true;
    InteractionManager.runAfterInteractions(() => {
      staggerPreload(PRELOAD_SCREEN_MODULES, 100);
    });
  }, [isReady]);

  if (!isReady) {
    return <SplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AudioEngineProvider>
          <AppNavigator />
        </AudioEngineProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
