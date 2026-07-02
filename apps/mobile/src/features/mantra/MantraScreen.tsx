import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useTheme, useT, PrimaryButton, OutlineButton } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, FONT_SMALL, PRESET_SUTRAS, DEDICATION_TEMPLATES } from '@egoless-do/core';
import SimpleHeader from '../../navigation/SimpleHeader';
import type { MantraDef, MantraSession } from '@egoless-do/core';
import { useMantraAudio } from './useMantraAudio';
import { useAudioCache } from '../shared/hooks/useAudioCache';
import { MalaRing } from '../shared/components/MalaRing';

type MantraPage = 'select' | 'start' | 'active' | 'report';

const BEAD_COUNT = 108;

// Shared MalaRing is imported from ../shared/components/MalaRing

// ── Main Screen ──
export default function MantraScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  useKeepAwake();
  const { playMantra, stopMantra, isPlaying } = useMantraAudio();
  const { getCachedPath, downloadAudio, isCached, downloading, progress: dlProgress } = useAudioCache();

  const [page, setPage] = useState<MantraPage>('select');
  const [selectedMantra, setSelectedMantra] = useState<MantraDef | null>(null);
  const [targetRounds, setTargetRounds] = useState(3);
  const [audioCached, setAudioCached] = useState(false);

  // Session state
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedElapsedRef = useRef(0);
  const pauseStartRef = useRef(0);
  const [audioLoop, setAudioLoop] = useState(false);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationText, setDedicationText] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const startSessionSeq = useRef(0);

  const myMantras = useMemo(() =>
    (store.mantraDefs ?? []).filter((d: MantraDef) => !d.deleted && d.category !== 'sutra').sort((a: MantraDef, b: MantraDef) => a.sortOrder - b.sortOrder),
    [store.mantraDefs]
  );

  // Timer (fixed pause logic)
  useEffect(() => {
    if (page === 'active' && !isPaused && startTime > 0) {
      timerRef.current = setInterval(() => {
        const e = Date.now() - startTime - pausedElapsedRef.current;
        elapsedRef.current = e;
        setElapsed(e);
      }, 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [page, isPaused, startTime]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // Start session -> go to start page first
  const startSession = useCallback(async (mantra: MantraDef) => {
    const seq = ++startSessionSeq.current;
    setSelectedMantra(mantra);
    setCount(0); countRef.current = 0;
    setStartTime(0);
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
    const cached = await isCached(mantra.id);
    if (seq !== startSessionSeq.current) return; // stale, discard
    setAudioCached(cached);
    setPage('start');
  }, [isCached]);

  // Actually begin chanting (from start page)
  const beginChanting = useCallback(() => {
    setStartTime(Date.now());
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
    if (selectedMantra && audioLoop) {
      playMantra(selectedMantra.id, selectedMantra.name, { loop: true }).catch(() => {});
    }
    setPage('active');
  }, [selectedMantra, playMantra, audioLoop]);

  // Count +1
  const handleTap = useCallback(() => {
    if (isPaused) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(prev => {
      const next = prev + 1;
      countRef.current = next;
      if (next % BEAD_COUNT === 0 && next > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, [isPaused]);

  // Undo
  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(prev => {
      const v = Math.max(0, prev - 1);
      countRef.current = v;
      return v;
    });
  }, []);

  // End session
  const endSession = useCallback(() => {
    const completedAt = Date.now();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopMantra().catch(() => {});
    setAudioLoop(false);
    const c = countRef.current;
    const durationSec = Math.floor((completedAt - startTime - pausedElapsedRef.current) / 1000);
    const rounds = Math.floor(c / BEAD_COUNT);
    if (selectedMantra && c > 0) {
      store.addMantraSession({
        mantraId: selectedMantra.id,
        date: new Date().toISOString().slice(0, 10),
        count: c, rounds, durationSec,
        startedAt: startTime, completedAt,
        targetRounds,
      });
    }
    setPage('report');
  }, [startTime, selectedMantra, targetRounds, store, stopMantra]);

  // Reset all session state
  const resetSession = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopMantra().catch(() => {});
    setCount(0); countRef.current = 0;
    setStartTime(0);
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
    setAudioLoop(false);
    setShowDedication(false);
    setDedicationText('');
    setPage('select');
  }, [stopMantra]);

  // Exit active page with short-session protection
  const handleExitActive = useCallback(() => {
    if (elapsedRef.current < 30000) {
      Alert.alert(T('chantingTimeTooShort'), '', [
        { text: T('confirm'), onPress: () => resetSession() },
      ]);
    } else {
      Alert.alert(T('chantingExitConfirmTitle'), T('chantingExitConfirmMsg'), [
        { text: T('chantingContinue'), style: 'cancel' },
        { text: T('chantingEndAndRecord'), onPress: endSession },
      ]);
    }
  }, [endSession, resetSession, T]);

  // Toggle pause
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume: add paused duration
      pausedElapsedRef.current += Date.now() - pauseStartRef.current;
    } else {
      // Pause: record pause start, stop audio
      pauseStartRef.current = Date.now();
      stopMantra();
      setAudioLoop(false);
    }
    setIsPaused(!isPaused);
  }, [isPaused, stopMantra]);

  // Toggle audio loop
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

  // Add preset
  const addPreset = useCallback((preset: { name: string; subtitle?: string; category: 'dharani' | 'sutra' | 'buddha_name' | 'custom'; pronunciation?: string; meaning?: string }) => {
    store.addMantraDef({ name: preset.name, subtitle: preset.subtitle, category: preset.category, pronunciation: preset.pronunciation, meaning: preset.meaning });
  }, [store]);

  // ── SELECT PAGE ──
  if (page === 'select') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Mantra" />
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('mantraSubtitle')}</Text>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Target rounds */}
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('mantraTargetRounds')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 5, 7, 10].map(n => (
                <TouchableOpacity key={n} onPress={() => setTargetRounds(n)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: targetRounds === n ? '#FBBF24' : TH.border, }}>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: targetRounds === n ? '#fff' : TH.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* My Mantras */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>
                {T('mantraMyMantras')}
              </Text>
              <TouchableOpacity onPress={() => nav.navigate('MantraHistory', {})}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraHistory')}</Text>
              </TouchableOpacity>
            </View>
            {myMantras.length === 0 ? (
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📿</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{T('mantraNoMantra')}</Text>
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('mantraAddHint')}</Text>
              </View>
            ) : (
              myMantras.map((m: MantraDef) => {
                const total = store.getMantraTotalCount(m.id);
                const today = store.getMantraTodayCount(m.id);
                const streak = store.getMantraStreak(m.id);
                const progress = m.targetCount ? Math.min(100, Math.round(total / m.targetCount * 100)) : null;
                return (
                  <TouchableOpacity key={m.id} onPress={() => startSession(m)}
                    style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{m.name}</Text>
                        {m.subtitle && <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{m.subtitle}</Text>}
                        {today > 0 && (
                          <Text style={{ fontSize: FONT_SMALL, color: '#10B981', marginTop: 4 }}>{T('mantraTodayCount')} {today}</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#FBBF24' }}>{total.toLocaleString()}</Text>
                        <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('mantraCumulative')}</Text>
                      </View>
                    </View>
                    {progress !== null && (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ height: 4, backgroundColor: `${TH.border}60`, borderRadius: 2 }}>
                          <View style={{ height: 4, width: `${progress}%`, backgroundColor: '#FBBF24', borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>
                          {total.toLocaleString()} / {m.targetCount?.toLocaleString()} ({progress}%)
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ fontSize: FONT_SMALL, color: '#F59E0B' }}>🔥 {streak} {T('mantraDays')}</Text>
                      <TouchableOpacity onPress={() => store.removeMantraDef(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ fontSize: FONT_SMALL, color: '#EF4444' }}>移除</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Preset Library */}
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>
            {T('mantraPresetLibrary')}
          </Text>
          <TextInput
            style={{ backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: TH.text, fontSize: FONT_SUB, marginBottom: 10, borderWidth: 1, borderColor: TH.border }}
            placeholder={T('mantraSearchPlaceholder')}
            placeholderTextColor={TH.sub}
            value={presetSearch}
            onChangeText={setPresetSearch}
          />
          <View style={{ marginBottom: 16, gap: 6 }}>
            {PRESET_SUTRAS.filter(p => p.category !== 'sutra' && !myMantras.some(m => m.name === p.name) && (presetSearch === '' || p.name.includes(presetSearch) || (p.subtitle ?? '').includes(presetSearch))).map((p, i) => (
              <TouchableOpacity key={i} onPress={() => addPreset(p)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: TH.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: TH.border }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{p.name}</Text>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: p.category === 'sutra' ? '#6366F120' : p.category === 'buddha_name' ? '#10B98120' : '#FBBF2420' }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: p.category === 'sutra' ? '#6366F1' : p.category === 'buddha_name' ? '#10B981' : '#D97706' }}>
                        {p.category === 'sutra' ? T('sutraCategorySutra') : p.category === 'buddha_name' ? T('sutraCategoryBuddhaName') : T('sutraCategoryDharani')}
                      </Text>
                    </View>
                  </View>
                  {p.subtitle && <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>{p.subtitle}</Text>}
                </View>
                <Text style={{ fontSize: 20, color: TH.sub }}>+</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── START PAGE ──
  if (page === 'start' && selectedMantra) {
    const handleDownloadAudio = async () => {
      if (!selectedMantra?.audioUrl) return;
      try {
        await downloadAudio(selectedMantra.id, selectedMantra.audioUrl);
        setAudioCached(true);
      } catch {
        Alert.alert(T('chantingDownloadFailed'));
      }
    };

    const handlePreviewAudio = async () => {
      if (isPlaying) {
        await stopMantra();
      } else {
        await playMantra(selectedMantra.id, selectedMantra.name, { loop: audioLoop });
      }
    };

    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        {/* Back button */}
        <TouchableOpacity onPress={() => { stopMantra(); setPage('select'); }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.text, marginLeft: 8 }}>{T('chantingBack')}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, marginBottom: 8, textAlign: 'center' }}>
            {selectedMantra.name}
          </Text>
          {selectedMantra.subtitle && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 16, textAlign: 'center' }}>
              {selectedMantra.subtitle}
            </Text>
          )}
          {selectedMantra.pronunciation && (
            <Text style={{ fontSize: FONT_BODY, color: '#F59E0B', marginBottom: 16, textAlign: 'center' }}>
              {selectedMantra.pronunciation}
            </Text>
          )}
          {selectedMantra.meaning && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 24, textAlign: 'center', fontStyle: 'italic' }}>
              {selectedMantra.meaning}
            </Text>
          )}

          {/* Audio section */}
          {selectedMantra.audioUrl ? (
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              {downloading === selectedMantra.id ? (
                <View style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30`, minWidth: 200, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.primary }}>{T('chantingDownloadProgress')} {Math.round(dlProgress * 100)}%</Text>
                  <View style={{ height: 4, width: '100%', backgroundColor: `${TH.border}60`, borderRadius: 2, marginTop: 8 }}>
                    <View style={{ height: 4, width: `${dlProgress * 100}%`, backgroundColor: TH.primary, borderRadius: 2 }} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={audioCached ? handlePreviewAudio : handleDownloadAudio}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30` }}>
                  <Text style={{ fontSize: 20 }}>{isPlaying ? '🔊' : audioCached ? '▶️' : '⬇️'}</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.primary }}>
                    {isPlaying ? T('chantingListening') : audioCached ? T('chantingListening') : T('chantingDownloadAudio')}
                  </Text>
                </TouchableOpacity>
              )}

              {audioCached && (
                <TouchableOpacity onPress={() => { setAudioLoop(prev => !prev); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: TH.primary, backgroundColor: audioLoop ? TH.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {audioLoop && <Text style={{ fontSize: 12, color: '#fff' }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('chantingLoopAudio')}</Text>
                </TouchableOpacity>
              )}

              {selectedMantra.audioAttribution ? (
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 8, textAlign: 'center' }}>
                  {T('chantingAudioSource')}: {selectedMantra.audioAttribution}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 24 }}>{T('chantingNoAudio')}</Text>
          )}

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 24, textAlign: 'center' }}>
            {T('mantraTargetDesc')}: {targetRounds} 遍 · 每遍 108 颗
          </Text>

          <TouchableOpacity onPress={beginChanting}
            style={{ paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, backgroundColor: '#FBBF24' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff' }}>{T('mantraBegin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── ACTIVE PAGE ──
  if (page === 'active') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        {/* Exit button */}
        <TouchableOpacity onPress={handleExitActive}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: `${TH.card}CC` }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#EF4444' }}>✕ {T('chantingExit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={handleTap}
        >
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>
            {selectedMantra?.name}
          </Text>
          {selectedMantra?.pronunciation && (
            <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 4 }}>
              {selectedMantra.pronunciation}
            </Text>
          )}

          <MalaRing
            count={count}
            beadCount={BEAD_COUNT}
            size={280}
            beadColor="#FBBF24"
            trackColor={`${TH.border}40`}
            textColor="#FBBF24"
            centerSubLabel={'108'}
            centerLabel={`${T('mantraRounds')}: ${Math.floor(count / BEAD_COUNT)}`}
          />

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 16 }}>
            {formatTime(elapsed)} · {T('mantraTarget')}: {targetRounds} {T('mantraRounds')}
          </Text>

          <Text style={{ fontSize: FONT_SMALL, color: `${TH.sub}80`, marginTop: 8 }}>
            {T('mantraTapAnywhere')}
          </Text>
        </TouchableOpacity>

        {/* Controls */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 32, paddingBottom: 20 }}>
          <TouchableOpacity onPress={handleUndo}
            style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>← {T('mantraBack')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAudio}
            style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: isPlaying ? '#F59E0B' : TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: isPlaying ? '#fff' : TH.text }}>
              {isPlaying ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          {isPaused ? (
            <TouchableOpacity onPress={togglePause}
              style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#10B981' }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('mantraResume')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={togglePause}
              style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: TH.card }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('mantraPause')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={endSession}
            style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#EF4444' }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('mantraStop')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── REPORT PAGE ──
  const rounds = Math.floor(count / BEAD_COUNT);
  const durationSec = Math.floor(elapsed / 1000);
  const totalAfter = selectedMantra ? store.getMantraTotalCount(selectedMantra.id) : 0;
  const streak = selectedMantra ? store.getMantraStreak(selectedMantra.id) : 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={resetSession} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, flex: 1 }}>{T('mantraSessionComplete')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* Summary Card */}
        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FBBF24', padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>☸</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 8 }}>
              {selectedMantra?.name}
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 }}>
              {count.toLocaleString()} {T('mantraCount')} · {rounds} {T('mantraRounds')}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
              {formatTime(elapsed)}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#FBBF24' }}>{totalAfter.toLocaleString()}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraCumulative')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#F59E0B' }}>🔥 {streak}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraStreak')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#10B981' }}>{durationSec > 60 ? `${Math.floor(durationSec / 60)}m` : `${durationSec}s`}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraSessionDuration')}</Text>
            </View>
          </View>
        </View>

        {/* Dedication */}
        <TouchableOpacity onPress={() => setShowDedication(true)}
          style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('mantraDedication')}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('mantraDedicationHint')}</Text>
          </View>
        </TouchableOpacity>

        <PrimaryButton label={T('mantraFinish')} onPress={resetSession} color="#FBBF24" />
      </ScrollView>

      {/* Dedication Modal */}
      <Modal visible={showDedication} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 16 }}>
              {T('mantraDedication')}
            </Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
              {DEDICATION_TEMPLATES.map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setDedicationText(tmpl)}
                  style={{ padding: 12, borderRadius: 8, backgroundColor: dedicationText === tmpl ? '#FBBF2415' : TH.card, marginBottom: 6, borderWidth: 1, borderColor: dedicationText === tmpl ? '#FBBF24' : TH.border }}>
                  <Text style={{ fontSize: FONT_SMALL, color: dedicationText === tmpl ? '#FBBF24' : TH.text }}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }}
              multiline maxLength={500} value={dedicationText} onChangeText={setDedicationText}
              placeholder={T('mantraDedicationPlaceholder')} placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label={T('mantraCancel') || T('cancel')} onPress={() => setShowDedication(false)} style={{ flex: 1 }} />
              <PrimaryButton label={T('mantraFinish')} onPress={() => setShowDedication(false)} color="#FBBF24" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
