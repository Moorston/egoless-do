// ─── Navigation root ──────────────────────────────────────────────
import React, { useRef, useEffect, useState, useCallback, createContext, useContext, Suspense } from 'react';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View, Text, Image, TouchableOpacity, Animated, StyleSheet, useWindowDimensions,
} from 'react-native';
import {
  Home, ClipboardList, Timer, Binary, Dumbbell, Settings,
  Sparkles, Target, Flame, Footprints,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, useShallowStore } from '../store/useAppStore';
import { t, FONT_BODY, FONT_SUB, FONT_STAT_SECTION, FONT_LABEL, createLogger } from '@egoless-do/core';
import { useTheme } from '../components/UI';
import StarfieldBackground from '../components/StarfieldBackground';
import SimpleHeaderComponent from './SimpleHeader';
import { LazyScreen, withLazy, LoadingFallback } from './LazyScreen';
import { ErrorBoundary, withErrorBoundary } from '../components/ErrorBoundary';

const log = createLogger('App');

// ─── Visible tab screens (must be eagerly loaded, wrapped with ErrorBoundary) ───
import _HomeScreen       from '../features/home/screens/HomeScreen';
import _FastingScreen    from '../features/fasting/FastingScreen';
import _ExerciseScreen   from '../features/exercise/ExerciseScreen';
import _SettingsScreen   from '../features/settings/SettingsScreen';
import _PlanScreen       from '../features/plan/PlanScreen';

const HomeScreen     = withErrorBoundary(_HomeScreen);
const FastingScreen  = withErrorBoundary(_FastingScreen);
const ExerciseScreen = withErrorBoundary(_ExerciseScreen);
const SettingsScreen = withErrorBoundary(_SettingsScreen);
const PlanScreen     = withErrorBoundary(_PlanScreen);

// ─── Lazy-loaded screens (loaded on first navigation) ────────────
const MeditationScreen  = React.lazy(() => import('../features/meditation/MeditationScreen'));
const PracticeScreen    = React.lazy(() => import('../features/practice/PracticeScreen'));
const BreathingScreen   = React.lazy(() => import('../features/breathing/BreathingScreen'));
const SleepScreen       = React.lazy(() => import('../features/sleep/SleepScreen'));
const PreceptScreen     = React.lazy(() => import('../features/practice/PreceptScreen'));
const GiveScreen        = React.lazy(() => import('../features/practice/GiveScreen'));
const BodyScreen        = React.lazy(() => import('../features/practice/BodyScreen'));
const VowScreen         = React.lazy(() => import('../features/vow/VowScreen'));
const MantraScreen      = React.lazy(() => import('../features/mantra/MantraScreen'));
const SutraScreen       = React.lazy(() => import('../features/sutra/SutraScreen'));
const SutraHistoryScreen  = React.lazy(() => import('../features/sutra/SutraHistoryScreen'));
const MantraHistoryScreen = React.lazy(() => import('../features/mantra/MantraHistoryScreen'));
const ZhiguanScreen       = React.lazy(() => import('../features/zhiguan/ZhiguanScreen'));
const ZhiguanHistoryScreen = React.lazy(() => import('../features/zhiguan/ZhiguanHistoryScreen'));
const DietScreen        = React.lazy(() => import('../features/diet/DietScreen'));
const MindScreen        = React.lazy(() => import('../features/mind/MindScreen'));

