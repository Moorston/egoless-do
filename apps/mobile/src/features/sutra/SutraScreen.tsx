import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_SECTION, FONT_SMALL, DEDICATION_TEMPLATES, SUTRA_CATEGORIES, dateStr } from '@egoless-do/core';
import type { MantraDef, MantraCategory } from '@egoless-do/core';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { BarChart3, Plus, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert, FlatList, ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT, PrimaryButton, OutlineButton } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { MalaRing } from '../shared/components/MalaRing';
import { useAudioCache } from '../shared/hooks/useAudioCache';

import { useSutraAudio } from './useSutraAudio';


type SutraPage = 'select' | 'start' | 'active' | 'report';

const BEAD_COUNT = 108;
const SUTRA_CATEGORY_ORDER: MantraCategory[] = ['sutra', 'dharani', 'buddha_name', 'custom'];

export default function SutraScreen() {
  return <SutraScreenInner />;
}

function SutraScreenInner() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { mantraDefs, getMantraTotalCount, getMantraStreak, getMantraTodayCount, addMantraSession, removeMantraDef, initializePresetsIncremental, addPresetSutra, addMantraDef } = useShallowStore(s => ({
    mantraDefs: s.mantraDefs,
    getMantraTotalCount: s.getMantraTotalCount,
    getMantraStreak: s.getMantraStreak,
    getMantraTodayCount: s.getMantraTodayCount,
    addMantraSession: s.addMantraSession,
    removeMantraDef: s.removeMantraDef,
    initializePresetsIncremental: s.initializePresetsIncremental,
    addPresetSutra: s.addPresetSutra,
    addMantraDef: s.addMantraDef,
  }));
  useKeepAwake();
  const { playSutra, stopSutra, isPlaying } = useSutraAudio();
  useEffect(() => () => { stopSutra(); }, [stopSutra]);
  const { downloadAudio, isCached, downloading, progress: dlProgress } = useAudioCache();

  const [page, setPage] = useState<SutraPage>('select');
  const [selectedSutra, setSelectedSutra] = useState<MantraDef | null>(null);
  const [targetRounds, setTargetRounds] = useState(7);
  const [audioCached, setAudioCached] = useState(false);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const startTimeRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedElapsedRef = useRef(0);
  const pauseStartRef = useRef(0);
  const startSessionSeq = useRef(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customCategory, setCustomCategory] = useState<MantraCategory>('sutra');
  const [customText, setCustomText] = useState('');
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationText, setDedicationText] = useState(DEDICATION_TEMPLATES[0]);
  const [pendingSessionData, setPendingSessionData] = useState<{ count: number; rounds: number; durationSec: number } | null>(null);
  const [foldedCategories, setFoldedCategories] = useState<Record<MantraCategory, boolean>>({
    sutra: false, dharani: true, buddha_name: true, custom: true,
  });
  const [presetSearch, setPresetSearch] = useState('');


  const mySutras = useMemo(() =>
    (mantraDefs ?? [])
      .filter((d: MantraDef) => !d.deleted && d.preset !== true && d.category === 'sutra')
      .sort((a: MantraDef, b: MantraDef) => a.sortOrder - b.sortOrder),
    [mantraDefs]
  );

  const presetSutras = useMemo(() =>
    (mantraDefs ?? []).filter((d: MantraDef) => d.preset === true && !d.deleted && d.category === 'sutra'),
    [mantraDefs]
  );

  const [presetsReady, setPresetsReady] = useState(false);
  useEffect(() => {
    if (presetsReady) return;
    if (typeof initializePresetsIncremental !== 'function') return;
    // 迁移 + 补全预设（幂等，安全可重入）
    initializePresetsIncremental();
    setPresetsReady(true);
  }, [presetsReady]);

  // helpers
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  };

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

  const startSession = useCallback(async (sutra: MantraDef) => {
    const seq = ++startSessionSeq.current;
    setSelectedSutra(sutra);
    setCount(0); countRef.current = 0;
    setStartTime(0); startTimeRef.current = 0;
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0; setIsPaused(false);
    const cached = await isCached(sutra.id);
    if (seq !== startSessionSeq.current) return; // stale, discard
    setAudioCached(cached);
    setPage('start');
  }, [isCached]);

  const toggleCategoryFold = useCallback((cat: MantraCategory) => {
    setFoldedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const isPresetInMy = useCallback((name: string) => mySutras.some((m: MantraDef) => m.name === name), [mySutras]);

  const addPresetToMy = useCallback((preset: MantraDef) => {
    if (typeof addPresetSutra === 'function') addPresetSutra(preset);
  }, [addPresetSutra]);

  const removeFromMy = useCallback((id: string) => { removeMantraDef(id); }, [removeMantraDef]);

  const addCustomSutra = useCallback(() => {
    if (!customName.trim()) return;
    addMantraDef({
      name: customName.trim(),
      subtitle: customSubtitle.trim() || undefined,
      category: customCategory,
      preset: false,
      fullText: customText.trim() || undefined,
    });
    setShowAddCustom(false);
    setCustomName(''); setCustomSubtitle(''); setCustomText('');
  }, [customName, customSubtitle, customCategory, customText, addMantraDef]);

  const beginChanting = useCallback(() => {
    const now = Date.now();
    setStartTime(now); startTimeRef.current = now;
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0; setIsPaused(false);
    setPage('active');
  }, []);

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

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(prev => {
      const v = Math.max(0, prev - 1);
      countRef.current = v;
      return v;
    });
  }, []);

  const togglePause = useCallback(() => {
    if (isPaused) {
      pausedElapsedRef.current += Date.now() - pauseStartRef.current;
    } else {
      pauseStartRef.current = Date.now();
      stopSutra();
    }
    setIsPaused(!isPaused);
  }, [isPaused, stopSutra]);

  const endSession = useCallback(() => {
    const completedAt = Date.now();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopSutra().catch(() => {});
    const c = countRef.current;
    const durationSec = Math.floor((completedAt - startTimeRef.current - pausedElapsedRef.current) / 1000);
    const rounds = Math.floor(c / BEAD_COUNT);
    setPendingSessionData({ count: c, rounds, durationSec });
    setShowDedication(true);
    setPage('report');
  }, [stopSutra]);

  // Reset all session state
  const resetSession = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopSutra().catch(() => {});
    setCount(0); countRef.current = 0;
    setStartTime(0); startTimeRef.current = 0;
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
    setShowDedication(false);
    setPendingSessionData(null);
    setDedicationText(DEDICATION_TEMPLATES[0]);
    setPage('select');
  }, [stopSutra]);

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

  const saveSession = useCallback(() => {
    if (!selectedSutra || !pendingSessionData) { setShowDedication(false); setPage('select'); return; }
    addMantraSession({
      mantraId: selectedSutra.id,
      date: dateStr(),
      count: pendingSessionData.count,
      rounds: pendingSessionData.rounds,
      durationSec: pendingSessionData.durationSec,
      startedAt: startTime,
      completedAt: startTime + pendingSessionData.durationSec * 1000,
      targetRounds,
      dedication: dedicationText || undefined,
    });
    setShowDedication(false);
    setPendingSessionData(null);
    setPage('select');
  }, [selectedSutra, pendingSessionData, startTime, targetRounds, dedicationText, addMantraSession]);

  const categoryLabel = useCallback((cat: MantraCategory) => {
    const found = SUTRA_CATEGORIES.find(c => c.key === cat);
    return found ? T(found.labelKey) : cat;
  }, [T]);

  const categoryColor = useCallback((cat: MantraCategory) => {
    const map: Record<MantraCategory, string> = { sutra: '#6366F1', dharani: '#D97706', buddha_name: '#10B981', custom: '#8B5CF6' };
    return map[cat] || '#9CA3AF';
  }, []);

  const filteredPresets = useMemo(() =>
    presetSutras.filter((p: MantraDef) => {
      if (!presetSearch) return true;
      const q = presetSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.subtitle || '').toLowerCase().includes(q);
    }),
    [presetSutras, presetSearch]
  );

  const presetByCategory = useMemo(() => {
    const map: Record<MantraCategory, MantraDef[]> = { sutra: [], dharani: [], buddha_name: [], custom: [] };
    for (const p of filteredPresets) {
      const cat: MantraCategory = p.category;
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [filteredPresets]);

  // FlatList helpers for select page
  const renderSutraItem = useCallback(({ item: m }: ListRenderItemInfo<MantraDef>) => {
    const total = getMantraTotalCount(m.id);
    const today = getMantraTodayCount(m.id);
    const streak = getMantraStreak(m.id);
    const progress = m.targetCount ? Math.min(100, Math.round(total / m.targetCount * 100)) : null;
    return (
      <TouchableOpacity onPress={() => startSession(m)}
        style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: TH.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{m.name}</Text>
            {m.subtitle && <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{m.subtitle}</Text>}
            {today > 0 && <Text style={{ fontSize: FONT_SMALL, color: '#10B981', marginTop: 4 }}>{T('sutraTodayCount')} {today}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#D4A574' }}>{total.toLocaleString()}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('sutraTotalRounds')}</Text>
          </View>
        </View>
        {progress !== null && (
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 4, backgroundColor: TH.border + '60', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, width: `${progress}%`, backgroundColor: '#D4A574', borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>
              {total.toLocaleString()} / {m.targetCount != null ? m.targetCount.toLocaleString() : '0'} ({progress}%)
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: FONT_SMALL, color: '#F59E0B' }}>🔥 {streak}天</Text>
          <TouchableOpacity onPress={() => removeFromMy(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: FONT_SMALL, color: '#EF4444' }}>{T('sutraRemove')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [TH, T, startSession, getMantraTotalCount, getMantraTodayCount, getMantraStreak, removeFromMy]);

  const sutraListHeader = useMemo(() => (
    <View>
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('sutraTargetRounds')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 3, 7, 21, 108].map(n => (
            <TouchableOpacity key={n} onPress={() => setTargetRounds(n)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: targetRounds === n ? '#D4A574' : TH.border }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: targetRounds === n ? '#fff' : TH.text }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('sutraMySutras')}</Text>
    </View>
  ), [TH, T, targetRounds]);

  const sutraEmptyState = useMemo(() => (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 24, alignItems: 'center' }}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>📿</Text>
      <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{T('sutraNoSutras')}</Text>
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('sutraAddHint')}</Text>
    </View>
  ), [TH, T]);

  const sutraListFooter = useMemo(() => (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('sutraPresetLibrary')}</Text>
      <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: TH.text, fontSize: FONT_SUB, marginBottom: 10, borderWidth: 1, borderColor: TH.border }}
        placeholder={T('sutraSearchPlaceholder')} placeholderTextColor={TH.sub} value={presetSearch} onChangeText={setPresetSearch} />

      {SUTRA_CATEGORY_ORDER.map(cat => {
        const list = presetByCategory[cat] ?? [];
        if (list.length === 0) return null;
        const folded = foldedCategories[cat];
        const color = categoryColor(cat);
        return (
          <View key={cat} style={{ marginBottom: 16 }}>
            <TouchableOpacity onPress={() => toggleCategoryFold(cat)} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
              {folded ? <ChevronRight size={16} color={color} /> : <ChevronDown size={16} color={color} />}
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color, marginLeft: 4 }}>{categoryLabel(cat)} ({list.length})</Text>
            </TouchableOpacity>
            {!folded && (
              <View style={{ gap: 6 }}>
                {list.map(p => {
                  const added = isPresetInMy(p.name);
                  return (
                    <TouchableOpacity key={p.id} onPress={() => !added && addPresetToMy(p)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: TH.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: TH.border }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{p.name}</Text>
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: color + '20' }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color }}>{categoryLabel(p.category)}</Text>
                          </View>
                          {p.pageCount ? <Text style={{ fontSize: 10, color: TH.sub }}>{p.pageCount}页</Text> : null}
                        </View>
                        {p.subtitle ? <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }} numberOfLines={1}>{p.subtitle}</Text> : null}
                      </View>
                      {added
                        ? <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>{T('sutraAlreadyAdded')}</Text>
                        : <Plus size={18} color={TH.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity onPress={() => setShowAddCustom(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, marginTop: 8 }}>
        <Plus size={18} color={TH.primary} />
        <Text style={{ fontSize: FONT_BODY, color: TH.primary, fontWeight: '600' }}>{T('sutraImportCustom')}</Text>
      </TouchableOpacity>
    </View>
  ), [TH, T, presetSearch, presetByCategory, foldedCategories, toggleCategoryFold, categoryColor, categoryLabel, isPresetInMy, addPresetToMy, setShowAddCustom]);

  if (page === 'select') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Sutra" />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, flex: 1 }}>{T('sutraSubtitle')}</Text>
          <TouchableOpacity onPress={() => nav.navigate('SutraHistory', {})}>
            <BarChart3 size={18} color={TH.sub} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            data={mySutras}
            renderItem={renderSutraItem}
            keyExtractor={(item: MantraDef) => item.id}
            removeClippedSubviews={true}
            ListHeaderComponent={sutraListHeader}
            ListEmptyComponent={sutraEmptyState}
            ListFooterComponent={sutraListFooter}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>

        <Modal visible={showAddCustom} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('sutraImportTitle')}</Text>
                <TouchableOpacity onPress={() => setShowAddCustom(false)}><X size={22} color={TH.sub} /></TouchableOpacity>
              </View>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraImportName')}</Text>
              <TextInput value={customName} onChangeText={setCustomName} placeholder="例如：药师经" placeholderTextColor={TH.sub}
                style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }} />
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraImportSubtitle')}</Text>
              <TextInput value={customSubtitle} onChangeText={setCustomSubtitle} placeholder="" placeholderTextColor={TH.sub}
                style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }} />
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraImportCategory')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {SUTRA_CATEGORY_ORDER.map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setCustomCategory(cat)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: customCategory === cat ? categoryColor(cat) : TH.card, borderWidth: customCategory === cat ? 0 : 1, borderColor: TH.border }}>
                    <Text style={{ color: customCategory === cat ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_SUB }}>{categoryLabel(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraImportText')}</Text>
              <TextInput value={customText} onChangeText={setCustomText} placeholder={T('sutraImportPlaceholder')} placeholderTextColor={TH.sub} multiline
                style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
              <TouchableOpacity onPress={addCustomSutra} disabled={!customName.trim()}
                style={{ backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center', opacity: customName.trim() ? 1 : 0.5 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('sutraImportBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }


  if (page === 'start' && selectedSutra) {
    const handleDownloadAudio = async () => {
      if (!selectedSutra?.audioUrl) return;
      try {
        await downloadAudio(selectedSutra.id, selectedSutra.audioUrl);
        setAudioCached(true);
      } catch {
        Alert.alert(T('chantingDownloadFailed'));
      }
    };

    const handlePreviewAudio = async () => {
      if (isPlaying) {
        await stopSutra();
      } else {
        await playSutra(selectedSutra.id, { loop: false });
      }
    };

    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        {/* Back button */}
        <TouchableOpacity onPress={() => { stopSutra(); setPage('select'); }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.text, marginLeft: 8 }}>{T('chantingBack')}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, marginBottom: 8, textAlign: 'center' }}>{selectedSutra.name}</Text>
          {selectedSutra.subtitle && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 16, textAlign: 'center' }}>{selectedSutra.subtitle}</Text>
          )}
          {selectedSutra.pronunciation && (
            <Text style={{ fontSize: FONT_BODY, color: '#D4A574', marginBottom: 16, textAlign: 'center' }}>{selectedSutra.pronunciation}</Text>
          )}
          {selectedSutra.meaning && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 16, textAlign: 'center', fontStyle: 'italic' }}>{selectedSutra.meaning}</Text>
          )}
          {selectedSutra.pageCount != null && (
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 24, textAlign: 'center' }}>{selectedSutra.pageCount} {T('sutraPages')} · 每遍 108 颗</Text>
          )}

          {/* Audio section */}
          {selectedSutra.audioUrl ? (
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              {downloading === selectedSutra.id ? (
                <View style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#D4A57415', borderWidth: 1, borderColor: '#D4A57430', minWidth: 200, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#D4A574' }}>{T('chantingDownloadProgress')} {Math.round(dlProgress * 100)}%</Text>
                  <View style={{ height: 4, width: '100%', backgroundColor: `${TH.border}60`, borderRadius: 2, marginTop: 8 }}>
                    <View style={{ height: 4, width: `${dlProgress * 100}%`, backgroundColor: '#D4A574', borderRadius: 2 }} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={audioCached ? handlePreviewAudio : handleDownloadAudio}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#D4A57415', borderWidth: 1, borderColor: '#D4A57430' }}>
                  <Text style={{ fontSize: 20 }}>{isPlaying ? '🔊' : audioCached ? '▶️' : '⬇️'}</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#D4A574' }}>
                    {isPlaying ? T('chantingListening') : audioCached ? T('chantingListening') : T('chantingDownloadAudio')}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedSutra.audioAttribution ? (
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 8, textAlign: 'center' }}>
                  {T('chantingAudioSource')}: {selectedSutra.audioAttribution}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 24 }}>{T('chantingNoAudio')}</Text>
          )}

          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('sutraTargetRounds')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[1, 3, 7, 21, 108].map(n => (
              <TouchableOpacity key={n} onPress={() => setTargetRounds(n)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: targetRounds === n ? '#D4A574' : TH.border }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: targetRounds === n ? '#fff' : TH.text }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 24, textAlign: 'center' }}>
            {T('sutraTargetDesc')}: {targetRounds} 遍 · 每遍 108 颗
          </Text>

          <TouchableOpacity onPress={beginChanting}
            style={{ paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, backgroundColor: '#D4A574' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff' }}>{T('sutraStartChantNew')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  if (page === 'active') {
    const currentRound = Math.floor(count / BEAD_COUNT);

    const handleToggleAudio = async () => {
      if (!selectedSutra) return;
      if (isPlaying) {
        stopSutra();
      } else {
        const ok = await playSutra(selectedSutra.id, { loop: true });
        if (!ok) Alert.alert(T('chantingPleaseDownloadFirst'));
      }
    };

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
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{selectedSutra?.name}</Text>
          {selectedSutra?.pronunciation && (
            <Text style={{ fontSize: 12, color: '#D4A574', marginBottom: 4 }}>{selectedSutra.pronunciation}</Text>
          )}

          <MalaRing
            count={count}
            beadCount={BEAD_COUNT}
            size={280}
            beadColor="#D4A574"
            trackColor={TH.border + '40'}
            textColor="#D4A574"
            centerSubLabel={String(BEAD_COUNT)}
            centerLabel={T('sutraRound') + ' ' + currentRound}
          />

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 16 }}>
            {formatTime(elapsed)} · {T('sutraTargetDesc')}: {targetRounds} 遍
          </Text>

          <Text style={{ fontSize: FONT_SMALL, color: TH.sub + '80', marginTop: 8 }}>
            {T('sutraTapAnywhere')}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 20 }}>
          <TouchableOpacity onPress={handleUndo}
            style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('sutraUndo')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToggleAudio}
            style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: isPlaying ? '#D4A574' : TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: isPlaying ? '#fff' : TH.text }}>
              {isPlaying ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          {isPaused ? (
            <TouchableOpacity onPress={togglePause}
              style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#10B981' }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('sutraResume')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={togglePause}
              style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: TH.card }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('sutraPause')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={endSession}
            style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#EF4444' }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('sutraStop')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // report page — use pendingSessionData for session-specific numbers (not stale state)
  const psd = pendingSessionData;
  const reportCount = psd?.count ?? 0;
  const reportRounds = psd?.rounds ?? 0;
  const reportDurationSec = psd?.durationSec ?? 0;
  const totalAfter = selectedSutra ? getMantraTotalCount(selectedSutra.id) : 0;
  const streak = selectedSutra ? getMantraStreak(selectedSutra.id) : 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={resetSession} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, flex: 1 }}>{T('sutraChantComplete')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ backgroundColor: '#D4A574', padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>☸</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 8 }}>{selectedSutra?.name}</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 }}>
              {reportCount.toLocaleString()} 颗 · {reportRounds} 遍
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
              {reportDurationSec > 60 ? Math.floor(reportDurationSec / 60) + 'm' : reportDurationSec + 's'}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#D4A574' }}>{totalAfter.toLocaleString()}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraTotalRounds')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#F59E0B' }}>🔥 {streak}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraStreak')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#10B981' }}>
                {reportDurationSec > 60 ? Math.floor(reportDurationSec / 60) + 'm' : reportDurationSec + 's'}
              </Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraSessionDuration')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => setShowDedication(true)}
          style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('sutraDedication')}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('sutraDedicationSelect')}</Text>
          </View>
        </TouchableOpacity>

        <PrimaryButton label={T('sutraSaveComplete')} onPress={saveSession} color="#D4A574" />
      </ScrollView>

      <Modal visible={showDedication} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 16 }}>{T('sutraDedication')}</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
              {DEDICATION_TEMPLATES.map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setDedicationText(tmpl)}
                  style={{ padding: 12, borderRadius: 8, backgroundColor: dedicationText === tmpl ? '#D4A57415' : TH.card, marginBottom: 6, borderWidth: 1, borderColor: dedicationText === tmpl ? '#D4A574' : TH.border }}>
                  <Text style={{ fontSize: FONT_SMALL, color: dedicationText === tmpl ? '#D4A574' : TH.text }}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }}
              multiline maxLength={500} value={dedicationText} onChangeText={setDedicationText}
              placeholder="自定义回向文" placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label={T('cancel')} onPress={() => setShowDedication(false)} style={{ flex: 1 }} />
              <PrimaryButton label={T('sutraDone')} onPress={saveSession} color="#D4A574" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
