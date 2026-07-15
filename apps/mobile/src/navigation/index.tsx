// ─── Navigation root ──────────────────────────────────────────────────────
//
// ⚠️ 导航层作为全局协调器，直接引用 sync 状态是设计意图（§2.2 建议集中路由表，
// 但同步状态是全局性基础设施，不适合通过 Store 间接转发）。
// 其他 feature 仍应遵循 §2.2 禁止互相直接引用。
// ────────────────────────────────────────────────────────────────────────────
import { t, FONT_BODY, createLogger } from '@egoless-do/core';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Home, ClipboardList, Timer, Binary, Dumbbell, Settings,
  Target, Footprints, Sparkles,
} from 'lucide-react-native';
import React, { useRef, useEffect, useState, Suspense } from 'react';
import {
  View,
  Pressable,
  Text,
} from 'react-native';

import { ErrorBoundary, withErrorBoundary } from '../components/ErrorBoundary';
import FabButton from '../components/FabButton';
import { KickOutModal }  from '../components/KickOutModal';
import StarfieldBackground from '../components/StarfieldBackground';
import { SyncBanner } from '../components/SyncBanner';
import { SyncProgressOverlay } from '../components/SyncProgressOverlay';
import { useTheme } from '../components/UI';
import { useSync }       from '../features/sync/useSync';
import { useAppStore, useShallowStore } from '../store/useAppStore';

import { withLazy, LoadingFallback } from './LazyScreen';
import SimpleHeaderComponent from './SimpleHeader';

import { isDeviceSyncedBefore } from '../features/sync/SyncService';


import {
  _HomeScreen, _FastingScreen, _ExerciseScreen, _SettingsScreen, _PlanScreen,
  ReflectionsScreen, ReflectionStatsScreen, MindTrailScreen,
  ThoughtTrailDetailScreen, QuickCreateTrailScreen,
  ReflectionDetailScreen, InsightScreen, ReviewScreen,
  StrategyLibrary, RelationMapView,
  AISettingsScreen, BodyScreen, BodyPlanEditorScreen, PlanManagementScreen, BreathHistoryPage, BreathingScreen,
  CheckinDetailScreen, CheckinHistoryScreen, DayCheckinScreen, DietScreen,
  ExerciseHistoryScreen, FastHistoryModule, FoodLogPage,
  ForgotPasswordScreen, GiveHistoryPage, GiveScreen,
  GlobalPulseScreen, GracePage, HabitDetailScreen, HabitsScreen,
  LoginScreen, MantraHistoryScreen, MantraScreen,
  MedHistoryModule, MeditationScreen, MindScreen,
  MusicCategoryScreen, MusicScreen,
  PlanCreateScreen, PlanDetailScreen, PlanHistoryScreen,
  PracticeScreen, PreceptHistoryPage, PreceptScreen,
  PrivacyPolicyScreen, ProfileScreen, RecycleBinScreen,
  RegisterScreen, ReviewDetailScreen, ReviewHistoryScreen,
  SleepHistoryPage, SleepScreen, SportPage, StatsScreen,
  StreakBreakScreen, SutraHistoryScreen, SutraScreen,
  VowScreen, ZhiguanHistoryScreen, ZhiguanScreen,
} from './screens';
import type { RootStackParamList, MainTabParamList } from './types';

// All screen imports from screens.ts (single source, no duplicates)

export type { RootStackParamList, MainTabParamList } from './types';
import { useRootNavigation } from './hooks';
export { useRootNavigation, useTabNavigation } from './hooks';

const log = createLogger('App');

// ─── Wrap eager tab screens with ErrorBoundary ─────────────────────────────
const HomeScreen     = withErrorBoundary(_HomeScreen);
const FastingScreen  = withErrorBoundary(_FastingScreen);
const ExerciseScreen = withErrorBoundary(_ExerciseScreen);
const SettingsScreen = withErrorBoundary(_SettingsScreen);
const PlanScreen     = withErrorBoundary(_PlanScreen);

const Tab   = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── Suspense wrappers for named-export modules ────────────────────────────
function FastHistoryWrapper() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <FastHistoryModule />
      </Suspense>
    </ErrorBoundary>
  );
}
function MedHistoryWrapper() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <MedHistoryModule />
      </Suspense>
    </ErrorBoundary>
  );
}