// Stack screens — reflections (named exports, statically imported)
import {
  ReflectionsScreen,
  ReflectionStatsScreen,
  MindTrailScreen,
  ThoughtTrailDetailScreen,
  QuickCreateTrailScreen,
  ReflectionDetailScreen,
  InsightScreen,
  ReviewScreen,
  StrategyLibrary,
  RelationMapView,
} from '../features/reflections';
const HabitDetailScreen     = React.lazy(() => import('../features/habits/HabitDetailScreen'));
const HabitsScreen          = React.lazy(() => import('../features/habits/HabitsScreen'));
const StatsScreen           = React.lazy(() => import('../features/stats/StatsScreen'));
const GlobalPulseScreen     = React.lazy(() => import('../features/home/screens/GlobalPulseScreen'));
const SportPage             = React.lazy(() => import('../features/exercise/SportPage'));
const ExerciseHistoryScreen = React.lazy(() => import('../features/exercise/ExerciseHistoryScreen'));
const FastHistoryModule     = React.lazy(() => import('../features/fasting/FastHistoryPage'));
const MedHistoryModule      = React.lazy(() => import('../features/meditation/MedHistoryPage'));
const SleepHistoryPage      = React.lazy(() => import('../features/sleep/SleepHistoryPage'));
const PreceptHistoryPage    = React.lazy(() => import('../features/practice/PreceptHistoryPage'));
const BreathHistoryPage     = React.lazy(() => import('../features/breathing/BreathHistoryPage'));
const GiveHistoryPage       = React.lazy(() => import('../features/practice/GiveHistoryPage'));
const FoodLogPage           = React.lazy(() => import('../features/home/screens/FoodLogPage'));
const GracePage             = React.lazy(() => import('../features/home/screens/GracePage'));
const StreakBreakScreen     = React.lazy(() => import('../features/home/screens/StreakBreakScreen'));
const CheckinHistoryScreen  = React.lazy(() => import('../features/home/screens/CheckinHistoryScreen'));
const CheckinDetailScreen   = React.lazy(() => import('../features/home/screens/CheckinDetailScreen'));
const ReviewHistoryScreen   = React.lazy(() => import('../features/home/screens/ReviewHistoryScreen'));
const ReviewDetailScreen    = React.lazy(() => import('../features/home/screens/ReviewDetailScreen'));
const PlanCreateScreen      = React.lazy(() => import('../features/plan/PlanCreateScreen'));
const PlanDetailScreen      = React.lazy(() => import('../features/plan/PlanDetailScreen'));
const PlanHistoryScreen     = React.lazy(() => import('../features/plan/PlanHistoryScreen'));
const LoginScreen           = React.lazy(() => import('../features/auth/LoginScreen'));
const RegisterScreen        = React.lazy(() => import('../features/auth/RegisterScreen'));
const ForgotPasswordScreen  = React.lazy(() => import('../features/auth/ForgotPasswordScreen'));
const RecycleBinScreen      = React.lazy(() => import('../features/settings/RecycleBinScreen'));
const PrivacyPolicyScreen   = React.lazy(() => import('../features/settings/PrivacyPolicyScreen'));
const AISettingsScreen      = React.lazy(() => import('../features/settings/AISettingsScreen'));
const ProfileScreen         = React.lazy(() => import('../features/settings/ProfileScreen'));
const MusicScreen           = React.lazy(() => import('../features/music/screens/MusicScreen'));
const MusicCategoryScreen   = React.lazy(() => import('../features/music/screens/MusicCategoryScreen'));
import { useSync }       from '../features/sync/useSync';
import { isDeviceSyncedBefore } from '../features/sync/SyncService';
import { KickOutModal }  from '../components/KickOutModal';
import { SyncProgressOverlay } from '../components/SyncProgressOverlay';
import { SyncBanner } from '../components/SyncBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList, MainTabParamList } from './types';

export type { RootStackParamList, MainTabParamList } from './types';
export { useRootNavigation, useTabNavigation } from './hooks';

const Tab   = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── Suspense wrapper for lazy-loaded screens ─────────────────────
/** Wrap a lazy component for use in React Navigation. */

// Wrapper for default-exported modules with named exports (FastHistoryPage, MedHistoryPage)
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

// ─── Floating Action Button ───────────────────────────────────────
const FAB_SIZE = 52;
const FAB_HIDE_OFFSET = 30; // How much of the FAB is visible when hidden
const TabNavContext = createContext<NavigationContainerRef<MainTabParamList> | null>(null);

function FabButton({ primaryColor }: { primaryColor: string }) {
  const tabNav = useContext(TabNavContext);
  const { width: vw, height: vh } = useWindowDimensions();
  const posRef = useRef({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 });
  const transX = useRef(new Animated.Value(posRef.current.x)).current;
  const transY = useRef(new Animated.Value(posRef.current.y)).current;
  const touchStart = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: posRef.current.x, y: posRef.current.y });
  const isDragging = useRef(false);
  const isHidden = useRef(false);

  const onTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    isDragging.current = false;
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    offset.current = { x: posRef.current.x, y: posRef.current.y };
  }, []);

  const onTouchMove = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    transX.setValue(offset.current.x + dx);
    transY.setValue(offset.current.y + dy);
  }, [transX, transY]);

  const onTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    const finalX = offset.current.x + dx;
    const finalY = offset.current.y + dy;

    if (!isDragging.current) {
      if (isHidden.current) {
        isHidden.current = false;
        const targetX = vw - FAB_SIZE - 20;
        posRef.current = { x: targetX, y: finalY };
        Animated.spring(transX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
        Animated.spring(transY, { toValue: finalY, useNativeDriver: false, bounciness: 8 }).start();
      } else {
        tabNav?.navigate('Reflections' as any, { showNew: true } as any);
      }
      return;
    }

    const distL = finalX;
    const distR = vw - finalX - FAB_SIZE;
    let targetX: number;
    if (distL < distR) {
      targetX = -FAB_HIDE_OFFSET;
      isHidden.current = true;
    } else {
      targetX = vw - FAB_SIZE + FAB_HIDE_OFFSET;
      isHidden.current = true;
    }
    const minY = 100;
    const maxY = vh - 85 - FAB_SIZE - 10;
    const targetY = Math.max(minY, Math.min(maxY, finalY));
    posRef.current = { x: targetX, y: targetY };
    Animated.spring(transX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
    Animated.spring(transY, { toValue: targetY, useNativeDriver: false, bounciness: 8 }).start();
  }, [tabNav, vw, vh, transX, transY]);

  return (
    <Animated.View
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={[styles.fab, {
        backgroundColor: primaryColor,
        shadowColor: primaryColor,
        transform: [{ translateX: transX }, { translateY: transY }],
      }]}
    >
      <Sparkles size={24} color="#ffffff" strokeWidth={2.5} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});

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
    <FabButton primaryColor={TH.primary} />
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
