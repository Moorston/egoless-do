// ─── Screen registry — single source for all navigation screens ─────────────
// All screen imports and lazy declarations live here.
// index.tsx imports from this file only, avoiding scattered/duplicate imports.

import React from 'react';

// ─── Eagerly loaded tab screens (wrapped with ErrorBoundary in index.tsx) ───
export { default as _HomeScreen }     from '../features/home/screens/HomeScreen';
export { default as _FastingScreen }  from '../features/fasting/FastingScreen';
export { default as _ExerciseScreen } from '../features/exercise/ExerciseScreen';
export { default as _SettingsScreen } from '../features/settings/SettingsScreen';
export { default as _PlanScreen }     from '../features/plan/PlanScreen';

// ─── Named exports (reflections) ────────────────────────────────────────────
export {
  InsightScreen,
  MindTrailScreen,
  QuickCreateTrailScreen,
  ReflectionDetailScreen,
  ReflectionStatsScreen,
  ReflectionsScreen,
  RelationMapView,
  ReviewScreen,
  StrategyLibrary,
  ThoughtTrailDetailScreen,
} from '../features/reflections';

// ─── Lazy-loaded screens ────────────────────────────────────────────────────
export const AISettingsScreen       = React.lazy(() => import('../features/settings/AISettingsScreen'));
export const BodyScreen             = React.lazy(() => import('../features/practice/BodyScreen'));
export const BodyPlanEditorScreen   = React.lazy(() => import('../features/practice/body/screens/BodyPlanEditorScreen'));
export const PlanManagementScreen   = React.lazy(() => import('../features/practice/body/screens/PlanManagementScreen'));
export const BodyCheckinHistoryScreen = React.lazy(() => import('../features/practice/body/screens/BodyCheckinHistoryScreen'));
export const BreathHistoryPage      = React.lazy(() => import('../features/breathing/BreathHistoryPage'));
export const BreathingScreen        = React.lazy(() => import('../features/breathing/BreathingScreen'));
export const CheckinDetailScreen    = React.lazy(() => import('../features/home/screens/CheckinDetailScreen'));
export const CheckinHistoryScreen   = React.lazy(() => import('../features/home/screens/CheckinHistoryScreen'));
export const DayCheckinScreen       = React.lazy(() => import('../features/home/screens/DayCheckinScreen'));
export const DietScreen             = React.lazy(() => import('../features/diet/DietScreen'));
export const ExerciseHistoryScreen  = React.lazy(() => import('../features/exercise/ExerciseHistoryScreen'));
export const FastHistoryModule      = React.lazy(() => import('../features/fasting/FastHistoryPage'));
export const FoodLogPage            = React.lazy(() => import('../features/home/screens/FoodLogPage'));
export const ForgotPasswordScreen   = React.lazy(() => import('../features/auth/ForgotPasswordScreen'));
export const GiveHistoryPage        = React.lazy(() => import('../features/practice/GiveHistoryPage'));
export const GiveScreen             = React.lazy(() => import('../features/practice/GiveScreen'));
export const GlobalPulseScreen      = React.lazy(() => import('../features/home/screens/GlobalPulseScreen'));
export const GracePage              = React.lazy(() => import('../features/home/screens/GracePage'));
export const HabitDetailScreen      = React.lazy(() => import('../features/habits/HabitDetailScreen'));
export const HabitsScreen           = React.lazy(() => import('../features/habits/HabitsScreen'));
export const LoginScreen            = React.lazy(() => import('../features/auth/LoginScreen'));
export const MantraHistoryScreen    = React.lazy(() => import('../features/mantra/MantraHistoryScreen'));
export const MantraScreen           = React.lazy(() => import('../features/mantra/MantraScreen'));
export const MedHistoryModule       = React.lazy(() => import('../features/meditation/MedHistoryPage'));
export const MeditationScreen       = React.lazy(() => import('../features/meditation/MeditationScreen'));
export const MindScreen             = React.lazy(() => import('../features/mind/MindScreen'));
export const MusicCategoryScreen    = React.lazy(() => import('../media/screens/MusicCategoryScreen'));
export const MusicScreen            = React.lazy(() => import('../media/screens/MusicScreen'));
export const MusicLibraryScreen     = React.lazy(() => import('../media/screens/MusicLibraryScreen'));
export const PlanCreateScreen       = React.lazy(() => import('../features/plan/PlanCreateScreen'));
export const PlanDetailScreen       = React.lazy(() => import('../features/plan/PlanDetailScreen'));
export const PlanHistoryScreen      = React.lazy(() => import('../features/plan/PlanHistoryScreen'));
export const PracticeScreen         = React.lazy(() => import('../features/practice/PracticeScreen'));
export const PreceptHistoryPage     = React.lazy(() => import('../features/practice/PreceptHistoryPage'));
export const PreceptScreen          = React.lazy(() => import('../features/practice/PreceptScreen'));
export const PrivacyPolicyScreen    = React.lazy(() => import('../features/settings/PrivacyPolicyScreen'));
export const ProfileScreen          = React.lazy(() => import('../features/settings/ProfileScreen'));
export const RecycleBinScreen       = React.lazy(() => import('../features/settings/RecycleBinScreen'));
export const RegisterScreen         = React.lazy(() => import('../features/auth/RegisterScreen'));
export const ReviewDetailScreen     = React.lazy(() => import('../features/home/screens/ReviewDetailScreen'));
export const ReviewHistoryScreen    = React.lazy(() => import('../features/home/screens/ReviewHistoryScreen'));
export const SleepHistoryPage       = React.lazy(() => import('../features/sleep/SleepHistoryPage'));
export const SleepScreen            = React.lazy(() => import('../features/sleep/SleepScreen'));
export const SportPage              = React.lazy(() => import('../features/exercise/SportPage'));
export const StatsScreen            = React.lazy(() => import('../features/stats/StatsScreen'));
export const StreakBreakScreen      = React.lazy(() => import('../features/home/screens/StreakBreakScreen'));
export const SutraHistoryScreen     = React.lazy(() => import('../features/sutra/SutraHistoryScreen'));
export const SutraScreen            = React.lazy(() => import('../features/sutra/SutraScreen'));
export const VowScreen              = React.lazy(() => import('../features/vow/VowScreen'));
export const ZhiguanHistoryScreen   = React.lazy(() => import('../features/zhiguan/ZhiguanHistoryScreen'));
export const ZhiguanScreen          = React.lazy(() => import('../features/zhiguan/ZhiguanScreen'));
