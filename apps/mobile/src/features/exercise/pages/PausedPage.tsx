import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT_HERO, FONT_SUB, FONT_STAT_CARD, FONT_TITLE, fmt, getMinDuration } from '@egoless-do/core';
import type { ExercisePageProps } from './types';
import MeditationMusicBar from '../../meditation/MeditationMusicBar';

export default function PausedPage(props: ExercisePageProps) {
  const {
    sportName, sportType, sec, holdAnim, scaleAnim, pulseAnim, isGpsSport, distKm, sets, currentSetReps,
    musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onPressMusic,
    handleContinue, handleHoldEnd,
    setPage, onGoBack, T,
  } = props;

  const pausedReps = sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;

  const btnSize = 88;
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringSvgSize = btnSize + 16;
  const ringCenter = ringSvgSize / 2;

  const [holding, setHolding] = useState(false);
  const [ringOffset, setRingOffset] = useState(ringCircumference);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const onHoldStart = useCallback(() => {
    setHolding(true);
    setRingOffset(ringCircumference);
    startTimeRef.current = Date.now();
    Animated.spring(scaleAnim, { toValue: 1.2, damping: 8, stiffness: 200, useNativeDriver: true }).start();
    const tick = () => {
      const p = Math.min((Date.now() - startTimeRef.current) / 3000, 1);
      setRingOffset(ringCircumference * (1 - p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // 检查最短时长阈值
        const minDur = getMinDuration(sportName);
        if (sec < minDur) {
          setHolding(false);
          setRingOffset(ringCircumference);
          Animated.spring(scaleAnim, { toValue: 1, damping: 10, useNativeDriver: true }).start();
          Alert.alert(T('exerciseTooShort'), T('exerciseTooShortMsg'), [
            { text: T('exerciseContinue'), style: 'cancel' },
            { text: T('exerciseEnd'), style: 'destructive', onPress: () => onGoBack?.() },
          ]);
        } else {
          pulseAnim.setValue(0);
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          Animated.spring(scaleAnim, { toValue: 1, damping: 10, useNativeDriver: true }).start();
          if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
          navigateTimerRef.current = setTimeout(() => setPage?.('report'), 400);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [scaleAnim, pulseAnim, ringCircumference, sportName, sec, setPage, onGoBack]);

  const onHoldEnd = useCallback(() => {
    stopAnimation();
    setHolding(false);
    setRingOffset(ringCircumference);
    Animated.spring(scaleAnim, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    handleHoldEnd();
  }, [stopAnimation, scaleAnim, handleHoldEnd, ringCircumference]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);
  useEffect(() => () => { if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current); }, []);

  const strokeDashoffset = holding ? ringOffset : ringCircumference;

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      {/* Zone 1: Top bar */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>{T('exercisePaused')}</Text>
      </View>

      {/* Music bar */}
      {musicTrack && (
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <MeditationMusicBar
            track={musicTrack}
            isActive
            isPlaying={musicIsPlaying ?? false}
            primaryColor={COLORS.ORANGE}
            loop={musicLoop}
            onTogglePlay={onMusicTogglePlay}
            onToggleLoop={onMusicToggleLoop}
            onPress={onPressMusic}
          />
        </View>
      )}

      {/* Zone 2: Main content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', gap: 24, marginBottom: 32 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{fmt(sec)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseTotalDuration')}</Text>
          </View>
          {sportType === 'repetition' && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{pausedReps}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseReps')}</Text>
            </View>
          )}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{sets.length}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseSets') || '组'}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: COLORS.ORANGE }}>{props.calories}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>kcal</Text>
          </View>
        </View>

        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>
          {isGpsSport ? distKm.toFixed(2) : sportType === 'repetition' ? pausedReps : Math.floor(sec / 60)}
        </Text>
        <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>
          {isGpsSport ? 'km' : sportType === 'repetition' ? T('exerciseReps') : 'min'}
        </Text>
        <Text style={{ fontSize: FONT_STAT_CARD, color: 'rgba(255,255,255,.7)', marginTop: 16 }}>{fmt(sec)}</Text>
      </View>

      {/* Zone 3: Bottom bar */}
      <View style={{ paddingBottom: 48, paddingHorizontal: 24, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
          {/* Hold to finish — left */}
          <TouchableOpacity
            onPressIn={onHoldStart}
            onPressOut={onHoldEnd}
            activeOpacity={1}
            style={{ width: ringSvgSize, height: ringSvgSize, alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulse wave */}
            <Animated.View style={{
              position: 'absolute',
              width: btnSize, height: btnSize, borderRadius: btnSize / 2,
              borderWidth: 3, borderColor: 'rgba(255,255,255,.7)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            }} />

            {/* Button with spring scale */}
            <Animated.View style={{
              width: btnSize, height: btnSize, borderRadius: btnSize / 2,
              backgroundColor: COLORS.RED,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: scaleAnim }],
            }}>
              <Pause size={36} color="#fff" />
            </Animated.View>

            {/* SVG progress ring — rendered ON TOP of button, pass-through touches */}
            <View pointerEvents="none" style={{ position: 'absolute', width: ringSvgSize, height: ringSvgSize }}>
              <Svg width={ringSvgSize} height={ringSvgSize}>
                <Circle cx={ringCenter} cy={ringCenter} r={ringRadius}
                  stroke="rgba(255,255,255,.2)" strokeWidth={5} fill="none" />
                <Circle cx={ringCenter} cy={ringCenter} r={ringRadius}
                  stroke="#fff" strokeWidth={5} fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" rotation="-90" origin={`${ringCenter},${ringCenter}`} />
              </Svg>
            </View>
          </TouchableOpacity>

          {/* Continue — right */}
          <TouchableOpacity onPress={handleContinue}
            style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={36} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
