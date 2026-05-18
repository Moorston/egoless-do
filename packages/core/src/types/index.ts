export interface MindReflection {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  mood: string;
  linkedHabitId?: string;
  cardTheme?: string;
  colors: readonly [string, string];
  isPinned: boolean;
  isPublished: boolean;
}

export interface FastingSession {
  id: string;
  targetHours: number;
  startedAt: number;
  endedAt?: number;
  estimatedKcal?: number;
  insight?: string;
}

export interface Habit {
  id: string;
  name: string;
  startDate: string;
  targetDays: number;
  goal: string;
  insight: string;
  createTag: boolean;
  doneDays: number;
  streak: number;
  interrupted: number;
  status: 'notStarted' | 'inProgress' | 'paused' | 'abandoned' | 'completed';
  checkedDates: string[];
  pauseReason: string;
  abandonReason: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  note?: string;
  timestamp: number;
}

export interface CheckinEntry {
  date: string;
  done: boolean;
  note: string;
  streak: number;
}

export interface FastHistoryEntry {
  date: string;
  dur: string;
  kcal: number;
}

export interface MedHistoryEntry {
  date: string;
  dur: string;
  mood: string;
}

export interface GlobalUser {
  id: number;
  name: string;
  lat: number;
  lng: number;
  days: number;
  sport: string;
  since: string;
  duration: string;
}

export interface SportItem {
  key: string;
  icon: string;
  color: string;
}

export interface SportGroup {
  group: string;
  items: SportItem[];
}
