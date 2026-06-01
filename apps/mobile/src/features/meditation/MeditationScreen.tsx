import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, ScreenHeader, TagPill, ProgressBar, OutlineButton, useT } from '../../components/UI';
import { fmtMS, MEDITATION_DURATIONS_MIN, MED_SOUNDS, COLORS, getTodayMedMinutes, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_HERO, FONT_BADGE, FONT_STAT_SECTION } from '@egoless-do/core';
import { Music, Globe, Binary, ChevronRight, Clock } from 'lucide-react-native';

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
  const [showShare, setShowShare]   = useState(false);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const shareCardRef = useRef<ViewShot>(null);

  const targetSec = durMin * 60;
  const remaining = targetSec - sec;
  const pct = sec / targetSec * 100;
  const todayMedMin = useMemo(() => getTodayMedMinutes(store.medHistory ?? []), [store.medHistory]);

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
  }, [bgSource, bgPlayer]);

  const stopBgSound = useCallback(() => {
    try {
      if (bgPlayer.playing) {
        bgPlayer.pause();
        bgPlayer.seekTo(0);
      }
    } catch {}
  }, [bgPlayer]);

  const playBell = useCallback(() => {
    try {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    } catch {}
  }, [bellPlayer]);

  // Cleanup timer and audio on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (bgPlayer.playing) {
        bgPlayer.pause();
        bgPlayer.seekTo(0);
      }
    } catch {}
  }, [bgPlayer]);

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
      stopBgSound();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, targetSec, playBgSound, stopBgSound, playBell]);

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

  const handleShare = useCallback(async () => {
    try {
      if (shareCardRef.current?.capture) {
        const uri = await shareCardRef.current.capture();
        await Sharing.shareAsync(uri, { dialogTitle: T('shareMed'), mimeType: 'image/png' });
      }
    } catch (e) { console.warn('Share failed:', e); }
    setShowShare(false);
  }, [T]);

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {audioError && (
          <View style={{ backgroundColor:'#F59E0B', borderRadius:12, padding:12, marginBottom:12, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:FONT_BODY }}>{T(audioError)}</Text>
          </View>
        )}

        {/* Accumulated */}
        <Card style={{ alignItems:'center', paddingVertical:20 }}>
          <Text style={{ fontSize:FONT_STAT_SECTION, fontWeight:'800', color:P }}>{store.totalMedMinutes}</Text>
          <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('accMed')}</Text>
        </Card>

        {/* Main card */}
        <Card style={{ paddingVertical:32 }}>
          {active ? (
            <View style={{ alignItems:'center' }}>
              <View style={{ backgroundColor:`${P}18`, borderRadius:20, padding:28, marginBottom:20, width:'100%', alignItems:'center' }}>
                <Text style={{ fontSize:FONT_HERO, fontWeight:'800', color:P, letterSpacing:2 }}>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </Text>
                <Text style={{ color:TH.sub, fontSize:FONT_BODY, marginTop:6 }}>
                  {T('medActive')} {sound !== '无' ? <><Music size={14} color={TH.sub} /> {sound}</> : ''}
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
                <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T('bgMusic')}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <Music size={16} color={P} />
                  <Text style={{ color:P, fontSize:FONT_BODY }}>{sound}</Text>
                  <ChevronRight size={16} color={P} />
                </View>
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

              <PrimaryButton label={T('startMed')} onPress={() => { setSec(0); setActive(true); }} color={P} />
            </>
          )}
        </Card>

        {/* Today card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Clock size={18} color={P} />
              <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('medTitle')}</Text>
            </View>
            <Text style={{ color:P, fontWeight:'600' }}>{todayMedMin} {T('medMinutes')}</Text>
          </View>
        </Card>

        {/* Global meditators */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap', { icon: 'Globe', title: `${T('linkWorld')} — ${T('globalMeditators')}` })}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Globe size={18} color={P} />
          <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('linkWorld')} — {T('globalMeditators')}</Text>
          <ChevronRight size={18} color={TH.sub} style={{ marginLeft:'auto' }} />
        </TouchableOpacity>

        {/* History entry */}
        <TouchableOpacity onPress={() => (nav as any).navigate('MedHistory')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Binary size={18} color={P} />
          <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('meditationHistory')}</Text>
          <ChevronRight size={18} color={TH.sub} style={{ marginLeft:'auto' }} />
        </TouchableOpacity>

        <Text style={{ textAlign:'center', fontSize:FONT_BODY, color:TH.sub, marginTop:12 }}>{T('medAttribution')}</Text>
      </ScrollView>

      {/* Share Card Modal */}
      <Modal visible={showShare} transparent animationType="fade" onRequestClose={() => setShowShare(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.75)', justifyContent:'center', alignItems:'center', padding:24 }}>
          <ViewShot ref={shareCardRef} options={{ format:'png', quality:1 }} style={{ width:300, borderRadius:20, overflow:'hidden' }}>
            <View style={{ backgroundColor:'#1a1040', paddingVertical:40, paddingHorizontal:24, alignItems:'center' }}>
              <Text style={{ color:'#e2d9f3', fontSize:FONT_TITLE, fontWeight:'600', marginBottom:20 }}>{T('shareCardTitle')}</Text>
              <Binary size={64} color="#e2d9f3" style={{ marginBottom:12 }} />
              <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:FONT_SUB, marginBottom:20 }}>
                {new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}
              </Text>
              <View style={{ width:'100%', height:1, backgroundColor:'rgba(255,255,255,0.15)', marginBottom:28 }} />
              <View style={{ width:'100%', gap:28, alignItems:'center' }}>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{store.totalMedMinutes}</Text>
                  <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:FONT_SUB }}>{T('accMed').replace(/\s*\(.*\)/, '')}</Text>
                </View>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{todayMedMin}</Text>
                  <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:FONT_SUB }}>{T('medTitle')}</Text>
                </View>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{(store.medHistory ?? []).length}</Text>
                  <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:FONT_SUB }}>{T('shareCardSession')}</Text>
                </View>
              </View>
              <Text style={{ color:'rgba(255,255,255,0.3)', fontSize:FONT_BADGE, marginTop:32 }}>egoless-do.app</Text>
            </View>
          </ViewShot>
          <View style={{ flexDirection:'row', gap:12, marginTop:20, width:300 }}>
            <OutlineButton label={T('cancel')} onPress={() => setShowShare(false)} style={{ flex:1 }} />
            <PrimaryButton label={T('shareCardDownload')} onPress={handleShare} color={P} style={{ flex:1 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
