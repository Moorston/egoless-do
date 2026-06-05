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
  StreakBreak: undefined;
  CheckinHistory: undefined;
  CheckinDetail: { date: string };
  ExerciseHistory: undefined;
  PlanCreate: { planId?: string } | undefined;
  PlanDetail: { planId: string };
  PlanHistory: undefined;
  RecycleBin: undefined;
  PrivacyPolicy: undefined;
  Stats: undefined;
  ReflectionStats: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Plan: undefined;
  Fasting: undefined;
  Meditation: undefined;
  Exercise: undefined;
  Settings: undefined;
  Reflections: { showNew?: boolean } | undefined;
  Habits: undefined;
};
