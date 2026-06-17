import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, TagPill, ProgressBar, OutlineButton, useT } from '../../components/UI';
import { MEDITATION_DURATIONS_MIN, COLORS, getTodayMedMinutes, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_HERO, FONT_BADGE, FONT_STAT_SECTION } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Binary, ChevronRight } from 'lucide-react-native';
import { useMusicStore } from '../music/useMusicStore';
import MusicPickerModal from '../music/MusicPickerModal';
import MeditationMusicBar from './MeditationMusicBar';

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export default function MeditationScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useRootNavigation();
  const T     = useT();

  const [durMin, setDurMin]       = useState(10);
  const [sec, setSec]             = useState(0);
  const [active, setActive]       = useState(false);
  const [showShare, setShowShare]   = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const shareCardRef = useRef<ViewShot>(null);

  const targetSec = durMin * 60;
  const remaining = targetSec - sec;
  const pct = sec / targetSec * 100;
  const todayMedMin = useMemo(() => getTodayMedMinutes(store.medHistory ?? []), [store.medHistory]);

  // Music store — only for playback control
  const musicPlay = useMusicStore(s => s.play);
  const musicPause = useMusicStore(s => s.pause);
  const musicStop = useMusicStore(s => s.stop);

  // Bell sound player (one-shot, 50% volume)
  const bellPlayer = useAudioPlayer(BELL_FILE);

  useEffect(() => {
    bellPlayer.volume = 0.5;
  }, [bellPlayer]);

  // Init audio session
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch((e) => console.error('[err]', e));
  }, []);

  const playBell = useCallback(() => {
    try {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    } catch {}
  }, [bellPlayer]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (active) {
      completedRef.current = false;
      timerRef.current = setInterval(() => {
        setSec(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  // Start music when meditation begins
  useEffect(() => {
    if (active && selectedTrack) {
      musicPlay(selectedTrack);
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect timer completion
  const addMedMinutes = store.addMedMinutes;
  useEffect(() => {
    if (active && sec >= targetSec) {
      if (timerRef.current) clearInterval(timerRef.current);
      setActive(false);
      if (!completedRef.current) {
        completedRef.current = true;
        addMedMinutes(durMin);
      }
      musicStop();
      playBell();
    }
  }, [sec, active, targetSec, durMin, addMedMinutes, playBell, musicStop]);

  const handleStop = () => {
    if (active && !completedRef.current) {
      completedRef.current = true;
      const elapsedMin = Math.round((sec) / 60);
      if (elapsedMin > 0) store.addMedMinutes(elapsedMin);
    }
    setActive(false);
    musicStop();
    playBell();
  };

  const handleStart = () => {
    setSec(0);
    setActive(true);
  };

  const handleMusicPickerClose = useCallback(() => {
    // Pause preview music, keep selectedTrack for display
    musicPause();
    setShowMusicPicker(false);
  }, [musicPause]);

  const handleSelectNoMusic = useCallback(() => {
    setSelectedTrack(null);
    musicStop();
    setShowMusicPicker(false);
  }, [musicStop]);

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
      <SimpleHeader routeName="Meditation" />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {/* Hero Banner */}
        <View style={{ marginHorizontal: 0, marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#7117EA', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>{T('meditation')}</Text>
              <TouchableOpacity onPress={() => nav.navigate('MedHistory')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.8)', fontWeight: '600' }}>{T('meditationHistory')}</Text>
                <ChevronRight size={16} color="rgba(255,255,255,.8)" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{store.totalMedMinutes}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('medMinutes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('accMed')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{todayMedMin}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('medMinutes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('medTitle')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{(store.medHistory ?? []).length}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('shareCardSession')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => nav.navigate('GlobalMap', { icon: '🧘', title: `${T('linkWorld')} — ${T('globalMeditators')}` })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.2)' }}>
              <Globe size={18} color="rgba(255,255,255,.8)" />
              <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.8)', fontWeight: '600', flex: 1 }}>{T('linkWorld')} — {T('globalMeditators')}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,.8)" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Main card */}
        <Card style={{ paddingVertical:32 }}>
          {active ? (
            <View style={{ alignItems:'center' }}>
              {/* Music display during meditation — non-interactive */}
              <MeditationMusicBar track={selectedTrack} isActive isPlaying={!!selectedTrack} primaryColor={P} />
              <View style={{ backgroundColor:`${P}18`, borderRadius:20, padding:28, marginBottom:20, width:'100%', alignItems:'center' }}>
                <Text style={{ fontSize:FONT_HERO, fontWeight:'800', color:P, letterSpacing:2 }}>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </Text>
                <Text style={{ color:TH.sub, fontSize:FONT_BODY, marginTop:6 }}>
                  {T('medActive')}
                </Text>
              </View>
              <View style={{ width:'80%', marginBottom:16 }}>
                <ProgressBar pct={pct} color={P} />
              </View>
              <PrimaryButton label={T('stopMed')} onPress={handleStop} color={COLORS.RED} style={{ paddingHorizontal:48 }} />
            </View>
          ) : (
            <>
              {/* Music selector — tappable to open picker */}
              <MeditationMusicBar track={selectedTrack} isActive={false} isPlaying={false} primaryColor={P} onPress={() => setShowMusicPicker(true)} />

              {/* Duration selector */}
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {MEDITATION_DURATIONS_MIN.map(d => (
                  <TagPill key={d} label={`${d}${T('medMinutes')}`} active={durMin===d}
                    onPress={() => { setDurMin(d); setSec(0); setActive(false); }} textActiveColor={TH.sub} />
                ))}
              </View>

              <PrimaryButton label={T('startMed')} onPress={handleStart} color={P} />
            </>
          )}
        </Card>
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

      {/* Music Picker Modal */}
      <MusicPickerModal
        visible={showMusicPicker}
        onClose={handleMusicPickerClose}
        onSelectTrack={setSelectedTrack}
        onSelectNoMusic={handleSelectNoMusic}
        primaryColor={P}
        selectedTrackId={selectedTrack?.id ?? null}
      />
    </SafeAreaView>
  );
}
