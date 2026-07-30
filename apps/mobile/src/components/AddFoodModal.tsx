import { COLORS, FOOD_PRESETS, WUXING_MAP, WUXING_ELEMENT_CONFIG, EATING_MOTIVATIONS, FONT_TITLE, FONT_BUTTON, FONT_LABEL, FONT_BADGE, FONT_BODY, FONT_SUB, FONT_EMPTY, FONT_STAT_SECTION, FONT_BACK, dateStr, FONT_SMALL } from '@egoless-do/core';
import type { WuxingElement, FlavorType, FoodWuxingItem } from '@egoless-do/core';
import {
  Star, ChevronLeft, X, Search,
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Animated,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore, useShallowStore } from '../store/useAppStore';

import { useTheme, useT, ThemedInput } from './UI';

/** Map FOOD_PRESETS icon name strings to Lucide components */
const FOOD_ICON_MAP: Record<string, React.ComponentType<{size?: number; color?: string}>> = {
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onFoodAdded?: () => void;
}

// eslint-disable-next-line max-lines-per-function -- large modal component; splitting into sub-components is a separate refactor
export default function AddFoodModal({ visible, onClose, onFoodAdded }: Props) {
  const TH = useTheme();
  const T  = useT();
  const P  = TH.primary;
  const language = useShallowStore(s => s.language);
  const customFoodPresets = useShallowStore(s => s.customFoodPresets);
  const insets = useSafeAreaInsets();

  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [editing, setEditing]   = useState<{ name: string; cal: number; note: string; wuxing?: FoodWuxingItem | null } | null>(null);
  const [fn, setFn]   = useState('');
  const [fc, setFc]   = useState('');
  const [fnote, setFnote] = useState('');
  const [portion, setPortion] = useState(1);
  const [toast, setToast] = useState('');
  const [motivation, setMotivation] = useState<string>('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Wuxing search results (searches WUXING_MAP by name/alias)
  const wuxingResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return WUXING_MAP.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      (item.aliases ?? []).some(a => a.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [search]);

  const ELEMENT_COLORS: Record<WuxingElement, string> = {
    wood: '#10B981', fire: '#EF4444', earth: '#F59E0B', metal: '#9CA3AF', water: '#3B82F6',
  };
  const FLAVOR_LABELS: Record<FlavorType, string> = {
    sour: '酸', bitter: '苦', sweet: '甘', pungent: '辛', salty: '咸',
  };

  const allTabs = useMemo(() => [
    { key: 'my', label: T('foodMyPresets'), iconComp: Star as React.ComponentType<{size?: number; color?: string}>, items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: language === 'en' ? c.labelEn : c.label, iconComp: (FOOD_ICON_MAP[c.icon] ?? Utensils) as React.ComponentType<{size?: number; color?: string}>, items: c.items })),
  ], [T, language]);

  const getFilteredItems = useCallback(() => {
    const q = search.trim().toLowerCase();
    const presetItems: { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] =
      (customFoodPresets ?? []).map(p => ({ name: p.name, nameEn: p.name, cal: p.calories, unit: '份', unitEn: 'serving' }));

    if (q) {
      const allItems = [
        ...presetItems,
        ...FOOD_PRESETS.flatMap(c => c.items),
      ];
      return allItems.filter(i => i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
    }

    const t = allTabs[tab];
    if (!t) return [];
    return t.key === 'my' ? presetItems : t.items;
  }, [allTabs, tab, search, customFoodPresets]);

  const resetAll = useCallback(() => {
    setSearch(''); setTab(0); setShowManual(false);
    setEditing(null); setFn(''); setFc(''); setFnote(''); setPortion(1);
    setMotivation('');
  }, []);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(''));
    }, 2000);
  }, [toastAnim]);

  // Tap preset → open edit area
  const handleSelectPreset = useCallback((name: string, cal: number, wuxing?: FoodWuxingItem | null) => {
    setEditing({ name, cal, note: '', wuxing });
    setPortion(1);
    setMotivation('');
    setShowManual(false);
  }, []);

  // Long press → quick add
  const handleQuickAdd = useCallback((name: string, cal: number) => {
    useAppStore.getState().addFood({ name, calories: cal, note: '', timestamp: Date.now() });
    showToast(`${T('foodAdded')}: ${name}`);
    onFoodAdded?.();
  }, [T, showToast, onFoodAdded]);

  // Confirm editing preset
  const handleConfirmEdit = useCallback(() => {
    if (!editing) return;
    const totalCal = Math.round(editing.cal * portion);
    const store = useAppStore.getState();
    store.addFood({ name: editing.name, calories: totalCal, note: editing.note, timestamp: Date.now() });
    // Save motivation if selected
    if (motivation) {
      const todayFoods = (store.foodLog ?? []).filter(f => !f.deleted && dateStr(new Date(f.timestamp)) === dateStr());
      const lastFood = todayFoods[0]; // most recent
      if (lastFood) {
        store.setFoodMotivation({ foodId: lastFood.id, date: dateStr(), motivation: motivation as string });
      }
    }
    showToast(`${T('foodAdded')}: ${editing.name} ${totalCal}kcal`);
    setEditing(null);
    setPortion(1);
    setMotivation('');
    onFoodAdded?.();
  }, [editing, portion, motivation, T, showToast, onFoodAdded]);

  // Confirm and continue (save + reset for next entry)
  const handleConfirmAndContinue = useCallback(() => {
    if (!editing) return;
    const totalCal = Math.round(editing.cal * portion);
    const store = useAppStore.getState();
    store.addFood({ name: editing.name, calories: totalCal, note: editing.note, timestamp: Date.now() });
    if (motivation) {
      const todayFoods = store.foodLog.filter(f => !f.deleted && dateStr(new Date(f.timestamp)) === dateStr());
      const lastFood = todayFoods[0];
      if (lastFood) {
        store.setFoodMotivation({ foodId: lastFood.id, date: dateStr(), motivation: motivation as string });
      }
    }
    showToast(`${T('foodAdded')}: ${editing.name} ${totalCal}kcal`);
    // Reset for next entry but keep modal open
    setEditing(null);
    setPortion(1);
    setMotivation('');
    onFoodAdded?.();
  }, [editing, portion, motivation, T, showToast, onFoodAdded]);

  // Confirm manual input
  const handleConfirmManual = useCallback(() => {
    if (!fn.trim()) return;
    const cal = Math.max(0, Math.round(+fc || 0));
    useAppStore.getState().addFood({ name: fn, calories: cal, note: fnote, timestamp: Date.now() });
    showToast(`${T('foodAdded')}: ${fn}`);
    setFn(''); setFc(''); setFnote(''); setShowManual(false);
    onFoodAdded?.();
  }, [fn, fc, fnote, T, showToast, onFoodAdded]);

  // Save as preset
  const handleSavePreset = useCallback(() => {
    const name = editing?.name ?? fn;
    const cal = Math.max(0, editing ? Math.round(editing.cal * portion) : Math.round(+fc || 0));
    if (!name.trim() || cal <= 0) return;
    useAppStore.getState().addCustomFoodPreset(name, cal, editing?.note ?? fnote);
    showToast(T('foodSavePreset'));
  }, [editing, fn, fc, fnote, portion, T, showToast]);

  const searchFocused = search.trim().length > 0;
  const filteredItems = getFilteredItems();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { onClose(); resetAll(); }}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.overlay}>
        <View style={[styles.mainCard, { backgroundColor: TH.cardSolid }]}>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.titleText, { color: TH.text }]}>{T('foodAddTitle')}</Text>
            <TouchableOpacity onPress={() => { onClose(); resetAll(); }}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Manual add button + Search + Category tabs */}
          {!showManual && !editing && (
            <View style={[styles.controlsSection, { marginBottom: searchFocused ? 4 : 8 }]}>
              <TouchableOpacity onPress={() => setShowManual(true)}
                style={[styles.manualAddBtn, { backgroundColor: TH.card, borderColor: P }]}>
                <Text style={[styles.manualAddText, { color: P }]}>{T('foodManualInput')}</Text>
              </TouchableOpacity>
              <TextInput
                value={search} onChangeText={(v) => { setSearch(v); setEditing(null); }}
                placeholder={T('foodSearch')}
                placeholderTextColor={TH.sub}
                style={[styles.searchInput, { backgroundColor: TH.card, color: TH.text, borderColor: TH.border }]}
              />
              {!searchFocused && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={styles.tabsScroll} contentContainerStyle={styles.tabsScrollContent}>
                  {allTabs.map((t, i) => (
                    <TouchableOpacity key={t.key} onPress={() => { setTab(i); setEditing(null); }}
                      style={[styles.tabBase, { backgroundColor: tab === i ? P : TH.card }]}>
                      <t.iconComp size={14} color={tab === i ? '#fff' : TH.sub} />
                      <Text style={[styles.tabText, { color: tab === i ? '#fff' : TH.sub, fontWeight: tab === i ? '700' : '400' }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Food list - wuxing search results when searching, preset list otherwise */}
          {!editing && !showManual && (
            <ScrollView style={styles.foodListScroll} contentContainerStyle={styles.foodListContent} keyboardShouldPersistTaps="handled">
              {/* Wuxing search results */}
              {search.trim() && wuxingResults.length > 0 && (
                <View style={styles.wuxingSection}>
                  <Text style={[styles.wuxingSectionTitle, { color: TH.text }]}>
                    {`${T('dietWuxingLookup') || '五行食材'} (${wuxingResults.length})`}
                  </Text>
                  {wuxingResults.map(item => (
                    <TouchableOpacity key={item.foodKey}
                      onPress={() => handleSelectPreset(item.name, 0, item)}
                      style={[styles.wuxingItemRow, { borderBottomColor: TH.border }]}>
                      <View style={styles.flex1}>
                        <Text style={[styles.wuxingItemName, { color: TH.text }]}>{item.name}</Text>
                        <View style={styles.wuxingTagRow}>
                          <View style={[styles.wuxingBadge, { backgroundColor: `${ELEMENT_COLORS[item.primaryElement]}20` }]}>
                            <Text style={[styles.wuxingBadgeText, { color: ELEMENT_COLORS[item.primaryElement] }]}>
                              {FLAVOR_LABELS[item.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[item.primaryElement]?.label}
                            </Text>
                          </View>
                          <Text style={[styles.wuxingNatureText, { color: TH.sub }]}>
                            {item.nature === 'hot' ? '热' : item.nature === 'warm' ? '温' : item.nature === 'cool' ? '凉' : item.nature === 'cold' ? '寒' : '平'}
                          </Text>
                          <Text style={[styles.wuxingNatureText, { color: TH.sub }]}>{item.effect}</Text>
                        </View>
                      </View>
                      <Search size={16} color={TH.sub} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Preset food items */}
              {/* TODO(perf): list is bounded (FOOD_PRESETS is 49 items, wuxing capped at 20) and
                  sits inside a ScrollView alongside the wuxing section, so it does not meet
                  the above-50-item fixed-row-height threshold for FlashList. Leave as .map(). */}
              {filteredItems.map((f, i) => (
                <TouchableOpacity key={`${f.name}-${i}`}
                  onPress={() => handleSelectPreset(f.name, f.cal)}
                  onLongPress={() => handleQuickAdd(f.name, f.cal)}
                  style={[styles.presetRow, { borderBottomColor: TH.border }]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.presetName, { color: TH.text }]}>{f.name}</Text>
                    <Text style={[styles.presetUnit, { color: TH.sub }]}>{f.unit} · {T('foodLongPressHint')}</Text>
                  </View>
                  <Text style={[styles.presetCal, { color: P }]}>{f.cal} kcal</Text>
                </TouchableOpacity>
              ))}
              {filteredItems.length === 0 && !search.trim() && (
                <Text style={[styles.emptyText, { color: TH.sub }]}>
                  {tab === allTabs.length - 1 ? T('foodEmpty') : T('foodNoHistory')}
                </Text>
              )}
            </ScrollView>
          )}

          {/* Edit area (after selecting a preset) */}
          {editing && !showManual && (
            <ScrollView style={styles.sectionScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sectionScrollContent}>
              {/* Food name + calories */}
              <View style={[styles.editCard, { backgroundColor: TH.card }]}>
                <Text style={[styles.editFoodName, { color: TH.text }]}>{editing.name}</Text>
                {editing.cal > 0 && (
                  <Text style={[styles.editFoodUnit, { color: TH.sub }]}>{T('foodPerUnit')}: {editing.cal} kcal</Text>
                )}
                {/* Wuxing info */}
                {editing.wuxing && (
                  <View style={styles.wuxingEditRow}>
                    <View style={[styles.wuxingEditBadge, { backgroundColor: `${ELEMENT_COLORS[editing.wuxing.primaryElement]}20` }]}>
                      <Text style={[styles.wuxingEditBadgeText, { color: ELEMENT_COLORS[editing.wuxing.primaryElement] }]}>
                        {FLAVOR_LABELS[editing.wuxing.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[editing.wuxing.primaryElement]?.label}
                      </Text>
                    </View>
                    <Text style={[styles.wuxingEditText, { color: TH.sub }]}>
                      {editing.wuxing.nature === 'hot' ? '热性' : editing.wuxing.nature === 'warm' ? '温性' : editing.wuxing.nature === 'cool' ? '凉性' : editing.wuxing.nature === 'cold' ? '寒性' : '平性'}
                    </Text>
                    {editing.wuxing.organs?.length > 0 && (
                      <Text style={[styles.wuxingEditText, { color: TH.sub }]}>归{editing.wuxing.organs.join('/')}经</Text>
                    )}
                  </View>
                )}
                {editing.wuxing?.effect && (
                  <Text style={[styles.wuxingEditEffect, { color: TH.sub }]}>{editing.wuxing.effect}</Text>
                )}
              </View>

              {/* Portion adjustment (only for preset foods with calories) */}
              {editing.cal > 0 && (
                <>
                  <Text style={[styles.portionLabel, { color: TH.sub }]}>{T('foodPortion')}</Text>
                  <View style={styles.portionRow}>
                    {[0.5, 1, 1.5, 2].map(p => (
                      <TouchableOpacity key={p} onPress={() => setPortion(p)}
                        style={[styles.portionBase, {
                          backgroundColor: portion === p ? P : TH.card,
                          borderColor: TH.border,
                        }]}>
                        <Text style={[styles.portionText, { color: portion === p ? '#fff' : TH.text, fontWeight: portion === p ? '700' : '400' }]}>
                          {p}份
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Total calories */}
                  <View style={styles.totalCalRow}>
                    <Text style={[styles.totalCalLabel, { color: TH.sub }]}>{T('foodTotalCal')}</Text>
                    <Text style={styles.totalCalValue}>
                      {`${Math.round(editing.cal * portion)}`} <Text style={[styles.totalCalUnit, { color: TH.sub }]}>kcal</Text>
                    </Text>
                  </View>
                </>
              )}

              {/* Motivation (optional) */}
              <Text style={[styles.portionLabel, { color: TH.sub }]}>
                {T('dietMarkMotivation') || '进食动机（可选）'}
              </Text>
              <View style={styles.motivationRow}>
                {EATING_MOTIVATIONS.map(m => (
                  <TouchableOpacity key={m.key}
                    onPress={() => setMotivation(motivation === m.key ? '' : m.key)}
                    style={[styles.motivationChipBase, {
                      backgroundColor: motivation === m.key ? P : TH.card,
                      borderColor: motivation === m.key ? P : TH.border,
                    }]}>
                    <Text style={[styles.motivationChipText, { color: motivation === m.key ? '#fff' : TH.text }]}>
                      {T(`dietMotivation${m.key.charAt(0).toUpperCase() + m.key.slice(1)}`) || m.key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <TextInput
                value={editing.note} onChangeText={(v) => setEditing({ ...editing, note: v })}
                placeholder={T('foodInsight')}
                placeholderTextColor={TH.sub}
                style={[styles.noteInput, { backgroundColor: TH.card, color: TH.text, borderColor: TH.border }]}
              />

              {/* Action buttons */}
              <TouchableOpacity onPress={handleConfirmEdit}
                style={[styles.confirmButton, { backgroundColor: P }]}>
                <Text style={styles.confirmButtonText}>{T('foodConfirm')}</Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={handleConfirmAndContinue}
                  style={[styles.secondaryButton, { borderColor: P }]}>
                  <Text style={[styles.secondaryButtonText, { color: P }]}>保存并继续</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSavePreset}
                  style={[styles.secondaryButton, { borderColor: P }]}>
                  <Text style={[styles.secondaryButtonText, { color: P }]}>{T('foodSavePreset')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Manual input section */}
          {showManual && (
            <ScrollView style={styles.sectionScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sectionScrollContent}>
              <ThemedInput value={fn} onChangeText={setFn} placeholder={T('foodName')} style={styles.mb8} />
              <ThemedInput value={fc} onChangeText={setFc} placeholder={T('foodCal')} keyboardType="numeric" style={styles.mb8} />
              <ThemedInput value={fnote} onChangeText={setFnote} placeholder={T('foodInsight')} style={styles.mb16} />
              <TouchableOpacity onPress={handleConfirmManual}
                style={[styles.confirmButton, { backgroundColor: P }]}>
                <Text style={styles.confirmButtonText}>{T('foodConfirm')}</Text>
              </TouchableOpacity>
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={handleSavePreset}
                  style={[styles.secondaryButton, { borderColor: P }]}>
                  <Text style={[styles.secondaryButtonText, { color: P }]}>{T('foodSavePreset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowManual(false); setFn(''); setFc(''); setFnote(''); }}
                  style={[styles.secondaryButton, { borderColor: TH.border }]}>
                  <Text style={[styles.secondaryButtonText, { color: TH.sub }]}>{T('commonCancel')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Back to list */}
          {(showManual || editing) && (
            <TouchableOpacity onPress={() => { setShowManual(false); setEditing(null); setPortion(1); }}
              style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <ChevronLeft size={14} color={TH.sub} />
                <Text style={[styles.backButtonText, { color: TH.sub }]}>{T('foodBackToList')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Cancel button */}
          <TouchableOpacity onPress={() => { onClose(); resetAll(); }}
            style={[styles.cancelButton, { paddingBottom: 14 + insets.bottom, borderTopColor: TH.border }]}>
            <Text style={[styles.cancelButtonText, { color: TH.sub }]}>{T('commonCancel')}</Text>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        {toast ? (
          <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.85)',
    paddingTop: 48,
  },
  mainCard: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  titleText: {
    fontWeight: '700',
    fontSize: FONT_TITLE(),
  },
  controlsSection: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 20,
  },
  manualAddBtn: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  manualAddText: {
    fontSize: FONT_BUTTON(),
    fontWeight: '600',
  },
  searchInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: FONT_LABEL(),
    borderWidth: 1,
  },
  tabsScroll: {
    marginTop: 8,
  },
  tabsScrollContent: {
    gap: 6,
  },
  tabBase: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: FONT_BADGE(),
  },
  foodListScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodListContent: {
    paddingBottom: 12,
  },
  wuxingSection: {
    marginBottom: 12,
  },
  wuxingSectionTitle: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
    marginBottom: 8,
  },
  wuxingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  wuxingItemName: {
    fontSize: FONT_BODY(),
  },
  wuxingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  wuxingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wuxingBadgeText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  wuxingNatureText: {
    fontSize: FONT_SMALL(),
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  presetName: {
    fontSize: FONT_BODY(),
  },
  presetUnit: {
    fontSize: FONT_SUB(),
  },
  presetCal: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: FONT_EMPTY(),
  },
  sectionScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionScrollContent: {
    paddingBottom: 24,
  },
  editCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  editFoodName: {
    fontSize: FONT_BACK(),
    fontWeight: '700',
    marginBottom: 4,
  },
  editFoodUnit: {
    fontSize: FONT_BODY(),
  },
  wuxingEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  wuxingEditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wuxingEditBadgeText: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  wuxingEditText: {
    fontSize: FONT_SUB(),
  },
  wuxingEditEffect: {
    fontSize: FONT_SUB(),
    marginTop: 4,
  },
  portionLabel: {
    fontSize: FONT_LABEL(),
    marginBottom: 8,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  portionBase: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  portionActive: {
    borderWidth: 0,
  },
  portionInactive: {
    borderWidth: 1,
  },
  portionText: {
    fontSize: FONT_BODY(),
  },
  totalCalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  totalCalLabel: {
    fontSize: FONT_BODY(),
  },
  totalCalValue: {
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '800',
    color: COLORS.ORANGE,
  },
  totalCalUnit: {
    fontSize: FONT_SUB(),
    fontWeight: '400',
  },
  motivationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  motivationChipBase: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  motivationChipText: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  noteInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: FONT_LABEL(),
    borderWidth: 1,
    marginBottom: 16,
  },
  confirmButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_BUTTON(),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FONT_BUTTON(),
  },
  mb8: {
    marginBottom: 8,
  },
  mb16: {
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: FONT_SUB(),
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
  cancelButtonText: {
    fontSize: FONT_BUTTON(),
  },
  toast: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: {
    color: '#fff',
    fontSize: FONT_SUB(),
  },
});
