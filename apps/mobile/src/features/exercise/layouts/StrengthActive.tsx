import { COLORS, FONT_HERO, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BODY, fmt } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Minus, Plus, Pause } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

import MeditationMusicBar from '../../meditation/MeditationMusicBar';
import CelebrationOverlay from '../shared/CelebrationOverlay';
import EmbeddedRest from '../shared/EmbeddedRest';
import ExerciseTopBar from '../shared/ExerciseTopBar';
import RestOverlay from '../shared/RestOverlay';

import type { ExerciseLayoutProps } from './types';

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
    T,
  } = props;

  const lastSetReps = sets.length > 0 ? sets[sets.length - 1].reps : null;

  return (
    <LinearGradient colors={['#2e1a1a', '#1f0f0f', '#150a0a']} style={{ flex: 1 }}>
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
        rightSlot={
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
            {T('exerciseSet').replace('{n}', String(currentSet))} · {sets.reduce((s, set) => s + set.reps, 0)} {T('exerciseReps')}
          </Text>
        }
      />

      {/* Music bar — meditation style */}
      <View style={{ paddingHorizontal: 16 }}>
        <MeditationMusicBar
          track={musicTrack} isActive isPlaying={musicIsPlaying} primaryColor={COLORS.ORANGE}
          loop={musicLoop} onPress={onMusicPressTrackName} onTogglePlay={onMusicTogglePlay} onToggleLoop={onMusicToggleLoop}
        />
      </View>

      {/* Zone 2: Main interaction */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        {/* +5 quick button */}
        <TouchableOpacity onPress={() => setCurrentSetReps(r => r + 5)}
          style={{ marginBottom: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.1)' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>+5</Text>
        </TouchableOpacity>

        {/* Main number + controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Animated.View style={{ transform: [{ scale: minusRippleAnim }] }}>
            <TouchableOpacity
              onPressIn={() => startLongPress(-1)}
              onPressOut={() => stopLongPress(-1)}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Text style={{ fontSize: FONT_HERO + 8, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'], minWidth: 80, textAlign: 'center' }}>
              {currentSetReps}
            </Text>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: plusRippleAnim }] }}>
            <TouchableOpacity
              onPressIn={() => startLongPress(1)}
              onPressOut={() => stopLongPress(1)}
              style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={32} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseReps')}</Text>

        {/* Complete set button */}
        {currentSetReps > 0 && (
          <TouchableOpacity onPress={handleCompleteSet}
            style={{ marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: `${COLORS.GREEN}30`, borderWidth: 1, borderColor: COLORS.GREEN }}>
            <Text style={{ color: COLORS.GREEN, fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseSetComplete')}</Text>
          </TouchableOpacity>
        )}

        {/* Set history cards */}
        {sets.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {sets.slice(-3).map((s, i) => {
              const idx = sets.length - 3 + i;
              return (
                <View key={idx} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.08)' }}>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
                    {T('exerciseSet').replace('{n}', String(idx + 1))}: {s.reps}
                  </Text>
                </View>
              );
            })}
            {sets.length > 3 && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.3)' }}>+{sets.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Target progress */}
        {mode === 'target' && (
          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 20 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <Animated.View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3, opacity: pulseAnim }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
              {targetType === 'reps' ? `${totalReps} / ${targetValue} ${T('exerciseReps')}` : `${Math.round(targetProgress * 100)}%`}
            </Text>
          </View>
        )}

        {/* Soft target (free mode) */}
        {mode === 'free' && softTarget && (
          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 20 }}>
            <Text style={{ fontSize: FONT_SUB, color: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 4 }}>
              {softTargetReached ? T('exerciseTargetReached') : softTargetLabel}
            </Text>
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, width: `${softTargetProgress * 100}%`, backgroundColor: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.2)', borderRadius: 2 }} />
            </View>
          </View>
        )}
      </View>

      {/* Zone 3: Bottom bar — duration + pause + calories */}
      <View style={{ paddingBottom: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('exerciseDuration')}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pauseHoldAnim }] }}>
          <TouchableOpacity
            onPress={handlePause}
            onPressIn={onPressInPauseLong}
            onPressOut={onPressOutPauseLong}
            style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Pause size={36} color="#333" />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: COLORS.ORANGE }}>{calories}</Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>kcal</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
