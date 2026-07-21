import { COLORS, FONT_HERO, FONT_SUB, FONT_STAT_CARD, FONT_BODY, FONT_STAT_SECTION, FONT_CLOSE, fmt } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Pause } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

import MeditationMusicBar from '../../../components/MeditationMusicBar';
import CelebrationOverlay from '../shared/CelebrationOverlay';
import ExerciseTopBar from '../shared/ExerciseTopBar';
import RestOverlay from '../shared/RestOverlay';

import type { ExerciseLayoutProps } from './types';

export default function MeditativeActive(props: ExerciseLayoutProps) {
  const {
    icon, sportName, sec, mode, targetType, targetValue, targetProgress, targetInfo,
    isResting, restSec, skipRest, sets, currentSet,
    selectedSound, showSoundPicker, onToggleSoundPicker, onSelectSound,
    breathGuideEnabled, breathPhase, breathAnim,
    handlePause, onPressInPauseLong, onPressOutPauseLong, pauseHoldAnim,
    showCelebration, celebrateAnim, milestoneText, milestoneAnim, calories,
    musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onMusicPressTrackName,
    T, topInset,
  } = props;

  return (
    <LinearGradient colors={['#1a2a3a', '#0d1f2d', '#0a1520']} style={{ flex: 1 }}>
      {/* Rest overlay */}
      {isResting && (
        <RestOverlay restSec={restSec} lastSetReps={sets.length > 0 ? sets[sets.length - 1].reps : null} setIndex={sets.length} onSkip={skipRest} label={T('exerciseResting')} T={T} />
      )}

      {/* Celebration */}
      <CelebrationOverlay showCelebration={showCelebration} celebrateAnim={celebrateAnim} milestoneText={milestoneText} milestoneAnim={milestoneAnim} />

      {/* Zone 1: Top bar */}
      <ExerciseTopBar
        icon={icon} sportName={sportName}
        targetInfo={targetInfo}
        selectedSound={selectedSound} showSoundPicker={showSoundPicker}
        onToggleSoundPicker={onToggleSoundPicker} onSelectSound={onSelectSound}
        topInset={topInset}
      />

      {/* Music bar — meditation style */}
      <View style={{ paddingHorizontal: 16 }}>
        <MeditationMusicBar
          track={musicTrack} isActive isPlaying={musicIsPlaying} primaryColor={COLORS.GREEN}
          loop={musicLoop} onPress={onMusicPressTrackName} onTogglePlay={onMusicTogglePlay} onToggleLoop={onMusicToggleLoop}
        />
      </View>

      {/* Zone 2: Main — breathing guide */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        {breathGuideEnabled ? (
          <View style={{ alignItems: 'center' }}>
            <Animated.View style={{
              width: 160, height: 160, borderRadius: 80,
              borderWidth: 3, borderColor: COLORS.GREEN,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
              opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            }}>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>
                {breathPhase === 'inhale' ? '吸气...' : breathPhase === 'hold' ? '屏住...' : '呼气...'}
              </Text>
            </Animated.View>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
              {['inhale', 'hold', 'exhale'].map(p => (
                <View key={p} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: breathPhase === p ? COLORS.GREEN : 'rgba(255,255,255,.2)' }} />
              ))}
            </View>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: FONT_HERO(), fontWeight: '900', color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.65)', marginTop: 6 }}>min</Text>
          </>
        )}

        {/* Target progress */}
        {mode === 'target' && (
          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 20 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 4, textAlign: 'center' }}>
              {Math.round(targetProgress * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* Zone 3: Bottom — minimal 2 buttons */}
      <View style={{ paddingBottom: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('exerciseDuration')}</Text>
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
          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: COLORS.ORANGE }}>{calories}</Text>
          <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 2 }}>kcal</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
