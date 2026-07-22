import type { SportType, ExerciseSet, MusicTrack, SoftTarget , SportExperienceType } from '@egoless-do/core';
import type { Animated } from 'react-native';

export interface ExerciseLayoutProps {
  // Identity
  icon: string;
  sportName: string;
  experienceType: SportExperienceType;
  sportType: SportType;
  bg: string;
  currentExercise?: import('@egoless-do/core').ExerciseDef;

  // Timer
  sec: number;
  active: boolean;

  // Sets
  sets: ExerciseSet[];
  currentSetReps: number;
  totalReps: number;
  currentSet: number;

  // Mode & targets
  mode: 'free' | 'target';
  targetType: string;
  targetValue: number;
  targetProgress: number;
  targetInfo: string;

  // Soft target
  softTarget?: SoftTarget;
  softTargetReached: boolean;
  softTargetLabel: string;
  softTargetProgress: number;

  // Rest
  isResting: boolean;
  restSec: number;
  skipRest: () => void;
  restMode?: 'overlay' | 'inline';

  // Audio
  selectedSound: string;
  showSoundPicker: boolean;
  onToggleSoundPicker: () => void;
  onSelectSound: (key: string) => void;

  // Animations
  bounceAnim: Animated.Value;
  plusRippleAnim: Animated.Value;
  minusRippleAnim: Animated.Value;
  pulseAnim: Animated.Value;
  celebrateAnim: Animated.Value;
  milestoneAnim: Animated.Value;

  // Milestone & celebration
  milestoneText: string | null;
  showCelebration: boolean;

  // Breathing (meditative)
  breathGuideEnabled: boolean;
  breathPhase: 'inhale' | 'hold' | 'exhale';
  breathAnim: Animated.Value;

  // Handlers
  handlePause: () => void;
  handleCompleteSet: () => void;
  startLongPress: (delta: 1 | -1) => void;
  stopLongPress: (delta: 1 | -1) => void;
  setCurrentSetReps: (fn: (r: number) => number) => void;

  // Pause long press to finish
  onPressInPauseLong: () => void;
  onPressOutPauseLong: () => void;
  pauseHoldAnim: Animated.Value;

  // Calories
  calories: number;

  // Music
  musicTrack: MusicTrack | null;
  musicIsPlaying: boolean;
  musicLoop: boolean;
  onMusicTogglePlay: () => void;
  onMusicToggleLoop: () => void;
  onMusicPressTrackName?: () => void;

  // i18n
  T: (key: string) => string;

  // Layout inset
  topInset?: number;
}
