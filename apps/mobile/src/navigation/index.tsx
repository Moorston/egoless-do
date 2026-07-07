// ─── Navigation root ──────────────────────────────────────────────────────
import { t, FONT_BODY, createLogger } from '@egoless-do/core';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Home, ClipboardList, Timer, Binary, Dumbbell, Settings,
  Target, Footprints, Sparkles,
} from 'lucide-react-native';
import React, { useRef, useEffect, useState, createContext, Suspense } from 'react';
import {
  View,
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
  AISettingsScreen, BodyScreen, BreathHistoryPage, BreathingScreen,
  CheckinDetailScreen, CheckinHistoryScreen, DietScreen,
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
    <Suspense fallback={<LoadingFallback />}>
      <FastHistoryModule />
    </Suspense>
  );
}
function MedHistoryWrapper() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MedHistoryModule />
    </Suspense>
  );
}

// ─── Floating Action Button context ────────────────────────────────────────
const TabNavContext = createContext<NavigationContainerRef<MainTabParamList> | null>(null);

export { SimpleHeaderComponent as SimpleHeader };

const TAB_ROUTES: Record<string, string> = {
  home: 'Home', plan: 'Plan', fasting: 'Fasting', meditation: 'Meditation',
  exercise: 'Exercise', settings: 'Settings', reflections: 'Reflections',
  habits: 'Habits', stats: 'Stats',
};