export { SimpleHeaderComponent as SimpleHeader };

const TAB_ROUTES: Record<string, string> = {
  home: 'Home', plan: 'Plan', fasting: 'Fasting', meditation: 'Meditation',
  exercise: 'Exercise', settings: 'Settings', reflections: 'Reflections',
  habits: 'Habits', stats: 'Stats',
};

// Ref to hold the Tab navigator's navigate function — set by MainTabBar, read by FabButton
const tabNavRef: { navigate: ((screen: string, params?: Record<string, unknown>) => void) | null } = { navigate: null };

function MainTabBar({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const TH = useTheme();
  const language = useShallowStore(s => s.language);
  const visibleRoutes = state.routes.filter(r => {
    const opts = descriptors[r.key]?.options;
    return (opts?.tabBarItemStyle as Record<string, unknown>)?.display !== 'none';
  });

  const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
    Home, Plan: ClipboardList, Fasting: Timer, Meditation: Binary, Practice: Footprints,
    Exercise: Dumbbell, Settings, Reflections: Sparkles,
    Habits: Target,
  };

  const titleMap: Record<string, string> = {
    Home: t('navTabHome', language),
    Exercise: t('navTabExercise', language),
    Fasting: t('navTabFasting', language),
    Practice: t('navTabPractice', language),
    Settings: t('navTabSettings', language),
  };

  // Expose Tab navigator's navigate to FabButton via module-level ref
  React.useEffect(() => {
    tabNavRef.navigate = (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate(screen as never, params as never);
    };
    return () => { tabNavRef.navigate = null; };
  }, [navigation]);

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: TH.navBg,
      borderTopColor: TH.border,
      borderTopWidth: 1,
      height: 85,
      paddingBottom: insets?.bottom ?? 6,
      paddingTop: 6,
    }} accessibilityRole="tablist">
      {visibleRoutes.map(route => {
        const focused = state.index === state.routes.indexOf(route);
        const Icon = iconMap[route.name] ?? Home;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={titleMap[route.name] ?? route.name}
          >
            <Icon size={22} color={focused ? TH.primary : TH.sub} strokeWidth={focused ? 2.2 : 1.5} />
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '500', color: focused ? TH.primary : TH.sub, marginTop: 2 }}>
              {titleMap[route.name] ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs() {
  const language = useShallowStore(s => s.language);

  return (
    <Tab.Navigator
      id="main-tabs"
      tabBar={props => <MainTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"        component={HomeScreen}        options={{ title: t('navTabHome', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Exercise"    component={ExerciseScreen}    options={{ title: t('navTabExercise', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Fasting"     component={FastingScreen}     options={{ title: t('navTabFasting', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Practice"    component={withErrorBoundary(withLazy(PracticeScreen))}    options={{ title: t('navTabPractice', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Settings"    component={SettingsScreen}    options={{ title: t('navTabSettings', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Meditation"  component={withErrorBoundary(withLazy(MeditationScreen))}  options={{ title: t('navTabMeditation', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Breathing"   component={withErrorBoundary(withLazy(BreathingScreen))}   options={{ title: t('breathingTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Sleep"       component={withErrorBoundary(withLazy(SleepScreen))}       options={{ title: t('sleepTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Precept"    component={withErrorBoundary(withLazy(PreceptScreen))}     options={{ title: t('preceptTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Give"       component={withErrorBoundary(withLazy(GiveScreen))}        options={{ title: t('giveTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Body"        component={withErrorBoundary(withLazy(BodyScreen))}        options={{ title: t('bodyTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Vow"         component={withErrorBoundary(withLazy(VowScreen))}         options={{ title: t('vowTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Mantra"      component={withErrorBoundary(withLazy(MantraScreen))}      options={{ title: t('mantraTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Sutra"       component={withErrorBoundary(withLazy(SutraScreen))}       options={{ title: t('sutraTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Diet"        component={withErrorBoundary(withLazy(DietScreen))}        options={{ title: t('dietTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Mind"        component={withErrorBoundary(withLazy(MindScreen))}        options={{ title: t('mindTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Plan"        component={PlanScreen}        options={{ title: t('navTabPlan', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Reflections" component={withErrorBoundary(ReflectionsScreen)} options={{ title: t('navTabReflections', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Habits"      component={withErrorBoundary(withLazy(HabitsScreen))} options={{ title: t('navTabHabits', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const TH = useTheme();
  const theme = useShallowStore(s => s.theme);
  const isSignedIn = useShallowStore(s => s.auth.isSignedIn);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { kickOutVisible, hasPendingData, handleSyncAndLogout, handleLogoutDirectly } = useSync();
  const [syncOverlayVisible, setSyncOverlayVisible] = useState(false);
  const [syncPhase, setSyncPhase] = useState(1);

  // Check initial sync state on mount — only show overlay on first device login
  useEffect(() => {
    if (!isSignedIn) return;
    isDeviceSyncedBefore().then(synced => {
      if (synced) return; // Device already synced before — no overlay needed
      import('../db/schema').then(({ openDatabase, getState }) => {
        openDatabase().then(async (db) => {
          const done = await getState(db, 'initialSyncDone');
          if (done !== 'true') {
            setSyncOverlayVisible(true);
            const phase = await getState(db, 'initialSyncPhase');
            setSyncPhase(parseInt(phase || '1', 10));
          }
        });
      }).catch(e => log.error(e, { phase: 'navigation-init' }));
    });
  }, [isSignedIn]);

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = useAppStore.getState().auth.expiresAt;
    const refreshAuth = useAppStore.getState().refreshAuth;
    // Only refresh if token is actually expired (not just on startup)
    if (expiresAt && expiresAt < Date.now()) {
      refreshAuth().catch(e => log.error(e, { phase: 'navigation-init' }));
    }
  }, [isSignedIn]);

  // Navigate to Login when signed out (token expired, kicked out, or manual logout)
  const prevIsSignedIn = useRef(isSignedIn);
  useEffect(() => {
    if (prevIsSignedIn.current && !isSignedIn && navRef.current) {
      navRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
    prevIsSignedIn.current = isSignedIn;
  }, [isSignedIn]);

  // Handle habit alarm notification tap
  useEffect(() => {
    let sub: { remove?: () => void } | undefined;
    let mounted = true;
    import('expo-notifications').then(Notifications => {
      if (!mounted) return;
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const habitId = response.notification.request.content.data?.habitId as string;
        if (habitId && navRef.current) {
          navRef.current.navigate('HabitDetail', { habitId });
        }
      });
    });
    return () => { mounted = false; sub?.remove?.(); };
  }, []);

  return (
    <ErrorBoundary theme={theme}>
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
    {TH.starfield && <StarfieldBackground />}
    <NavigationContainer
      ref={navRef}
      theme={{
        dark: theme !== 'light',
        colors: {
          primary:    TH.primary,
          background: TH.bg,
          card:       TH.cardSolid,
          text:       TH.text,
          border:     TH.border,
          notification: TH.primary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium:  { fontFamily: 'System', fontWeight: '500' },
          bold:    { fontFamily: 'System', fontWeight: '700' },
          heavy:   { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <Stack.Navigator id="root-stack" screenOptions={{ headerShown: false }} initialRouteName={isSignedIn ? 'MainTabs' : 'Login'}>
        <Stack.Screen name="Login"        component={withErrorBoundary(LoginScreen)} />
        <Stack.Screen name="Register"     component={withErrorBoundary(RegisterScreen)} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs"     component={MainTabs} />
        <Stack.Screen name="GlobalMap"    component={GlobalPulseScreen} />
        <Stack.Screen name="Sport"        component={withErrorBoundary(SportPage)} />
        <Stack.Screen name="FastHistory"  component={FastHistoryWrapper} />
        <Stack.Screen name="FastCalendar" component={withLazy(React.lazy(async () => ({ default: (await import('../features/fasting/FastHistoryPage')).FastCalendarScreen })))} />
        <Stack.Screen name="MedHistory"   component={MedHistoryWrapper} />
        <Stack.Screen name="MedCalendar"  component={withLazy(React.lazy(async () => ({ default: (await import('../features/meditation/MedHistoryPage')).MedCalendarScreen })))} />
        <Stack.Screen name="SleepHistory" component={withErrorBoundary(SleepHistoryPage)} />
        <Stack.Screen name="PreceptHistory" component={withErrorBoundary(PreceptHistoryPage)} />
        <Stack.Screen name="BreathHistory" component={withErrorBoundary(BreathHistoryPage)} />
        <Stack.Screen name="GiveHistory" component={withErrorBoundary(GiveHistoryPage)} />
        <Stack.Screen name="FoodLog"      component={withErrorBoundary(FoodLogPage)} />
        <Stack.Screen name="Grace"        component={withErrorBoundary(GracePage)} />
        <Stack.Screen name="StreakBreak" component={StreakBreakScreen} />
        <Stack.Screen name="CheckinHistory" component={withErrorBoundary(CheckinHistoryScreen)} />
        <Stack.Screen name="CheckinDetail" component={withErrorBoundary(CheckinDetailScreen)} />
<Stack.Screen name="DayCheckin" component={withErrorBoundary(DayCheckinScreen)} />
        <Stack.Screen name="ReviewHistory" component={withErrorBoundary(ReviewHistoryScreen)} />
        <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} />
        <Stack.Screen name="ExerciseHistory" component={withErrorBoundary(ExerciseHistoryScreen)} />
        <Stack.Screen name="PlanCreate"     component={withErrorBoundary(PlanCreateScreen)} />
        <Stack.Screen name="PlanDetail"     component={withErrorBoundary(PlanDetailScreen)} />
        <Stack.Screen name="PlanHistory"    component={withErrorBoundary(PlanHistoryScreen)} />
        <Stack.Screen name="RecycleBin"    component={RecycleBinScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="AISettings"    component={withErrorBoundary(AISettingsScreen)} />
        <Stack.Screen name="Profile"       component={withErrorBoundary(ProfileScreen)} />
        <Stack.Screen name="Music"         component={withErrorBoundary(MusicScreen)} />
        <Stack.Screen name="MusicCategory" component={MusicCategoryScreen} />
        <Stack.Screen name="Stats"         component={withErrorBoundary(StatsScreen)} />
        <Stack.Screen name="ReflectionStats" component={ReflectionStatsScreen} />
        <Stack.Screen name="MindTrail"     component={MindTrailScreen} />
        <Stack.Screen name="QuickCreateTrail" component={QuickCreateTrailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ThoughtTrailDetail" component={ThoughtTrailDetailScreen} />
        <Stack.Screen name="ReflectionDetail" component={withErrorBoundary(ReflectionDetailScreen)} />
        <Stack.Screen name="Insight"       component={InsightScreen} />
        <Stack.Screen name="Review"        component={ReviewScreen} />
        <Stack.Screen name="StrategyLibrary" component={StrategyLibrary} />
        <Stack.Screen name="HabitDetail"   component={withErrorBoundary(HabitDetailScreen)} />
        <Stack.Screen name="RelationMap"   component={RelationMapView} />
        <Stack.Screen name="MantraHistory" component={MantraHistoryScreen} />
        <Stack.Screen name="SutraHistory" component={withErrorBoundary(SutraHistoryScreen)} />
        <Stack.Screen name="Zhiguan" component={ZhiguanScreen} />
        <Stack.Screen name="ZhiguanHistory" component={withErrorBoundary(ZhiguanHistoryScreen)} />
        <Stack.Screen name="BodyPlanEditor" component={withErrorBoundary(BodyPlanEditorScreen)} />
        <Stack.Screen name="PlanManagement" component={withErrorBoundary(PlanManagementScreen)} />
      </Stack.Navigator>
    </NavigationContainer>
    <KickOutModal
      visible={kickOutVisible}
      hasPendingData={hasPendingData}
      onSyncAndLogout={handleSyncAndLogout}
      onLogoutDirectly={handleLogoutDirectly}
    />
    <SyncProgressOverlay visible={syncOverlayVisible && isSignedIn} phase={syncPhase} />
    {isSignedIn && !syncOverlayVisible && <SyncBanner />}
    {isSignedIn && (
      <FabButton
        primaryColor={TH.primary}
        onPress={() => tabNavRef.navigate?.('Reflections', { showNew: true })}
      />
    )}
    </View>
    </ErrorBoundary>
  );
}
