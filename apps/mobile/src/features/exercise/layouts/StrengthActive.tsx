import { COLORS, FONT_HERO, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BODY, fmt } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Minus, Plus, Pause } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

import MeditationMusicBar from '../../../components/MeditationMusicBar';
import CelebrationOverlay from '../shared/CelebrationOverlay';
import EmbeddedRest from '../shared/EmbeddedRest';
import ExerciseTopBar from '../shared/ExerciseTopBar';
import RestOverlay from '../shared/RestOverlay';

import type { ExerciseLayoutProps } from './types';

/* Resolve font constants once at module level for StyleSheet */
const FONT_SUB_SIZE = FONT_SUB();
const FONT_HERO_SIZE = FONT_HERO();
const FONT_BODY_SIZE = FONT_BODY();
const FONT_STAT_SECTION_SIZE = FONT_STAT_SECTION();
const FONT_STAT_CARD_SIZE = FONT_STAT_CARD();

export default function StrengthActive(props: ExerciseLayoutProps) {
  const {
    icon, sportName, sec, mode, targetType, targetValue, targetProgress, targetInfo,
    sets, currentSetReps, totalReps, currentSet,
    isResting, restSec, skipRest, restMode = 'overlay',
    selectedSound, showSoundPicker, onToggleSoundPicker, onSelectSound,
    bounceAnim, plusRippleAnim, minusRippleAnim, pulseAnim,
    showCelebration, celebrateAnim, milestoneText, milestoneAnim,
    handlePause, handleCompleteSet, startLongPress, stopLongPress, setCurrentSetReps,
    onPressInPauseLong, onPressOutPauseLong, pauseHoldAnim,
    calories, softTargetReached, softTargetLabel, softTargetProgress, softTarget,
    musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onMusicPressTrackName,
    T, topInset, currentExercise,
  } = props;

  const lastSetReps = sets.length > 0 ? sets[sets.length - 1].reps : null;
  const plannedSets = currentExercise?.defaultSets ?? 0;
  const plannedReps = currentExercise?.defaultReps ?? 0;
  const allSetsCompleted = plannedSets > 0 && sets.length >= plannedSets;

  return (
    <LinearGradient colors={['#2e1a1a', '#1f0f0f', '#150a0a']} style={s.root}>
      {/* Rest */}
      {isResting && restMode === 'inline' ? (
        <EmbeddedRest restSec={restSec} onSkip={skipRest} T={T} />
      ) : isResting ? (
        <RestOverlay restSec={restSec} lastSetReps={lastSetReps} setIndex={sets.length}
          targetReps={mode === 'target' && targetType === 'reps' ? targetValue : undefined}
          onSkip={skipRest} label={T('exerciseResting')} T={T} />
      ) : null}

      {/* Celebration */}
      <CelebrationOverlay showCelebration={showCelebration} celebrateAnim={celebrateAnim} milestoneText={milestoneText} milestoneAnim={milestoneAnim} />

      {/* Zone 1: Top bar */}
      <ExerciseTopBar
        icon={icon} sportName={sportName}
        targetInfo={targetInfo}
        selectedSound={selectedSound} showSoundPicker={showSoundPicker}
        onToggleSoundPicker={onToggleSoundPicker} onSelectSound={onSelectSound}
        topInset={topInset}
        rightSlot={
          <View style={{ alignItems: 'flex-end' }}>
            {currentExercise && (
              <Text style={s.exerciseName} numberOfLines={1}>{currentExercise.nameZh}</Text>
            )}
            <Text style={s.setLabel}>
              {currentExercise ? `${sets.length}/${plannedSets} ${T('exerciseSet')}` : T('exerciseSet').replace('{n}', String(currentSet))}
              {plannedReps ? ` × ${plannedReps}` : ''}
            </Text>
          </View>
        }
      />

      {/* Music bar — meditation style */}
      <View style={s.musicBarWrap}>
        <MeditationMusicBar
          track={musicTrack} isActive isPlaying={musicIsPlaying} primaryColor={COLORS.ORANGE}
          loop={musicLoop} onPress={onMusicPressTrackName} onTogglePlay={onMusicTogglePlay} onToggleLoop={onMusicToggleLoop}
        />
      </View>

      {/* Zone 2: Main interaction */}
      <View style={s.interactionZone}>
        {/* +5 quick button */}
        <TouchableOpacity onPress={() => setCurrentSetReps(r => r + 5)}
          style={s.quickPlusBtn}>
          <Text style={s.quickPlusLabel}>+5</Text>
        </TouchableOpacity>

        {/* Main number + controls */}
        <View style={s.controlsRow}>
          <Animated.View style={{ transform: [{ scale: minusRippleAnim }] }}>
            <TouchableOpacity
              onPressIn={() => startLongPress(-1)}
              onPressOut={() => stopLongPress(-1)}
              style={s.minusBtn}>
              <Minus size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Text style={s.mainReps}>
              {currentSetReps}
            </Text>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: plusRippleAnim }] }}>
            <TouchableOpacity
              onPressIn={() => startLongPress(1)}
              onPressOut={() => stopLongPress(1)}
              style={s.plusBtn}>
              <Plus size={32} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={s.repsLabel}>{plannedReps ? `${currentSetReps}/${plannedReps} ${T('exerciseReps')}` : T('exerciseReps')}</Text>

        {/* Complete set button */}
        {currentSetReps > 0 && (
          <TouchableOpacity onPress={handleCompleteSet}
            style={s.completeSetBtn}>
            <Text style={s.completeSetLabel}>
              {allSetsCompleted ? (T('bodyFlowFinish') || '完成') : T('exerciseSetComplete')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Set history cards */}
        {sets.length > 0 && (
          <View style={s.setHistoryRow}>
            {sets.slice(-4).map((setItem, i) => {
              const idx = sets.length - 4 + i;
              return (
                <View key={idx} style={[s.setHistoryCard, plannedReps > 0 && setItem.reps >= plannedReps && s.setHistoryCardDone]}>
                  <Text style={s.setHistoryText}>
                    {T('exerciseSet').replace('{n}', String(idx + 1))}: {setItem.reps}
                  </Text>
                </View>
              );
            })}
            {sets.length > 4 && (
              <View style={s.setHistoryOverflowCard}>
                <Text style={s.setHistoryOverflowText}>+{sets.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Target progress */}
        {mode === 'target' && (
          <View style={s.targetSection}>
            <View style={s.progressTrack}>
              <Animated.View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3, opacity: pulseAnim }} />
            </View>
            <Text style={s.targetProgressText}>
              {targetType === 'reps' ? `${totalReps} / ${targetValue} ${T('exerciseReps')}` : `${Math.round(targetProgress * 100)}%`}
            </Text>
          </View>
        )}

        {/* Soft target (free mode) */}
        {mode === 'free' && softTarget && (
          <View style={s.targetSection}>
            <Text style={{ fontSize: FONT_SUB_SIZE, color: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 4 }}>
              {softTargetReached ? T('exerciseTargetReached') : softTargetLabel}
            </Text>
            <View style={s.softProgressTrack}>
              <View style={{ height: 4, width: `${softTargetProgress * 100}%`, backgroundColor: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.2)', borderRadius: 2 }} />
            </View>
          </View>
        )}
      </View>

      {/* Zone 3: Bottom bar — duration + pause + calories */}
      <View style={s.bottomBar}>
        <View style={s.bottomStat}>
          <Text style={s.durationValue}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <Text style={s.durationLabel}>{T('exerciseDuration')}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pauseHoldAnim }] }}>
          <TouchableOpacity
            onPress={handlePause}
            onPressIn={onPressInPauseLong}
            onPressOut={onPressOutPauseLong}
            style={s.pauseBtn}>
            <Pause size={36} color="#333" />
          </TouchableOpacity>
        </Animated.View>

        <View style={s.bottomStat}>
          <Text style={s.caloriesValue}>{calories}</Text>
          <Text style={s.caloriesLabel}>kcal</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  /* Containers */
  root: { flex: 1 },
  musicBarWrap: { paddingHorizontal: 16 },
  interactionZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  setHistoryRow: { flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  targetSection: { marginTop: 20, width: '100%', paddingHorizontal: 20 },
  bottomBar: { paddingBottom: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomStat: { alignItems: 'center', flex: 1 },

  /* Text */
  exerciseName: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.7)', fontWeight: '600', marginBottom: 2 },
  setLabel: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.5)' },
  quickPlusLabel: { color: '#fff', fontWeight: '700', fontSize: FONT_BODY_SIZE },
  mainReps: { fontSize: FONT_HERO_SIZE + 8, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'], minWidth: 80, textAlign: 'center' },
  repsLabel: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.65)', marginTop: 6 },
  completeSetLabel: { color: COLORS.GREEN, fontSize: FONT_BODY_SIZE, fontWeight: '700' },
  setHistoryText: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.5)' },
  setHistoryOverflowText: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.7)' },
  targetProgressText: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.7)', marginTop: 4, textAlign: 'center' },
  durationValue: { fontSize: FONT_STAT_SECTION_SIZE, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  durationLabel: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.7)', marginTop: 2 },
  caloriesValue: { fontSize: FONT_STAT_CARD_SIZE, fontWeight: '700', color: COLORS.ORANGE },
  caloriesLabel: { fontSize: FONT_SUB_SIZE, color: 'rgba(255,255,255,.7)', marginTop: 2 },

  /* Buttons */
  quickPlusBtn: { marginBottom: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.1)' },
  minusBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' },
  plusBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' },
  completeSetBtn: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: `${COLORS.GREEN}30`, borderWidth: 1, borderColor: COLORS.GREEN },
  pauseBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  /* Cards */
  setHistoryCard: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.08)' },
  setHistoryCardDone: { backgroundColor: `${COLORS.GREEN}20`, borderColor: COLORS.GREEN, borderWidth: 1 },
  setHistoryOverflowCard: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' },

  /* Progress */
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' },
  softProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' },
});
