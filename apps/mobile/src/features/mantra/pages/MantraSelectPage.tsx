// ─── MantraSelectPage — Mantra selection and preset management ───
// Extracted from MantraEngine.tsx for modularity.

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION, PRESET_SUTRAS } from '@egoless-do/core';
import type { MantraDef } from '@egoless-do/core';
import type { NavigationProp } from '@react-navigation/native';
import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ListRenderItemInfo } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';


// ─── Props interface ────────────────────────────────────────────────

/**
 * Props for the {@link MantraSelectPage} component.
 *
 * Provides the user's saved mantras, target-round configuration,
 * search state for the preset library, session-start trigger,
 * CRUD helpers for mantra definitions, statistics accessors,
 * and the navigation object.
 */
interface Props {
  /** List of mantra definitions the user has added to their personal collection. */
  myMantras: MantraDef[];
  /** Currently selected number of rounds for the next session. */
  targetRounds: number;
  /** Setter to update the target rounds selection. */
  setTargetRounds: (n: number) => void;
  /** Current search string filtering the preset mantra library. */
  presetSearch: string;
  /** Setter to update the preset search filter text. */
  setPresetSearch: (s: string) => void;
  /** Callback invoked when the user taps a mantra to begin a session. */
  startSession: (m: MantraDef) => void;
  /** Callback to remove a mantra definition from the user's collection by ID. */
  removeMantraDef: (id: string) => void;
  /** Callback to add a new mantra definition from a preset or custom entry. */
  addMantraDef: (def: Partial<MantraDef> & { name: string }) => void;
  /** Returns the all-time cumulative bead count for a given mantra ID. */
  getMantraTotalCount: (id: string) => number;
  /** Returns today's bead count for a given mantra ID. */
  getMantraTodayCount: (id: string) => number;
  /** Returns the current consecutive-day streak for a given mantra ID. */
  getMantraStreak: (id: string) => number;
  /** React Navigation object for navigating to history and other screens. */
  nav: NavigationProp<RootStackParamList>;
}

/**
 * Mantra selection and preset management page.
 *
 * Renders a `FlatList` of the user's saved mantras with cumulative and daily
 * statistics, a target-rounds selector, and a searchable preset library at the
 * bottom for adding new mantras.
 *
 * Layout:
 * - **Header**: target-rounds chip selector + "My Mantras" heading with history link.
 * - **List items**: each mantra card shows name, subtitle, today's count,
 *   cumulative total with optional progress bar, streak badge, and a remove button.
 * - **Empty state**: illustrated prompt to add the first mantra.
 * - **Footer**: searchable preset library filtered by category (dharani / buddha name),
 *   excluding sutras and already-added mantras.
 *
 * @param props - {@link Props}
 * @returns A full-screen view with the mantra selection list.
 */
