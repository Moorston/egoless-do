import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, ScreenHeader, TagPill, ProgressBar, useT } from '../../components/UI';
import { fmtMS, MEDITATION_DURATIONS_MIN, MED_SOUNDS, COLORS } from '@egoless-do/core';

// Local sound files
const SOUND_FILES: Record<string, number> = {
  '海潮': require('../../../assets/sounds/ocean.mp3'),
  '雨声': require('../../../assets/sounds/rain.mp3'),
  '钵声': require('../../../assets/sounds/bowl.mp3'),
  '鸟叫': require('../../../assets/sounds/birds.mp3'),
  '流水': require('../../../assets/sounds/flowing-stream.mp3'),
  '风铃': require('../../../assets/sounds/wind-chimes.mp3'),
};
const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export default function MeditationScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useNavigation();
  const T     = useT();

  const [durMin, setDurMin]       = useState(10);
  const [sec, setSec]             = useState(0);
  const [active, setActive]       = useState(false);
  const [sound, setSound]         = useState('海潮');
  const [audioError, setAudioError] = useState<string | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const targetSec = durMin * 60;
  const remaining = targetSec - sec;
  const pct = sec / targetSec * 100;

  // Background sound player (looping, 30% volume)
  const bgSource = SOUND_FILES[sound];
  const bgPlayer = useAudioPlayer(bgSource ?? undefined);
  bgPlayer.loop = true;
  bgPlayer.volume = 0.3;

  // Bell sound player (one-shot, 50% volume)
  const bellPlayer = useAudioPlayer(BELL_FILE);
  bellPlayer.volume = 0.5;

  // Init audio session
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch((e) => console.error('[err]', e));
  }, []);

  const playBgSound = useCallback(() => {
    try {
      if (bgSource) bgPlayer.play();
      setAudioError(null);
    } catch {
      setAudioError('medLoadError');
    }
  }, [bgSource]);

  const stopBgSound = useCallback(() => {
    try {
      bgPlayer.pause();
      bgPlayer.seekTo(0);
    } catch {}
  }, []);

  const playBell = useCallback(() => {
    try {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    } catch {}
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (active) {
      completedRef.current = false;
      playBgSound();
      timerRef.current = setInterval(() => {
        setSec(s => {
          if (s + 1 >= targetSec) {
            if (timerRef.current) clearInterval(timerRef.current);
            setActive(false);
            if (!completedRef.current) {
              completedRef.current = true;
              store.addMedMinutes(durMin);
            }
            stopBgSound();
            playBell();
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, targetSec]);

  const handleStop = () => {
    if (active && !completedRef.current) {
      completedRef.current = true;
      const elapsedMin = Math.round((sec) / 60);
      if (elapsedMin > 0) store.addMedMinutes(elapsedMin);
    }
    setActive(false);
    stopBgSound();
    playBell();
  };

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {audioError && (
          <View style={{ backgroundColor:'#F59E0B', borderRadius:12, padding:12, marginBottom:12, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:16 }}>{T(audioError)}</Text>
          </View>
        )}

        {/* Accumulated */}
        <Card style={{ alignItems:'center', paddingVertical:20 }}>
          <Text style={{ fontSize:36, fontWeight:'800', color:P }}>{store.totalMedMinutes}</Text>
          <Text style={{ color:TH.sub, fontSize:16 }}>{T('accMed')}</Text>
        </Card>

        {/* Main card */}
        <Card style={{ paddingVertical:32 }}>
          {active ? (
            <View style={{ alignItems:'center' }}>
              <View style={{ backgroundColor:`${P}18`, borderRadius:20, padding:28, marginBottom:20, width:'100%', alignItems:'center' }}>
                <Text style={{ fontSize:56, fontWeight:'800', color:P, letterSpacing:2 }}>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </Text>
                <Text style={{ color:TH.sub, fontSize:16, marginTop:6 }}>
                  {T('medActive')} {sound !== '无' ? `🎵 ${sound}` : ''}
                </Text>
              </View>
              <View style={{ width:'80%', marginBottom:16 }}>
                <ProgressBar pct={pct} color={P} />
              </View>
              <PrimaryButton label={T('stopMed')} onPress={handleStop} color={COLORS.RED} style={{ paddingHorizontal:48 }} />
            </View>
          ) : (
            <>
              {/* Sound selector */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:TH.border, marginBottom:12 }}>
                <Text style={{ fontSize:16, color:TH.sub }}>{T('bgMusic')}</Text>
                <Text style={{ color:P, fontSize:16 }}>🎵 {sound} ›</Text>
              </View>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                {MED_SOUNDS.map(s => (
                  <TagPill key={s} label={s} active={sound===s} onPress={() => setSound(s)} />
                ))}
              </View>

              {/* Duration selector */}
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {MEDITATION_DURATIONS_MIN.map(d => (
                  <TagPill key={d} label={`${d}${T('medMinutes')}`} active={durMin===d}
                    onPress={() => { setDurMin(d); setSec(0); setActive(false); }} />
                ))}
              </View>

              <PrimaryButton label={T('startMed')} onPress={() => { setSec(0); setActive(true); }} color={COLORS.GREEN} />
            </>
          )}
        </Card>

        {/* Today card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={{ color:TH.text }}>{T('medTitle')}</Text>
            <Text style={{ color:P, fontWeight:'600' }}>{store.totalMedMinutes} {T('medMinutes')}</Text>
          </View>
        </Card>

        {/* Global meditators */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Text style={{ fontSize:18 }}>🌍</Text>
          <Text style={{ fontSize:16, color:TH.text }}>{T('globalMeditators')}</Text>
          <Text style={{ marginLeft:'auto', color:TH.sub }}>›</Text>
        </TouchableOpacity>

        {/* History entry */}
        <TouchableOpacity onPress={() => (nav as any).navigate('MedHistory')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Text style={{ fontSize:18 }}>☯</Text>
          <Text style={{ fontSize:16, color:TH.text }}>{T('meditationHistory')}</Text>
          <Text style={{ marginLeft:'auto', color:TH.sub }}>›</Text>
        </TouchableOpacity>

        {/* Share */}
        <PrimaryButton label={T('shareMed')} onPress={() => {}} />

        <Text style={{ textAlign:'center', fontSize:16, color:TH.sub, marginTop:12 }}>{T('medAttribution')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
