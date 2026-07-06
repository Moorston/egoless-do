import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Alert } from 'react-native';
import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import SimpleHeader from '../../navigation/SimpleHeader';
import type { MantraDef } from '@egoless-do/core';
import { dateStr } from '@egoless-do/core';
import { useMantraAudio } from './useMantraAudio';
import { useAudioCache } from '../shared/hooks/useAudioCache';
import { useMantraTimer } from './hooks/useMantraTimer';
import MantraSelectPage from './pages/MantraSelectPage';
import MantraStartPage from './pages/MantraStartPage';
import MantraActivePage from './pages/MantraActivePage';
import MantraReportPage from './pages/MantraReportPage';

// Lazy-loaded native modules — deferred until active session
let _Haptics: typeof import('expo-haptics') | null = null;
function getHaptics() { return _Haptics ??= require('expo-haptics'); }

let _KeepAwakeHook: typeof import('expo-keep-awake').useKeepAwake | null = null;
function useLazyKeepAwake() {
  if (!_KeepAwakeHook) _KeepAwakeHook = require('expo-keep-awake').useKeepAwake;
  _KeepAwakeHook!();
}

type MantraPage = 'select' | 'start' | 'active' | 'report';

// ── Main Screen — State machine + hooks orchestration ──────────
export default function MantraEngine() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { mantraDefs, getMantraTotalCount, getMantraTodayCount, getMantraStreak, addMantraSession, removeMantraDef, addMantraDef } = useShallowStore(s => ({
    mantraDefs: s.mantraDefs, getMantraTotalCount: s.getMantraTotalCount,
    getMantraTodayCount: s.getMantraTodayCount, getMantraStreak: s.getMantraStreak,
    addMantraSession: s.addMantraSession, removeMantraDef: s.removeMantraDef, addMantraDef: s.addMantraDef,
  }));
  useLazyKeepAwake();
  const { playMantra, stopMantra, isPlaying } = useMantraAudio();
  const { downloadAudio, isCached, downloading, progress: dlProgress } = useAudioCache();

  const [page, setPage] = useState<MantraPage>('select');
  const [selectedMantra, setSelectedMantra] = useState<MantraDef | null>(null);
  const [targetRounds, setTargetRounds] = useState(3);
  const [audioCached, setAudioCached] = useState(false);
  const [audioLoop, setAudioLoop] = useState(false);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationText, setDedicationText] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const startSessionSeq = useRef(0);

  const myMantras = useMemo(() =>
    (mantraDefs ?? []).filter((d: MantraDef) => !d.deleted && d.category !== 'sutra').sort((a: MantraDef, b: MantraDef) => a.sortOrder - b.sortOrder),
    [mantraDefs]
  );

  // Timer hook — manages count, elapsed, pause logic
  const timer = useMantraTimer({
    targetRounds,
    onEndSession: (data) => { addMantraSession({ ...data, date: dateStr() }); },
    onStopAudio: () => { stopMantra(); setAudioLoop(false); },
  });

  const formatTime = useCallback((ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }, []);

  // ── Page transitions ──────────────────────────────────────────

  /** Start session → go to start page */
  const startSession = useCallback(async (mantra: MantraDef) => {
    const seq = ++startSessionSeq.current;
    setSelectedMantra(mantra);
    const cached = await isCached(mantra.id);
    if (seq !== startSessionSeq.current) return;
    setAudioCached(cached);
    setPage('start');
  }, [isCached]);

  /** Begin chanting from start page */
  const beginChanting = useCallback(() => {
    timer.start(selectedMantra!);
    if (selectedMantra && audioLoop) {
      playMantra(selectedMantra.id, selectedMantra.name, { loop: true }).catch(() => {});
    }
    setPage('active');
  }, [selectedMantra, audioLoop, timer, playMantra]);

  /** Handle tap on active page — increment count + haptic */
  const handleTap = useCallback(() => {
    if (timer.isPaused) return;
    const H = getHaptics();
    H.impactAsync(H.ImpactFeedbackStyle.Light);
    timer.increment();
    if ((timer.count + 1) % timer.BEAD_COUNT === 0 && timer.count > 0) {
      H.notificationAsync(H.NotificationFeedbackType.Success);
    }
  }, [timer]);

  /** End session → go to report */
  const endSession = useCallback(() => {
    timer.end();
    stopMantra();
    setAudioLoop(false);
    setPage('report');
  }, [timer, stopMantra]);

  /** Full reset → back to select */
  const resetSession = useCallback(() => {
    timer.reset();
    setAudioLoop(false);
    setShowDedication(false);
    setDedicationText('');
    setPage('select');
  }, [timer]);

  /** Exit active page with short-session protection */
  const handleExitActive = useCallback(() => {
    if (timer.elapsed < 30000) {
      Alert.alert(T('chantingTimeTooShort'), '', [
        { text: T('confirm'), onPress: () => resetSession() },
      ]);
    } else {
      Alert.alert(T('chantingExitConfirmTitle'), T('chantingExitConfirmMsg'), [
        { text: T('chantingContinue'), style: 'cancel' },
        { text: T('chantingEndAndRecord'), onPress: endSession },
      ]);
    }
  }, [timer.elapsed, endSession, resetSession, T]);

  /** Toggle audio loop */
  const toggleAudio = useCallback(() => {
    if (!selectedMantra) return;
    if (isPlaying) {
      stopMantra().catch(() => {});
      setAudioLoop(false);
    } else {
      setAudioLoop(true);
      playMantra(selectedMantra.id, selectedMantra.name, { loop: true }).catch(() => {});
    }
  }, [selectedMantra, isPlaying, playMantra, stopMantra]);

  /** Download audio for start page */
  const handleDownloadAudio = useCallback(async () => {
    if (!selectedMantra?.audioUrl) return;
    try {
      await downloadAudio(selectedMantra.id, selectedMantra.audioUrl);
      setAudioCached(true);
    } catch {
      Alert.alert(T('chantingDownloadFailed'));
    }
  }, [selectedMantra, downloadAudio, T]);

  /** Preview audio for start page */
  const handlePreviewAudio = useCallback(async () => {
    if (isPlaying) {
      await stopMantra();
    } else if (selectedMantra) {
      await playMantra(selectedMantra.id, selectedMantra.name, { loop: audioLoop });
    }
  }, [selectedMantra, isPlaying, audioLoop, playMantra, stopMantra]);

  // ── Page routing ──────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      {page === 'select' && (
        <>
          <SimpleHeader routeName="Mantra" />
          <MantraSelectPage
            myMantras={myMantras}
            targetRounds={targetRounds}
            setTargetRounds={setTargetRounds}
            presetSearch={presetSearch}
            setPresetSearch={setPresetSearch}
            startSession={startSession}
            removeMantraDef={removeMantraDef}
            addMantraDef={addMantraDef}
            getMantraTotalCount={getMantraTotalCount}
            getMantraTodayCount={getMantraTodayCount}
            getMantraStreak={getMantraStreak}
            nav={nav}
          />
        </>
      )}

      {page === 'start' && selectedMantra && (
        <MantraStartPage
          mantra={selectedMantra}
          targetRounds={targetRounds}
          audioCached={audioCached}
          audioLoop={audioLoop}
          setAudioLoop={setAudioLoop}
          isPlaying={isPlaying}
          downloading={downloading}
          dlProgress={dlProgress}
          onBack={() => { stopMantra(); setPage('select'); }}
          onBeginChanting={beginChanting}
          onDownloadAudio={handleDownloadAudio}
          onPreviewAudio={handlePreviewAudio}
        />
      )}

      {page === 'active' && (
        <MantraActivePage
          mantraName={selectedMantra?.name ?? ''}
          mantraPronunciation={selectedMantra?.pronunciation}
          count={timer.count}
          elapsed={timer.elapsed}
          targetRounds={targetRounds}
          BEAD_COUNT={timer.BEAD_COUNT}
          isPaused={timer.isPaused}
          isPlaying={isPlaying}
          formatTime={formatTime}
          onTap={handleTap}
          onUndo={timer.decrement}
          onToggleAudio={toggleAudio}
          onTogglePause={timer.togglePause}
          onEndSession={endSession}
          onExit={handleExitActive}
        />
      )}

      {page === 'report' && selectedMantra && (
        <MantraReportPage
          mantraName={selectedMantra.name}
          count={timer.count}
          elapsed={timer.elapsed}
          totalAfter={getMantraTotalCount(selectedMantra.id)}
          streak={getMantraStreak(selectedMantra.id)}
          formatTime={formatTime}
          showDedication={showDedication}
          setShowDedication={setShowDedication}
          dedicationText={dedicationText}
          setDedicationText={setDedicationText}
          onReset={resetSession}
        />
      )}
    </View>
  );
}
