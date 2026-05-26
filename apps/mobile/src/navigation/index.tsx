// ─── Navigation root ──────────────────────────────────────────────
import React, { useRef, useCallback, useEffect, useState, createContext, useContext } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Text, View, TouchableOpacity, Animated, PanResponder, StyleSheet, Dimensions,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '@egoless-do/core';
import AppHeader from '../components/AppHeader';

// Tab screens
import HomeScreen       from '../features/home/HomeScreen';
import FastingScreen    from '../features/fasting/FastingScreen';
import MeditationScreen from '../features/meditation/MeditationScreen';
import ExerciseScreen   from '../features/exercise/ExerciseScreen';
import SettingsScreen   from '../features/settings/SettingsScreen';

// Stack screens
import ReflectionsScreen from '../features/reflections/ReflectionsScreen';
import HabitsScreen      from '../features/habits/HabitsScreen';
import StatsScreen       from '../features/stats/StatsScreen';
import GlobalMapPage     from '../features/home/GlobalMapPage';
import SportPage         from '../features/exercise/SportPage';
import ExerciseHistoryScreen from '../features/exercise/ExerciseHistoryScreen';
import FastHistoryPage   from '../features/fasting/FastHistoryPage';
import MedHistoryPage    from '../features/meditation/MedHistoryPage';
import FoodLogPage       from '../features/home/FoodLogPage';
import GracePage         from '../features/home/GracePage';
import CheckinHistoryScreen from '../features/home/CheckinHistoryScreen';
import CheckinDetailScreen from '../features/home/CheckinDetailScreen';
import LoginScreen       from '../features/auth/LoginScreen';
import RegisterScreen    from '../features/auth/RegisterScreen';
import { useSync }       from '../features/sync/useSync';

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  GlobalMap: { icon?: string; title?: string } | undefined;
  Sport: { key: string; icon: string; color: string; gps?: boolean };
  FastHistory: undefined;
  MedHistory: undefined;
  FoodLog: undefined;
  Grace: undefined;
  CheckinHistory: undefined;
  CheckinDetail: { date: string };
  ExerciseHistory: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Fasting: undefined;
  Meditation: undefined;
  Exercise: undefined;
  Settings: undefined;
  Reflections: { showNew?: boolean } | undefined;
  Habits: undefined;
  Stats: undefined;
};

const Tab   = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ─── Floating Action Button ───────────────────────────────────────
const FAB_SIZE = 52;
const TabNavContext = createContext<any>(null);

function FabButton({ primaryColor }: { primaryColor: string }) {
  const tabNav = useContext(TabNavContext);
  const tabNavRef = useRef<any>(tabNav);
  tabNavRef.current = tabNav;
  const { width: vw, height: vh } = Dimensions.get('window');
  const pos = useRef({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 }).current;
  const animPos = useRef(new Animated.ValueXY({ x: pos.x, y: pos.y })).current;
  const moved = useRef(false);

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
        listener: () => { moved.current = true; },
      }),
      onPanResponderRelease() {
        animPos.flattenOffset();
        const nav = tabNavRef.current;
        if (!moved.current && nav) {
          nav.navigate('Reflections', { showNew: true });
        }
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
      <Text style={styles.fabText}>✦</Text>
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
  fabText: { color: '#fff', fontSize: 24 },
});

// All Tab routes
const TAB_ROUTES: Record<string, string> = {
  home: 'Home',
  fasting: 'Fasting',
  meditation: 'Meditation',
  exercise: 'Exercise',
  settings: 'Settings',
  reflections: 'Reflections',
  habits: 'Habits',
  stats: 'Stats',
};

// Route name → tab key mapping
const ROUTE_TO_TAB: Record<string, string> = {
  Home: 'home',
  Fasting: 'fasting',
  Meditation: 'meditation',
  Exercise: 'exercise',
  Settings: 'settings',
  Reflections: 'reflections',
  Habits: 'habits',
  Stats: 'stats',
};

function MainTabs() {
  const theme = useAppStore(s => s.theme);
  const TH = THEMES[theme];
  const tabNavRef = useRef<any>(null);
  const [, forceUpdate] = useState(0);

  // Trigger one re-render after mount so Provider gets the navigator from screenOptions
  useEffect(() => { forceUpdate(n => n + 1); }, []);

  const tabIcon = (name: string, focused: boolean) => {
    const icons: Record<string, string> = {
      Home: '🏠', Fasting: '⏱', Meditation: '☯', Exercise: '🏃',
      Settings: '⚙', Reflections: '✦', Habits: '◇', Stats: '◈',
    };
    return (
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
        {icons[name] || '◎'}
      </Text>
    );
  };

  return (
    <TabNavContext.Provider value={tabNavRef.current}>
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        tabNavRef.current = navigation;
        return {
        header: () => {
          const tabKey = ROUTE_TO_TAB[route.name] || 'home';
          const handleTabChange = (key: string) => {
            const tabRoute = TAB_ROUTES[key];
            if (tabRoute) {
              navigation.navigate(tabRoute as never);
            }
          };
          return <AppHeader activeTab={tabKey} onTabChange={handleTabChange} />;
        },
        headerShadowVisible: false,
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
        tabBarLabelStyle: { fontSize: 15, fontWeight: '500' },
        };
      }}
    >
      <Tab.Screen name="Home"        component={HomeScreen}        options={{ title:'主页', tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Fasting"     component={FastingScreen}     options={{ title:'禁食', tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Meditation"  component={MeditationScreen}  options={{ title:'冥想', tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Exercise"    component={ExerciseScreen}    options={{ title:'锻炼', tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Settings"    component={SettingsScreen}    options={{ title:'设置', tabBarItemStyle: { flex: 1 } }} />
      <Tab.Screen name="Reflections" component={ReflectionsScreen} options={{ title:'感念', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Habits"      component={HabitsScreen}      options={{ title:'习惯', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Stats"       component={StatsScreen}       options={{ title:'统计', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
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
  useSync();

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = useAppStore.getState().auth.expiresAt;
    const refreshAuth = useAppStore.getState().refreshAuth;
    const logout = useAppStore.getState().logout;
    if (!expiresAt || expiresAt < Date.now()) {
      refreshAuth().catch(() => logout());
    } else if (expiresAt - Date.now() < 3600000) {
      refreshAuth().catch((e) => console.error('[err]', e));
    }
  }, [isSignedIn]);

  return (
    <NavigationContainer
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
        <Stack.Screen name="MainTabs"     component={MainTabs} />
        <Stack.Screen name="GlobalMap"    component={GlobalMapPage} />
        <Stack.Screen name="Sport"        component={SportPage} />
        <Stack.Screen name="FastHistory"  component={FastHistoryPage} />
        <Stack.Screen name="MedHistory"   component={MedHistoryPage} />
        <Stack.Screen name="FoodLog"      component={FoodLogPage} />
        <Stack.Screen name="Grace"        component={GracePage} />
        <Stack.Screen name="CheckinHistory" component={CheckinHistoryScreen} />
        <Stack.Screen name="CheckinDetail" component={CheckinDetailScreen} />
        <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
