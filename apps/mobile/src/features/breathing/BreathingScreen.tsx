// ─── BreathingScreen — Lightweight entry point ──────────────────
// Shows the preset selection page immediately (zero native module deps).
// Lazy-loads BreathingEngine when user starts a session.
import { FONT_TITLE, FONT_BODY, FONT_SUB, createLogger, fmtMS , BREATHING_PRESETS, cycleDuration, getDescKey , FONT_STAT_SECTION } from '@egoless-do/core';
import type { BreathingPreset, GuideStyle } from '@egoless-do/core';
import { safeGetItem, safeSetItem } from '../../store/safeAsyncStorage';
import { ChevronRight } from 'lucide-react-native';
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';


const log = createLogger('Breathing');

const GUIDE_STYLE_KEY = 'breathing_guide_style';

import type { Theme } from '@egoless-do/core';

// Lazy-load the heavy engine (contains expo-audio, expo-speech, rAF loop)
const BreathingEngine = lazy(() => import('./BreathingEngine'));

function EngineFallback({ TH }: { TH: Theme }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TH.bg }}>
      <Text style={{ fontSize: FONT_STAT_SECTION(), marginBottom: 8 }}>🪷</Text>
      <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>...</Text>
    </View>
  );
}

export default function BreathingScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const [guideStyle, setGuideStyle] = useState<GuideStyle>('scientific');
  const [started, setStarted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset | null>(null);

  // Load saved guide style preference
  useEffect(() => {
    safeGetItem(GUIDE_STYLE_KEY).then(v => {
      if (v === 'scientific' || v === 'spiritual') setGuideStyle(v);
    }).catch((e: unknown) => log.warn('AsyncStorage error', e));
  }, []);

  const saveGuideStyle = useCallback((style: GuideStyle) => {
    setGuideStyle(style);
    safeSetItem(GUIDE_STYLE_KEY, style).catch((e: unknown) => log.warn('AsyncStorage error', e));
  }, []);

  const handleStart = useCallback((preset: BreathingPreset) => {
    setSelectedPreset(preset);
    setStarted(true);
  }, []);

  const handleBack = useCallback((completed?: boolean, durationMs?: number) => {
    setStarted(false);
    setSelectedPreset(null);
    // 完成呼吸后导航回 Body 并传递结果
    if (completed) {
      nav.navigate('Body' as never, { breathingResult: { completed: true, durationMs: durationMs ?? 0 } } as never);
    }
  }, [nav]);

  // Engine mode — lazy-loaded
  if (started && selectedPreset) {
    return (
      <Suspense fallback={<EngineFallback TH={TH} />}>
        <BreathingEngine initialPreset={selectedPreset} onBack={handleBack} />
      </Suspense>
    );
  }

  // Selection page — lightweight, zero native modules
  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Breathing" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text }}>{T('breathingSubtitle')}</Text>
        <TouchableOpacity onPress={() => nav.navigate('BreathHistory' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.primary }}>{T('breathingHistory')}</Text>
          <ChevronRight size={14} color={TH.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {BREATHING_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.key}
            style={[styles.presetCard, { borderColor: `${TH.primary}30` }]}
            onPress={() => handleStart(preset)}
            activeOpacity={0.7}
          >
            <View style={styles.presetHeader}>
              <Text style={[styles.presetName, { color: TH.text }]}>{T(preset.nameKey)}</Text>
              <Text style={[styles.presetEn, { color: TH.sub }]}>{T(preset.enKey)}</Text>
              <Text style={[styles.presetRatio, { color: TH.primary }]}>{T('breathPhaseRatio')} {T(preset.ratioKey)}</Text>
            </View>

            {/* Style toggle */}
            <View style={styles.styleToggle}>
              <TouchableOpacity
                style={[styles.styleBtn, guideStyle === 'scientific' && { backgroundColor: `${TH.primary}20` }]}
                onPress={() => saveGuideStyle('scientific')}
              >
                <Text style={[styles.styleBtnText, { color: guideStyle === 'scientific' ? TH.primary : TH.sub }]}>
                  {T('breathScientific')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.styleBtn, guideStyle === 'spiritual' && { backgroundColor: `${TH.primary}20` }]}
                onPress={() => saveGuideStyle('spiritual')}
              >
                <Text style={[styles.styleBtnText, { color: guideStyle === 'spiritual' ? TH.primary : TH.sub }]}>
                  {T('breathSpiritual')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.presetDesc, { color: TH.text }]}>{T(getDescKey(preset, guideStyle))}</Text>

            <View style={styles.presetFooter}>
              <Text style={[styles.presetCycles, { color: TH.sub }]}>
                {preset.defaultCycles} {T('breathCycles')} · {fmtMS(cycleDuration(preset) * preset.defaultCycles)}
              </Text>
              <ChevronRight size={18} color={TH.sub} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  presetCard: {
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  presetHeader: { marginBottom: 8 },
  presetName: { fontSize: FONT_TITLE(), fontWeight: '700' },
  presetEn: { fontSize: FONT_SUB(), marginTop: 2 },
  presetRatio: { fontSize: FONT_SUB(), marginTop: 4 },
  styleToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  styleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  styleBtnText: { fontSize: FONT_SUB(), fontWeight: '500' },
  presetDesc: { fontSize: FONT_BODY(), lineHeight: 20, marginBottom: 12 },
  presetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetCycles: { fontSize: FONT_SUB() },
});
