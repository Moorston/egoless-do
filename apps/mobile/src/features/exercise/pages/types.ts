import type { Animated } from 'react-native';
import type { SportType, ExerciseSet } from '@egoless-do/core';
import type { SportExperienceType } from '@egoless-do/core';

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
  bgPlayer: any;

  // Sets
  sets: ExerciseSet[];
  currentSetReps: number;
  totalReps: number;

  // GPS
  distKm: number;
  calories: number;
  coords: any[];
  initialPos: any;
  amapReady: boolean;
  MapView: any;
  Polyline: any;
  mapRef: any;

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
  setPage?: (page: any) => void;

  // Store
  exerciseLog: any[];

  // Theme & i18n
  TH: any;
  T: (key: string) => string;
}
