import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT, ScreenHeader, PrimaryButton, OutlineButton } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, FONT_SMALL, PRESET_MANTRAS, DEDICATION_TEMPLATES } from '@egoless-do/core';
import type { MantraDef, MantraSession } from '@egoless-do/core';
import Svg, { Circle } from 'react-native-svg';

type MantraPage = 'select' | 'active' | 'report';

const BEAD_COUNT = 108;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = RING_CENTER - 20;
const BEAD_RADIUS = 5;

// ── Mala Ring Component ──
function MalaRing({ count, TH, T }: { count: number; TH: any; T: any }) {
  const currentRound = Math.floor(count / BEAD_COUNT);
  const currentBead = count % BEAD_COUNT;
  const circumference = 2 * Math.PI * RING_RADIUS;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background ring */}
        <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none" stroke={`${TH.border}60`} strokeWidth={10} />
        {/* Progress ring */}
        <Circle
          cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none"
          stroke="#FBBF24" strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * currentBead / BEAD_COUNT)}
          strokeLinecap="round"
          transform={`rotate(-90, ${RING_CENTER}, ${RING_CENTER})`}
        />
        {/* Guru bead marker at top */}
        <Circle cx={RING_CENTER} cy={RING_CENTER - RING_RADIUS} r={BEAD_RADIUS + 3} fill="#D97706" />
        {/* Individual beads */}
        {Array.from({ length: BEAD_COUNT }, (_, i) => {
          const angle = (i / BEAD_COUNT) * 2 * Math.PI - Math.PI / 2;
          const x = RING_CENTER + RING_RADIUS * Math.cos(angle);
          const y = RING_CENTER + RING_RADIUS * Math.sin(angle);
          const isLit = i < currentBead;
          return (
            <Circle key={i} cx={x} cy={y} r={BEAD_RADIUS} fill={isLit ? '#FBBF24' : `${TH.border}40`} />
          );
        })}
      </Svg>
      {/* Center text */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: '#FBBF24' }}>{currentBead}</Text>
        <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{BEAD_COUNT}</Text>
        <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 4 }}>
          {T('mantraRounds')}: {currentRound}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function MantraScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  useKeepAwake();

  const [page, setPage] = useState<MantraPage>('select');
  const [selectedMantra, setSelectedMantra] = useState<MantraDef | null>(null);
  const [targetRounds, setTargetRounds] = useState(3);

  // Session state
  const [count, setCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationText, setDedicationText] = useState('');

  const myMantras = useMemo(() =>
    (store.mantraDefs ?? []).filter((d: MantraDef) => !d.deleted).sort((a: MantraDef, b: MantraDef) => a.sortOrder - b.sortOrder),
    [store.mantraDefs]
  );

  // Timer
  useEffect(() => {
    if (page === 'active' && !isPaused && startTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [page, isPaused, startTime]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // Start session
  const startSession = useCallback((mantra: MantraDef) => {
    setSelectedMantra(mantra);
    setCount(0);
    setStartTime(Date.now());
    setElapsed(0);
    setIsPaused(false);
    setPage('active');
  }, []);

  // Count +1
  const handleTap = useCallback(() => {
    if (isPaused) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(prev => {
      const next = prev + 1;
      if (next % BEAD_COUNT === 0 && next > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, [isPaused]);

  // Undo
  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  // End session
  const endSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const completedAt = Date.now();
    const durationSec = Math.floor((completedAt - startTime) / 1000);
    const rounds = Math.floor(count / BEAD_COUNT);
    if (selectedMantra && count > 0) {
      store.addMantraSession({
        mantraId: selectedMantra.id,
        date: new Date().toISOString().slice(0, 10),
        count, rounds, durationSec,
        startedAt: startTime, completedAt,
        targetRounds,
      });
    }
    setPage('report');
  }, [count, startTime, selectedMantra, targetRounds, store]);

  // Add preset
  const addPreset = useCallback((preset: { name: string; subtitle: string; category: string }) => {
    store.addMantraDef({ name: preset.name, subtitle: preset.subtitle, category: 'buddhist' as any });
  }, [store]);

  // ── SELECT PAGE ──
  if (page === 'select') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <ScreenHeader title={T('mantraTitle')} onBack={() => nav.goBack()} />

          {/* My Mantras */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>
              {T('mantraMyMantras')}
            </Text>
            {myMantras.length === 0 ? (
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📿</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{T('mantraNoMantra')}</Text>
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('mantraAddHint')}</Text>
              </View>
            ) : (
              myMantras.map((m: MantraDef) => {
                const total = store.getMantraTotalCount(m.id);
                const streak = store.getMantraStreak(m.id);
                const progress = m.targetCount ? Math.min(100, Math.round(total / m.targetCount * 100)) : null;
                return (
                  <TouchableOpacity key={m.id} onPress={() => startSession(m)}
                    style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{m.name}</Text>
                        {m.subtitle && <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{m.subtitle}</Text>}
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
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <Text style={{ fontSize: FONT_SMALL, color: '#F59E0B' }}>🔥 {streak} {T('mantraDays')}</Text>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PRESET_MANTRAS.filter(p => !myMantras.some(m => m.name === p.name)).map((p, i) => (
              <TouchableOpacity key={i} onPress={() => addPreset(p)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: TH.border, backgroundColor: TH.card }}>
                <Text style={{ fontSize: FONT_BADGE, color: TH.text }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ACTIVE PAGE ──
  if (page === 'active') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={handleTap}
        >
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>
            {selectedMantra?.name}
          </Text>

          <MalaRing count={count} TH={TH} T={T} />

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
            style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>← {T('mantraBack')}</Text>
          </TouchableOpacity>

          {isPaused ? (
            <TouchableOpacity onPress={() => setIsPaused(false)}
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#10B981' }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('mantraResume')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsPaused(true)}
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: TH.card }}>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title={T('mantraSessionComplete')} onBack={() => setPage('select')} />

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

        <PrimaryButton label={T('mantraFinish')} onPress={() => setPage('select')} color="#FBBF24" />
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
