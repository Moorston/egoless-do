import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, TagPill, ProgressBar, OutlineButton, useT } from '../../components/UI';
import { MEDITATION_DURATIONS_MIN, COLORS, getTodayMedMinutes, dateStr, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_HERO, FONT_BADGE, FONT_STAT_SECTION, createLogger } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';

const log = createLogger('Meditation');
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Binary, ChevronRight } from 'lucide-react-native';
import { useMusicStore } from '../music/useMusicStore';
import { audioSessionManager } from '../music/services/AudioSessionManager';
import MusicPickerModal from '../music/components/MusicPickerModal';
import MeditationMusicBar from './MeditationMusicBar';

// 实时会话
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { useSessionHeartbeat } from '../global-pulse/hooks/useSessionHeartbeat';
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export default function MeditationScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const {
    medHistory, totalMedMinutes, addMedMinutes,
  } = useShallowStore(s => ({
    medHistory: s.medHistory,
    totalMedMinutes: s.totalMedMinutes,
    addMedMinutes: s.addMedMinutes,
  }));
  const nav   = useRootNavigation();
  const T     = useT();

  const [durMin, setDurMin]       = useState(10);
  const [sec, setSec]             = useState(0);
  const [active, setActive]       = useState(false);
  const [showShare, setShowShare]   = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingDurMin, setPendingDurMin] = useState(0);
  const [noteText, setNoteText] = useState('');
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef    = useRef(false);
  const shareCardRef    = useRef<ViewShot>(null);
  const musicStartedRef = useRef(false);

  const targetSec = durMin * 60;
  const remaining = targetSec - sec;
  const pct = sec / targetSec * 100;
  const todayMedMin = useMemo(() => getTodayMedMinutes((medHistory ?? []).filter(m => !m.deleted)), [medHistory]);
  const todayMedCount = useMemo(() => (medHistory ?? []).filter(m => !m.deleted && m.date === dateStr()).length, [medHistory]);
  const totalMedCount = useMemo(() => (medHistory ?? []).filter(m => !m.deleted).length, [medHistory]);

  // ── 实时会话管理 ──
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [insight, setInsight] = useState('');
  const { resolveGoal } = useGoalResolver();

  // 心跳
  useSessionHeartbeat(sessionId, sessionId ? 'meditation' : null);

  // 创建会话
  const createMeditationSession = useCallback(async () => {
    const userHash = useAppStore.getState().auth.user?.id || '';
    if (!userHash) return;
    const goal = resolveGoal('meditation');
    try {
      const result = await createSession({
        user_hash: userHash,
        nickname: useAppStore.getState().userProfile?.nickname || '',
        type: 'meditation',
        goal: goal || undefined,
      });
      if (result.success && result.data) {
        sessionIdRef.current = result.data.session_id;
        setSessionId(result.data.session_id);
      }
    } catch (e) {
      log.warn('Failed to create meditation session', e);
    }
  }, [resolveGoal]);

  // 删除会话
  const cleanupSession = useCallback(() => {
    if (sessionIdRef.current) {
      deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

  // 更新感悟
  const handleInsightChange = useCallback((text: string) => {
    setInsight(text);
    if (sessionIdRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        updateSession(sessionIdRef.current!, { insight: text });
      }, 1000);
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => () => { cleanupSession(); }, [cleanupSession]);

  // Music store — only for playback control
  const musicPlay = useMusicStore(s => s.play);
  const musicPause = useMusicStore(s => s.pause);
  const musicStop = useMusicStore(s => s.stop);
  const musicIsPlaying = useMusicStore(s => s.isPlaying);

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
    }).catch((e) => log.error(e));
  }, []);

  const playBell = useCallback(() => {
    try {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    } catch {}
  }, [bellPlayer]);

  // Cleanup timer + music on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (musicStartedRef.current) {
      musicStop();
      audioSessionManager.notifyStopped('music');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Start music when meditation begins — route through AudioSessionManager
  useEffect(() => {
    if (active && selectedTrack) {
      const allowed = audioSessionManager.requestPlay('music');
      if (allowed) {
        musicStartedRef.current = true;
        musicPlay(selectedTrack);
      } else {
        musicStartedRef.current = false;
      }
    }
  }, [active, selectedTrack, musicPlay]);

  // Detect timer completion
  useEffect(() => {
    if (active && sec >= targetSec) {
      if (timerRef.current) clearInterval(timerRef.current);
      setActive(false);
      cleanupSession();
      if (!completedRef.current) {
        completedRef.current = true;
        setPendingDurMin(durMin);
        setNoteText('');
        setShowNoteModal(true);
      }
      if (musicStartedRef.current) {
        musicStop();
        audioSessionManager.notifyStopped('music');
        musicStartedRef.current = false;
      }
      playBell();
    }
  }, [sec, active, targetSec, durMin, playBell, musicStop, cleanupSession]);

  const handleStop = () => {
    const wasCompleted = completedRef.current;
    if (active && !wasCompleted) {
      completedRef.current = true;
      const elapsedMin = Math.round((sec) / 60);
      if (elapsedMin > 0) {
        setPendingDurMin(elapsedMin);
        setNoteText('');
        setShowNoteModal(true);
      }
    }
    setActive(false);
    cleanupSession();
    if (musicStartedRef.current) {
      musicStop();
      audioSessionManager.notifyStopped('music');
      musicStartedRef.current = false;
    }
    if (!wasCompleted) playBell();
  };

  const handleStart = () => {
    setSec(0);
    setActive(true);
    createMeditationSession();
  };

  const handleMusicPickerClose = useCallback(() => {
    // Pause preview music, keep selectedTrack for display
    musicPause();
    audioSessionManager.notifyStopped('music');
    setShowMusicPicker(false);
  }, [musicPause]);

  const handleSelectNoMusic = useCallback(() => {
    setSelectedTrack(null);
    musicStop();
    audioSessionManager.notifyStopped('music');
    setShowMusicPicker(false);
  }, [musicStop]);

  const handleShare = useCallback(async () => {
    try {
      if (shareCardRef.current?.capture) {
        const uri = await shareCardRef.current.capture();
        await Sharing.shareAsync(uri, { dialogTitle: T('shareMed'), mimeType: 'image/png' });
      }
    } catch (e) { log.warn('Share failed:', e); }
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
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{todayMedMin}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('medMinutes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('medTitle')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{todayMedCount}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('medTodayCount')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{totalMedMinutes}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('medMinutes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('accMed')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{totalMedCount}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('shareCardSession')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => nav.navigate('GlobalMap', { icon: '🧘', title: `${T('linkWorld')} — ${T('globalMeditators')}`, type: 'meditation' })}
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
              {/* 在线人数 + 感悟输入 */}
              <ActiveInsightBar
                type="meditation"
                insight={insight}
                onInsightChange={handleInsightChange}
                goal={resolveGoal('meditation')}
              />
              {/* Music display during meditation — non-interactive */}
              <MeditationMusicBar track={selectedTrack} isActive isPlaying={musicIsPlaying} primaryColor={P} />
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
                {new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}
              </Text>
              <View style={{ width:'100%', height:1, backgroundColor:'rgba(255,255,255,0.15)', marginBottom:28 }} />
              <View style={{ width:'100%', gap:28, alignItems:'center' }}>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{totalMedMinutes}</Text>
                  <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:FONT_SUB }}>{T('accMed')}</Text>
                </View>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{todayMedMin}</Text>
                  <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:FONT_SUB }}>{T('medTitle')}</Text>
                </View>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#a78bfa', fontSize:FONT_STAT_SECTION, fontWeight:'800' }}>{totalMedCount}</Text>
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

      {/* Note Input Modal */}
      <Modal visible={showNoteModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, textAlign: 'center', marginBottom: 4 }}>冥想完成 ✨</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 20 }}>{pendingDurMin} 分钟</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 8 }}>想记录点什么吗？(可选)</Text>
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, maxHeight: 120, textAlignVertical: 'top', marginBottom: 20 }}
              multiline maxLength={500} value={noteText} onChangeText={setNoteText}
              placeholder="写下此刻的感悟..." placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { addMedMinutes(pendingDurMin, selectedTrack?.id); setShowNoteModal(false); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}
              >
                <Text style={{ color: TH.sub, fontWeight: '600', fontSize: FONT_BODY }}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { addMedMinutes(pendingDurMin, selectedTrack?.id, noteText.trim() || undefined); setShowNoteModal(false); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
