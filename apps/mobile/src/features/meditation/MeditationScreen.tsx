import { MEDITATION_DURATIONS_MIN, COLORS, getTodayMedMinutes, dateStr, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_HERO, FONT_BADGE, FONT_STAT_SECTION, createLogger } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Globe, Binary, ChevronRight } from 'lucide-react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { Card, useTheme, PrimaryButton, TagPill, ProgressBar, OutlineButton, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

const log = createLogger('Meditation');
import SimpleHeader from '../../navigation/SimpleHeader';
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { useSessionHeartbeat } from '../global-pulse/hooks/useSessionHeartbeat';
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';
import MusicPickerModal from '../music/components/MusicPickerModal';
import { audioSessionManager } from '../../services/AudioSessionManager';
import { useMusicStore } from '../music/useMusicStore';
import MeditationMusicBar from '../../components/MeditationMusicBar';

// 实时会话

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
    } catch { /* bell audio unavailable — ignore */ }
  }, [bellPlayer]);

  // Cleanup timer + music on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (musicStartedRef.current) {
      musicStop();
      audioSessionManager.notifyStopped('music');
    }
  }, [musicStop]);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['#7117EA', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>{T('meditation')}</Text>
              <TouchableOpacity onPress={() => nav.navigate('MedHistory')} style={styles.heroHistoryLink}>
                <Text style={styles.heroHistoryText}>{T('meditationHistory')}</Text>
                <ChevronRight size={16} color="rgba(255,255,255,.8)" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatNumber}>{todayMedMin}</Text>
                <Text style={styles.heroStatLabel}>{T('medMinutes')}</Text>
                <Text style={styles.heroStatSub}>{T('medTitle')}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatNumber}>{todayMedCount}</Text>
                <Text style={styles.heroStatLabel}>{T('fastTimes')}</Text>
                <Text style={styles.heroStatSub}>{T('medTodayCount')}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatNumber}>{totalMedMinutes}</Text>
                <Text style={styles.heroStatLabel}>{T('medMinutes')}</Text>
                <Text style={styles.heroStatSub}>{T('accMed')}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatNumber}>{totalMedCount}</Text>
                <Text style={styles.heroStatLabel}>{T('fastTimes')}</Text>
                <Text style={styles.heroStatSub}>{T('shareCardSession')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => nav.navigate('GlobalMap', { icon: '🧘', title: `${T('linkWorld')} — ${T('globalMeditators')}`, type: 'meditation' })}
              style={styles.heroGlobalLink}>
              <Globe size={18} color="rgba(255,255,255,.8)" />
              <Text style={styles.heroGlobalText}>{T('linkWorld')} — {T('globalMeditators')}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,.8)" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Main card */}
        <Card style={styles.mainCard}>
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
                <Text style={{ fontSize:FONT_HERO(), fontWeight:'800', color:P, letterSpacing:2 }}>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </Text>
                <Text style={{ color:TH.sub, fontSize:FONT_BODY(), marginTop:6 }}>
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
              {/* TODO(perf): duration selector is a short wrap-row of chips
                  (MEDITATION_DURATIONS_MIN = 11 items) inside a Card/ScrollView — below the
                  >50-item fixed-height threshold. Leave as .map(). */}
              <View style={styles.durationSelector}>
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
        <View style={styles.shareOverlay}>
          <ViewShot ref={shareCardRef} options={{ format:'png', quality:1 }} style={styles.shareViewShot}>
            <View style={styles.shareCard}>
              <Text style={styles.shareTitle}>{T('shareCardTitle')}</Text>
              <Binary size={64} color="#e2d9f3" style={styles.shareIcon} />
              <Text style={styles.shareDate}>
                {new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}
              </Text>
              <View style={styles.shareDivider} />
              <View style={styles.shareStatsContainer}>
                <View style={styles.shareStatCol}>
                  <Text style={styles.shareStatNumber}>{totalMedMinutes}</Text>
                  <Text style={styles.shareStatLabel}>{T('accMed')}</Text>
                </View>
                <View style={styles.shareStatCol}>
                  <Text style={styles.shareStatNumber}>{todayMedMin}</Text>
                  <Text style={styles.shareStatLabel}>{T('medTitle')}</Text>
                </View>
                <View style={styles.shareStatCol}>
                  <Text style={styles.shareStatNumber}>{totalMedCount}</Text>
                  <Text style={styles.shareStatLabel}>{T('shareCardSession')}</Text>
                </View>
              </View>
              <Text style={styles.shareFooter}>egoless-do.app</Text>
            </View>
          </ViewShot>
          <View style={styles.shareButtonsRow}>
            <OutlineButton label={T('cancel')} onPress={() => setShowShare(false)} style={styles.shareBtnFlex} />
            <PrimaryButton label={T('shareCardDownload')} onPress={handleShare} color={P} style={styles.shareBtnFlex} />
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
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, textAlign: 'center', marginBottom: 4 }}>冥想完成 ✨</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', marginBottom: 20 }}>{pendingDurMin} 分钟</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600', marginBottom: 8 }}>想记录点什么吗？(可选)</Text>
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), minHeight: 80, maxHeight: 120, textAlignVertical: 'top', marginBottom: 20 }}
              multiline maxLength={500} value={noteText} onChangeText={setNoteText}
              placeholder="写下此刻的感悟..." placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { addMedMinutes(pendingDurMin, selectedTrack?.id); setShowNoteModal(false); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}
              >
                <Text style={{ color: TH.sub, fontWeight: '600', fontSize: FONT_BODY() }}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { addMedMinutes(pendingDurMin, selectedTrack?.id, noteText.trim() || undefined); setShowNoteModal(false); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY() }}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroGradient: {
    padding: 16,
    borderRadius: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Hero Banner 区域
  heroTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    color: '#fff',
  },
  heroHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroHistoryText: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.8)',
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatNumber: {
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '900',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: FONT_SUB(),
    color: 'rgba(255,255,255,.7)',
    marginTop: 2,
  },
  heroStatSub: {
    fontSize: FONT_SUB(),
    color: 'rgba(255,255,255,.5)',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,.2)',
    marginVertical: 4,
  },
  heroGlobalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.2)',
  },
  heroGlobalText: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.8)',
    fontWeight: '600',
    flex: 1,
  },
  // 主卡片
  mainCard: {
    paddingVertical: 32,
  },
  // 时长选择器
  durationSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  // 分享卡片
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shareViewShot: {
    width: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  shareCard: {
    backgroundColor: '#1a1040',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shareTitle: {
    color: '#e2d9f3',
    fontSize: FONT_TITLE(),
    fontWeight: '600',
    marginBottom: 20,
  },
  shareIcon: {
    marginBottom: 12,
  },
  shareDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT_SUB(),
    marginBottom: 20,
  },
  shareDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 28,
  },
  shareStatsContainer: {
    width: '100%',
    gap: 28,
    alignItems: 'center',
  },
  shareStatCol: {
    alignItems: 'center',
  },
  shareStatNumber: {
    color: '#a78bfa',
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '800',
  },
  shareStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SUB(),
  },
  shareFooter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_BADGE(),
    marginTop: 32,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: 300,
  },
  shareBtnFlex: {
    flex: 1,
  },
});
