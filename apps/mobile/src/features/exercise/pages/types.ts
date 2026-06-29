import type { Animated, ViewStyle } from 'react-native';
import type { SportType, ExerciseSet, ExerciseEntry, Theme, SportExperienceType } from '@egoless-do/core';

/** GPS coordinate */
interface GpsCoord {
  latitude: number;
  longitude: number;
}

/** AMap native component props (react-native-amap3d) */
interface MapComponentProps {
  style?: ViewStyle;
  [key: string]: unknown;
}

export interface ExercisePageProps {
  // Identity
  icon: string;
  sportName: string;
  sportType: SportType;
  experienceType: SportExperienceType;
  bg: string;
  isGpsSport: boolean;

  // Timer
  sec: number;
  countdown: number;
  holdAnim: Animated.Value;
  scaleAnim: Animated.Value;
  pulseAnim: Animated.Value;

  // Mode & targets
  mode: 'free' | 'target';
  setMode: (m: 'free' | 'target') => void;
  targetType: string;
  setTargetType: (t: string) => void;
  targetValue: number;
  setTargetValue: (v: number) => void;

  // Breathing
  breathGuideEnabled: boolean;
  setBreathGuideEnabled: (fn: (v: boolean) => boolean) => void;
  isMeditative: boolean;

  // Audio
  selectedSound: string;
  cycleSound: () => void;
  selectSound: (key: string) => void;
  bgPlayer: { loadAsync?: (src: unknown) => Promise<void>; playAsync?: () => Promise<void>; unloadAsync?: () => Promise<void>; play?: () => void; pause?: () => void; loop?: boolean; volume?: number; seekTo?: (position: number) => void } | null;

  // Sets
  sets: ExerciseSet[];
  currentSetReps: number;
  totalReps: number;

  // GPS
  distKm: number;
  calories: number;
  coords: GpsCoord[];
  initialPos: GpsCoord | null;
  amapReady: boolean;
  MapView: React.ComponentType<MapComponentProps> | null;
  Polyline: React.ComponentType<{ coordinates: GpsCoord[]; color?: string; width?: number }> | null;
  mapRef: React.RefObject<unknown>;

  // Report
  segmentPaces: number[];

  // Handlers
  handleGo: () => void;
  handlePause: () => void;
  handleContinue: () => void;
  handleHoldStart: () => void;
  handleHoldEnd: () => void;
  handleSave: () => void;
  onGoBack: () => void;
  setPage?: (page: 'countdown' | 'active' | 'report') => void;

  // Store
  exerciseLog: ExerciseEntry[];

  // Theme & i18n
  TH: Theme;
  T: (key: string) => string;
}