function MainTabs() {
  const TH = useTheme();
  const language = useShallowStore(s => s.language);
  const tabNavRef = useRef<NavigationContainerRef<MainTabParamList>>(null);
  const [tabNav, setTabNav] = useState<NavigationContainerRef<MainTabParamList> | null>(null);

  const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
    Home, Plan: ClipboardList, Fasting: Timer, Meditation: Binary, Practice: Footprints,
    Exercise: Dumbbell, Settings, Reflections: Sparkles,
    Habits: Target,
  };

  const tabIcon = (name: string, focused: boolean) => {
    const Icon = iconMap[name] ?? Home;
    return <Icon size={22} color={focused ? TH.primary : TH.sub} strokeWidth={focused ? 2.2 : 1.5} />;
  };

  return (
    <TabNavContext.Provider value={tabNav}>
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      id="main-tabs"
      screenOptions={({ route }) => {
        return {
          headerShown: false,
          tabBarIcon: ({ focused }) => tabIcon(route.name, focused),
          tabBarActiveTintColor:   TH.primary,
          tabBarInactiveTintColor: TH.sub,
          tabBarStyle: {
            backgroundColor: TH.navBg,
            borderTopColor:  TH.border,
            borderTopWidth:  1,
            height: 85,
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: FONT_BODY, fontWeight: '500' },
        };
      }}
    >
      <Tab.Screen name="Home"        component={HomeScreen}        options={{ title: t('navTabHome', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Exercise"    component={ExerciseScreen}    options={{ title: t('navTabExercise', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Fasting"     component={FastingScreen}     options={{ title: t('navTabFasting', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Practice"    component={withErrorBoundary(withLazy(PracticeScreen))}    options={{ title: t('navTabPractice', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Settings"    component={SettingsScreen}    options={{ title: t('navTabSettings', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Meditation"  component={withErrorBoundary(withLazy(MeditationScreen))}  options={{ title: t('navTabMeditation', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Breathing"   component={withLazy(BreathingScreen)}   options={{ title: t('breathingTitle'), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Sleep"       component={withLazy(SleepScreen)}       options={{ title: '调眠', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Precept"    component={withLazy(PreceptScreen)}     options={{ title: '持戒', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Give"       component={withLazy(GiveScreen)}        options={{ title: '布施', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Body"        component={withLazy(BodyScreen)}        options={{ title: '调身', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Vow"         component={withLazy(VowScreen)}         options={{ title: '发愿', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Mantra"      component={withLazy(MantraScreen)}      options={{ title: '持咒', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Sutra"       component={withLazy(SutraScreen)}       options={{ title: '诵经', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Diet"        component={withLazy(DietScreen)}        options={{ title: '调食', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Mind"        component={withLazy(MindScreen)}        options={{ title: '调心', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Plan"        component={PlanScreen}        options={{ title: t('navTabPlan', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Reflections" component={withErrorBoundary(ReflectionsScreen)} options={{ title: t('navTabReflections', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Habits"      component={withLazy(HabitsScreen)} options={{ title: t('navTabHabits', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
    <FabButton primaryColor={TH.primary} onPress={() => tabNav?.navigate('Reflections', { showNew: true })} />
    </View>
    </TabNavContext.Provider>
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
      }).catch(() => {});
    });
  }, [isSignedIn]);

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = useAppStore.getState().auth.expiresAt;
    const refreshAuth = useAppStore.getState().refreshAuth;
    // Only refresh if token is actually expired (not just on startup)
    if (expiresAt && expiresAt < Date.now()) {
      refreshAuth().catch(() => {});
    }
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
        <Stack.Screen name="Login"        component={LoginScreen} />
        <Stack.Screen name="Register"     component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs"     component={MainTabs} />
        <Stack.Screen name="GlobalMap"    component={GlobalPulseScreen} />
        <Stack.Screen name="Sport"        component={SportPage} />
        <Stack.Screen name="FastHistory"  component={FastHistoryWrapper} />
        <Stack.Screen name="FastCalendar" component={withLazy(React.lazy(async () => ({ default: (await import('../features/fasting/FastHistoryPage')).FastCalendarScreen })))} />
        <Stack.Screen name="MedHistory"   component={MedHistoryWrapper} />
        <Stack.Screen name="MedCalendar"  component={withLazy(React.lazy(async () => ({ default: (await import('../features/meditation/MedHistoryPage')).MedCalendarScreen })))} />
        <Stack.Screen name="SleepHistory" component={SleepHistoryPage} />
        <Stack.Screen name="PreceptHistory" component={PreceptHistoryPage} />
        <Stack.Screen name="BreathHistory" component={BreathHistoryPage} />
        <Stack.Screen name="GiveHistory" component={GiveHistoryPage} />
        <Stack.Screen name="FoodLog"      component={FoodLogPage} />
        <Stack.Screen name="Grace"        component={GracePage} />
        <Stack.Screen name="StreakBreak" component={StreakBreakScreen} />
        <Stack.Screen name="CheckinHistory" component={CheckinHistoryScreen} />
        <Stack.Screen name="CheckinDetail" component={CheckinDetailScreen} />
        <Stack.Screen name="ReviewHistory" component={ReviewHistoryScreen} />
        <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} />
        <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
        <Stack.Screen name="PlanCreate"     component={PlanCreateScreen} />
        <Stack.Screen name="PlanDetail"     component={PlanDetailScreen} />
        <Stack.Screen name="PlanHistory"    component={PlanHistoryScreen} />
        <Stack.Screen name="RecycleBin"    component={RecycleBinScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="AISettings"    component={AISettingsScreen} />
        <Stack.Screen name="Profile"       component={ProfileScreen} />
        <Stack.Screen name="Music"         component={MusicScreen} />
        <Stack.Screen name="MusicCategory" component={MusicCategoryScreen} />
        <Stack.Screen name="Stats"         component={StatsScreen} />
        <Stack.Screen name="ReflectionStats" component={ReflectionStatsScreen} />
        <Stack.Screen name="MindTrail"     component={MindTrailScreen} />
        <Stack.Screen name="QuickCreateTrail" component={QuickCreateTrailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ThoughtTrailDetail" component={ThoughtTrailDetailScreen} />
        <Stack.Screen name="ReflectionDetail" component={ReflectionDetailScreen} />
        <Stack.Screen name="Insight"       component={InsightScreen} />
        <Stack.Screen name="Review"        component={ReviewScreen} />
        <Stack.Screen name="StrategyLibrary" component={StrategyLibrary} />
        <Stack.Screen name="HabitDetail"   component={HabitDetailScreen} />
        <Stack.Screen name="RelationMap"   component={RelationMapView} />
        <Stack.Screen name="MantraHistory" component={MantraHistoryScreen} />
        <Stack.Screen name="SutraHistory" component={SutraHistoryScreen} />
        <Stack.Screen name="Zhiguan" component={ZhiguanScreen} />
        <Stack.Screen name="ZhiguanHistory" component={ZhiguanHistoryScreen} />
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
    </View>
    </ErrorBoundary>
  );
}