export default function MantraSelectPage(props: Props) {
  const { myMantras, targetRounds, setTargetRounds, presetSearch, setPresetSearch,
    startSession, removeMantraDef, addMantraDef, getMantraTotalCount, getMantraTodayCount,
    getMantraStreak, nav } = props;

  const TH = useTheme();
  const T = useT();

  /**
   * Adds a preset mantra to the user's collection.
   * Strips the preset down to the fields required by `addMantraDef`.
   *
   * @param preset - A preset mantra definition from the library.
   */
  const addPreset = useCallback((preset: { name: string; subtitle?: string; category: 'dharani' | 'sutra' | 'buddha_name' | 'custom'; pronunciation?: string; meaning?: string }) => {
    addMantraDef({ name: preset.name, subtitle: preset.subtitle, category: preset.category, pronunciation: preset.pronunciation, meaning: preset.meaning });
  }, [addMantraDef]);

  /**
   * Renders a single mantra card in the FlatList.
   *
   * Displays the mantra name, subtitle, today's count (if any), cumulative total
   * with optional progress bar toward `targetCount`, a streak badge, and a remove
   * button. Tapping the card starts a chanting session.
   *
   * @param info - FlatList render item info containing the {@link MantraDef}.
   * @returns A touchable card element for the mantra.
   */
  const renderMantraItem = useCallback(({ item: m }: ListRenderItemInfo<MantraDef>) => {
    const total = getMantraTotalCount(m.id);
    const today = getMantraTodayCount(m.id);
    const streak = getMantraStreak(m.id);
    const progress = m.targetCount ? Math.min(100, Math.round(total / m.targetCount * 100)) : null;
    return (
      <TouchableOpacity onPress={() => startSession(m)}
        style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 8 }}>
        <View style={s.rowBetween}>
          <View style={s.flex1}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{m.name}</Text>
            {m.subtitle && <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{m.subtitle}</Text>}
            {today > 0 && (
              <Text style={s.todayCount}>{T('mantraTodayCount')} {today}</Text>
            )}
          </View>
          <View style={s.alignEnd}>
            <Text style={s.totalCount}>{total.toLocaleString()}</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('mantraCumulative')}</Text>
          </View>
        </View>
        {progress !== null && (
          <View style={s.progressContainer}>
            <View style={{ height: 4, backgroundColor: `${TH.border}60`, borderRadius: 2 }}>
              <View style={{ height: 4, width: `${progress}%`, backgroundColor: '#FBBF24', borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>
              {total.toLocaleString()} / {m.targetCount?.toLocaleString()} ({progress}%)
            </Text>
          </View>
        )}
        <View style={s.footerRow}>
          <Text style={s.streakText}>🔥 {streak} {T('mantraDays')}</Text>
          <TouchableOpacity onPress={() => removeMantraDef(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.removeText}>移除</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [TH, T, startSession, getMantraTotalCount, getMantraTodayCount, getMantraStreak, removeMantraDef]);

  /**
   * Memoized list header component for the FlatList.
   *
   * Contains:
   * 1. A target-rounds chip selector (1, 2, 3, 5, 7, 10 rounds).
   * 2. A "My Mantras" section heading with a link to the mantra history screen.
   */
  const listHeader = useMemo(() => (
    <View>
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('mantraTargetRounds')}</Text>
        <View style={s.roundsRow}>
          {[1, 2, 3, 5, 7, 10].map(n => (
            <TouchableOpacity key={n} onPress={() => setTargetRounds(n)}
              style={[s.roundChip, { backgroundColor: targetRounds === n ? '#FBBF24' : TH.border }]}>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: targetRounds === n ? '#fff' : TH.text }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={s.sectionHeaderRow}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('mantraMyMantras')}</Text>
        <TouchableOpacity onPress={() => nav.navigate('MantraHistory', {})}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('mantraHistory')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [TH, T, targetRounds, nav, setTargetRounds]);

  /**
   * Memoized empty-state component shown when the user has no saved mantras.
   * Displays a mala bead icon with a prompt to add the first mantra
   * and a hint about the preset library below.
   */
  const emptyState = useMemo(() => (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 24, alignItems: 'center' }}>
      <Text style={s.emptyIcon}>📿</Text>
      <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('mantraNoMantra')}</Text>
      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('mantraAddHint')}</Text>
    </View>
  ), [TH, T]);

  /**
   * Memoized list footer component for the FlatList.
   *
   * Contains the preset mantra library section:
   * - A text input for searching/filtering presets.
   * - A list of preset mantras (dharani and buddha-name categories only, excluding
   *   those already in the user's collection and sutras) with category badges and
   *   an add button.
   * - Filtering is case-sensitive and matches against name or subtitle.
   */
  const listFooter = useMemo(() => (
    <View style={s.footerContainer}>
      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('mantraPresetLibrary')}</Text>
      <TextInput
        style={{ backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: TH.text, fontSize: FONT_SUB(), marginBottom: 10, borderWidth: 1, borderColor: TH.border }}
        placeholder={T('mantraSearchPlaceholder')}
        placeholderTextColor={TH.sub}
        value={presetSearch}
        onChangeText={setPresetSearch}
      />
      <View style={s.presetList}>
        {PRESET_SUTRAS.filter(p => p.category !== 'sutra' && !myMantras.some(m => m.name === p.name) && (presetSearch === '' || p.name.includes(presetSearch) || (p.subtitle ?? '').includes(presetSearch))).map((p, i) => (
          <TouchableOpacity key={i} onPress={() => addPreset(p)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: TH.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: TH.border }}>
            <View style={s.flex1}>
              <View style={s.categoryRow}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{p.name}</Text>
                <View style={[s.categoryBadge, { backgroundColor: p.category === 'sutra' ? '#6366F120' : p.category === 'buddha_name' ? '#10B98120' : '#FBBF2420' }]}>
                  <Text style={[s.categoryBadgeText, { color: p.category === 'sutra' ? '#6366F1' : p.category === 'buddha_name' ? '#10B981' : '#D97706' }]}>
                    {p.category === 'sutra' ? T('sutraCategorySutra') : p.category === 'buddha_name' ? T('sutraCategoryBuddhaName') : T('sutraCategoryDharani')}
                  </Text>
                </View>
              </View>
              {p.subtitle && <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{p.subtitle}</Text>}
            </View>
            <Text style={s.addIcon}>+</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [TH, T, presetSearch, myMantras, addPreset, setPresetSearch]);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('mantraSubtitle')}</Text>
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          data={myMantras}
          renderItem={renderMantraItem}
          keyExtractor={(item: MantraDef) => item.id}
          removeClippedSubviews={true}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          ListFooterComponent={listFooter}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Static styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  todayCount: {
    fontSize: FONT_SMALL(),
    color: '#10B981',
    marginTop: 4,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  totalCount: {
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '800',
    color: '#FBBF24',
  },
  progressContainer: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  streakText: {
    fontSize: FONT_SMALL(),
    color: '#F59E0B',
  },
  removeText: {
    fontSize: FONT_SMALL(),
    color: '#EF4444',
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roundChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  footerContainer: {
    marginTop: 16,
  },
  presetList: {
    marginBottom: 16,
    gap: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addIcon: {
    fontSize: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
