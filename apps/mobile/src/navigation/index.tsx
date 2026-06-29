// ─── Navigation root ──────────────────────────────────────────────
import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View, Text, Image, TouchableOpacity, Animated, PanResponder, StyleSheet, useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import {
  Home, ClipboardList, Timer, Binary, Dumbbell, Settings,
  Sparkles, Target, BarChart3, Flame,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { THEMES, t, FONT_BODY, FONT_SUB, FONT_STAT_SECTION, FONT_LABEL, createLogger } from '@egoless-do/core';
import StarfieldBackground from '../components/StarfieldBackground';
import SimpleHeaderComponent from './SimpleHeader';

const log = createLogger('App');

// Tab screens
import HomeScreen       from '../features/home/screens/HomeScreen';
import FastingScreen    from '../features/fasting/FastingScreen';
import MeditationScreen from '../features/meditation/MeditationScreen';
import ExerciseScreen   from '../features/exercise/ExerciseScreen';
import SettingsScreen   from '../features/settings/SettingsScreen';

// Stack screens — reflections (via barrel exports)
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
import HabitDetailScreen from '../features/habits/HabitDetailScreen';
import HabitsScreen      from '../features/habits/HabitsScreen';
import StatsScreen       from '../features/stats/StatsScreen';
import GlobalPulseScreen from '../features/home/screens/GlobalPulseScreen';
import SportPage         from '../features/exercise/SportPage';
import ExerciseHistoryScreen from '../features/exercise/ExerciseHistoryScreen';
import FastHistoryPage   from '../features/fasting/FastHistoryPage';
import MedHistoryPage    from '../features/meditation/MedHistoryPage';
import FoodLogPage       from '../features/home/screens/FoodLogPage';
import GracePage         from '../features/home/screens/GracePage';
import StreakBreakScreen from '../features/home/screens/StreakBreakScreen';
import CheckinHistoryScreen from '../features/home/screens/CheckinHistoryScreen';
import CheckinDetailScreen from '../features/home/screens/CheckinDetailScreen';
import ReviewHistoryScreen from '../features/home/screens/ReviewHistoryScreen';
import ReviewDetailScreen from '../features/home/screens/ReviewDetailScreen';
import PlanScreen from '../features/plan/PlanScreen';
import PlanCreateScreen from '../features/plan/PlanCreateScreen';
import PlanDetailScreen from '../features/plan/PlanDetailScreen';
import PlanHistoryScreen from '../features/plan/PlanHistoryScreen';
import LoginScreen       from '../features/auth/LoginScreen';
import RegisterScreen    from '../features/auth/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import RecycleBinScreen  from '../features/settings/RecycleBinScreen';
import PrivacyPolicyScreen from '../features/settings/PrivacyPolicyScreen';
import AISettingsScreen from '../features/settings/AISettingsScreen';
import ProfileScreen from '../features/settings/ProfileScreen';
import MusicScreen from '../features/music/screens/MusicScreen';
import MusicCategoryScreen from '../features/music/screens/MusicCategoryScreen';
import { useSync }       from '../features/sync/useSync';
import { isDeviceSyncedBefore } from '../features/sync/SyncService';
import { KickOutModal }  from '../components/KickOutModal';
import { SyncProgressOverlay } from '../components/SyncProgressOverlay';
import { SyncBanner } from '../components/SyncBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { RootStackParamList, MainTabParamList } from './types';

export type { RootStackParamList, MainTabParamList } from './types';
export { useRootNavigation, useTabNavigation } from './hooks';

const Tab   = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── Floating Action Button ───────────────────────────────────────
const FAB_SIZE = 52;
const FAB_HIDE_OFFSET = 30; // How much of the FAB is visible when hidden
const TabNavContext = createContext<any>(null);

function FabButton({ primaryColor }: { primaryColor: string }) {
  const tabNav = useContext(TabNavContext);
  const tabNavRef = useRef<any>(tabNav);
  tabNavRef.current = tabNav;
  const { width: vw, height: vh } = useWindowDimensions();
  const dimsRef = useRef({ vw, vh });
  dimsRef.current = { vw, vh };
  const pos = useRef({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 }).current;
  const animPos = useRef(new Animated.ValueXY({ x: pos.x, y: pos.y })).current;
  const moved = useRef(false);
  const isHidden = useRef(false);
  const currentPosRef = useRef({ x: pos.x, y: pos.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant() {
        animPos.extractOffset();
        moved.current = false;
      },
      onPanResponderMove: Animated.event([null, { dx: animPos.x, dy: animPos.y }], {
        useNativeDriver: false,
        listener: (event: GestureResponderEvent) => {
          moved.current = true;
          const gs = event?.nativeEvent ?? event;
          if (gs?.dx !== undefined) {
            currentPosRef.current = { x: pos.x + gs.dx, y: pos.y + gs.dy };
          }
        },
      }),
      onPanResponderRelease() {
        animPos.flattenOffset();
        // Update ref after flattenOffset - position is now baked into the base value
        const { vw: w, vh: h } = dimsRef.current;

        if (!moved.current) {
          if (isHidden.current) {
            isHidden.current = false;
            const targetX = w - FAB_SIZE - 20;
            Animated.spring(animPos, {
              toValue: { x: targetX, y: currentPosRef.current.y },
              useNativeDriver: false,
              bounciness: 8,
            }).start(() => { currentPosRef.current = { x: targetX, y: currentPosRef.current.y }; });
          } else {
            const nav = tabNavRef.current;
            if (nav) nav.navigate('Reflections', { showNew: true });
          }
          return;
        }

        const currentX = currentPosRef.current.x;
        const currentY = currentPosRef.current.y;

        const distToLeft = currentX;
        const distToRight = w - currentX - FAB_SIZE;

        let targetX: number;
        if (distToLeft < distToRight) {
          targetX = -FAB_HIDE_OFFSET;
          isHidden.current = true;
        } else {
          targetX = w - FAB_SIZE + FAB_HIDE_OFFSET;
          isHidden.current = true;
        }

        const minY = 100;
        const maxY = h - 85 - FAB_SIZE - 10;
        const targetY = Math.max(minY, Math.min(maxY, currentY));

        Animated.spring(animPos, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          bounciness: 8,
        }).start(() => { currentPosRef.current = { x: targetX, y: targetY }; });
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.fab, {
        backgroundColor: primaryColor,
        shadowColor: primaryColor,
        transform: animPos.getTranslateTransform(),
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
  const theme = useAppStore(s => s.theme);
  const language = useAppStore(s => s.language);
  const TH = THEMES[theme];
  const tabNavRef = useRef<any>(null);
  const [, forceUpdate] = useState(0);

  // Trigger one re-render after mount so Provider gets the navigator from screenOptions
  useEffect(() => { forceUpdate(n => n + 1); }, []);

  const iconMap: Record<string, React.ComponentType<any>> = {
    Home, Plan: ClipboardList, Fasting: Timer, Meditation: Binary,
    Exercise: Dumbbell, Settings, Reflections: Sparkles,
    Habits: Target, Stats: BarChart3,
  };

  const tabIcon = (name: string, focused: boolean) => {
    const Icon = iconMap[name] ?? Home;
    return <Icon size={22} color={focused ? TH.primary : TH.sub} strokeWidth={focused ? 2.2 : 1.5} />;
  };

  return (
    <TabNavContext.Provider value={tabNavRef.current}>
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        tabNavRef.current = navigation;
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
      <Tab.Screen name="Meditation"  component={MeditationScreen}  options={{ title: t('navTabMeditation', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Fasting"     component={FastingScreen}     options={{ title: t('navTabFasting', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Settings"    component={SettingsScreen}    options={{ title: t('navTabSettings', language), tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Plan"        component={PlanScreen}        options={{ title: t('navTabPlan', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Reflections" component={ReflectionsScreen} options={{ title: t('navTabReflections', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Habits"      component={HabitsScreen}      options={{ title: t('navTabHabits', language), tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
    <FabButton primaryColor={TH.primary} />
    </View>
    </TabNavContext.Provider>
  );
}

export default function AppNavigator() {
  const theme = useAppStore(s => s.theme);
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const TH = THEMES[theme];
  const navRef = useRef<any>(null);
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
    const logout = useAppStore.getState().logout;
    if (!expiresAt || expiresAt < Date.now()) {
      refreshAuth().catch(() => logout());
    } else if (expiresAt - Date.now() < 3600000) {
      refreshAuth().catch((e) => log.error(e));
    }
  }, [isSignedIn]);

  // Handle habit alarm notification tap
  useEffect(() => {
    let sub: any;
    let mounted = true;
    import('expo-notifications').then(Notifications => {
      if (!mounted) return;
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const habitId = response.notification.request.content.data?.habitId;
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
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isSignedIn ? 'MainTabs' : 'Login'}>
        <Stack.Screen name="Login"        component={LoginScreen} />
        <Stack.Screen name="Register"     component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs"     component={MainTabs} />
        <Stack.Screen name="GlobalMap"    component={GlobalPulseScreen} />
        <Stack.Screen name="Sport"        component={SportPage} />
        <Stack.Screen name="FastHistory"  component={FastHistoryPage} />
        <Stack.Screen name="MedHistory"   component={MedHistoryPage} />
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
