import React from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause } from 'lucide-react-native';
import { COLORS, FONT_HERO, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_TITLE, FONT_CLOSE, FONT_BODY, fmt } from '@egoless-do/core';
import type { ExerciseLayoutProps } from './types';
import ExerciseTopBar from '../shared/ExerciseTopBar';
import CelebrationOverlay from '../shared/CelebrationOverlay';
import MeditationMusicBar from '../../meditation/MeditationMusicBar';

export default function EnduranceActive(props: ExerciseLayoutProps) {
  const {
    icon, sportName, sec, mode, targetType, targetValue, targetProgress, targetInfo,
    selectedSound, showSoundPicker, onToggleSoundPicker, onSelectSound,
    showCelebration, celebrateAnim, milestoneText, milestoneAnim,
    handlePause, calories,
    musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onMusicPressTrackName,
    T,
  } = props;

  // Placeholder data for fields without data sources
  const floors = 0;
  const elevation = 0;
  const heartRate = '--';

  return (
    <LinearGradient colors={['#1a2e1a', '#0f1f0f', '#0a150a']} style={{ flex: 1 }}>
      <CelebrationOverlay showCelebration={showCelebration} celebrateAnim={celebrateAnim} milestoneText={milestoneText} milestoneAnim={milestoneAnim} />

      {/* Zone 1: Top bar */}
      <ExerciseTopBar
        icon={icon} sportName={sportName}
        targetInfo={targetInfo}
        selectedSound={selectedSound} showSoundPicker={showSoundPicker}
        onToggleSoundPicker={onToggleSoundPicker} onSelectSound={onSelectSound}
      />

      {/* Music bar — meditation style */}
      <View style={{ paddingHorizontal: 16 }}>
        <MeditationMusicBar
          track={musicTrack} isActive isPlaying={musicIsPlaying} primaryColor={COLORS.ORANGE}
          onPress={onMusicPressTrackName} onTogglePlay={onMusicTogglePlay}
        />
      </View>

      {/* Zone 2: Main — 1+2+2 data grid */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        {/* Primary metric */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ fontSize: FONT_HERO + 8, fontWeight: '900', color: COLORS.ORANGE, fontVariant: ['tabular-nums'] }}>
            {calories}
          </Text>
          <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{T('exerciseTotalBurn')} kcal</Text>
        </View>

        {/* Grid row 1 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{fmt(sec)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseTotalDuration')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{elevation}m</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseElevation')}</Text>
          </View>
        </View>

        {/* Grid row 2 */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{floors}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseFloors')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{heartRate}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseHeartRate')}</Text>
          </View>
        </View>

        {/* Target progress */}
        {mode === 'target' && (
          <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
              {T('exerciseTargetProgress').replace('{value}', targetType === 'time' ? `${Math.floor(targetValue / 60)}min` : `${targetValue}`).replace('{percent}', String(Math.round(targetProgress * 100)))}
            </Text>
          </View>
        )}
      </View>

      {/* Zone 3: Bottom — 3 buttons (Keep style) */}
      <View style={{ paddingBottom: 48, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Stop (red) */}
        <TouchableOpacity
          onPress={() => Alert.alert(T('exerciseFinish'), T('exerciseConfirmFinishMsg'), [
            { text: T('exerciseCancel'), style: 'cancel' },
            { text: T('exerciseSave'), style: 'destructive', onPress: () => props.handlePause() },
          ])}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: FONT_SUB, color: COLORS.RED, fontWeight: '700' }}>{T('exerciseStop')}</Text>
        </TouchableOpacity>

        {/* Continue/Pause (green) */}
        <TouchableOpacity onPress={handlePause}
          style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
          <Pause size={36} color="#fff" />
        </TouchableOpacity>

        {/* Settings placeholder (gray) */}
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.3)' }}>{T('settings')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
