import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Animated,
  KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, useShallowStore } from '../store/useAppStore';
import { useTheme, useT, ThemedInput } from './UI';
import { COLORS, FOOD_PRESETS, WUXING_MAP, WUXING_ELEMENT_CONFIG, FLAVOR_CONFIG, EATING_MOTIVATIONS, FONT_TITLE, FONT_BUTTON, FONT_LABEL, FONT_BADGE, FONT_BODY, FONT_SUB, FONT_EMPTY, FONT_STAT_SECTION, FONT_BACK, dateStr } from '@egoless-do/core';
import type { WuxingElement, FlavorType, FoodWuxingItem } from '@egoless-do/core';
import {
  Star, ChevronLeft, X, Search,
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
} from 'lucide-react-native';

/** Map FOOD_PRESETS icon name strings to Lucide components */
const FOOD_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onFoodAdded?: () => void;
}

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
    { key: 'my', label: T('foodMyPresets'), iconComp: Star as React.ComponentType<any>, items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: language === 'en' ? c.labelEn : c.label, iconComp: (FOOD_ICON_MAP[c.icon] ?? Utensils) as React.ComponentType<any>, items: c.items })),
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', paddingTop: 48 }}>
        <View style={{ flex: 1, backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8, flexGrow: 0, flexShrink: 0 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('foodAddTitle')}</Text>
            <TouchableOpacity onPress={() => { onClose(); resetAll(); }}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Manual add button + Search + Category tabs */}
          {!showManual && !editing && (
            <View style={{ flexGrow: 0, flexShrink: 0, paddingHorizontal: 20, marginBottom: searchFocused ? 4 : 8 }}>
              <TouchableOpacity onPress={() => setShowManual(true)}
                style={{
                  backgroundColor: TH.card, borderRadius: 12, padding: 12,
                  borderWidth: 1, borderColor: P, alignItems: 'center', marginBottom: 8,
                }}>
                <Text style={{ color: P, fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('foodManualInput')}</Text>
              </TouchableOpacity>
              <TextInput
                value={search} onChangeText={(v) => { setSearch(v); setEditing(null); }}
                placeholder={T('foodSearch')}
                placeholderTextColor={TH.sub}
                style={{
                  backgroundColor: TH.card, borderRadius: 12, padding: 12,
                  fontSize: FONT_LABEL, color: TH.text, borderWidth: 1, borderColor: TH.border,
                }}
              />
              {!searchFocused && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
                  {allTabs.map((t, i) => (
                    <TouchableOpacity key={t.key} onPress={() => { setTab(i); setEditing(null); }}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: tab === i ? P : TH.card,
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                      }}>
                      <t.iconComp size={14} color={tab === i ? '#fff' : TH.sub} />
                      <Text style={{ color: tab === i ? '#fff' : TH.sub, fontSize: FONT_BADGE, fontWeight: tab === i ? '700' : '400' }}>
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
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {/* Wuxing search results */}
              {search.trim() && wuxingResults.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
                    {T('dietWuxingLookup') || '五行食材'} ({wuxingResults.length})
                  </Text>
                  {wuxingResults.map(item => (
                    <TouchableOpacity key={item.foodKey}
                      onPress={() => handleSelectPreset(item.name, 0, item)}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${ELEMENT_COLORS[item.primaryElement]}20` }}>
                            <Text style={{ fontSize: 10, color: ELEMENT_COLORS[item.primaryElement], fontWeight: '600' }}>
                              {FLAVOR_LABELS[item.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[item.primaryElement]?.label}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: TH.sub }}>
                            {item.nature === 'hot' ? '热' : item.nature === 'warm' ? '温' : item.nature === 'cool' ? '凉' : item.nature === 'cold' ? '寒' : '平'}
                          </Text>
                          <Text style={{ fontSize: 10, color: TH.sub }}>{item.effect}</Text>
                        </View>
                      </View>
                      <Search size={16} color={TH.sub} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Preset food items */}
              {filteredItems.map((f, i) => (
                <TouchableOpacity key={`${f.name}-${i}`}
                  onPress={() => handleSelectPreset(f.name, f.cal)}
                  onLongPress={() => handleQuickAdd(f.name, f.cal)}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TH.border,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{f.name}</Text>
                    <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{f.unit} · {T('foodLongPressHint')}</Text>
                  </View>
                  <Text style={{ color: P, fontSize: FONT_BODY, fontWeight: '600' }}>{f.cal} kcal</Text>
                </TouchableOpacity>
              ))}
              {filteredItems.length === 0 && !search.trim() && (
                <Text style={{ color: TH.sub, textAlign: 'center', paddingVertical: 32, fontSize: FONT_EMPTY }}>
                  {tab === allTabs.length - 1 ? T('foodEmpty') : T('foodNoHistory')}
                </Text>
              )}
            </ScrollView>
          )}

          {/* Edit area (after selecting a preset) */}
          {editing && !showManual && (
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Food name + calories */}
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_BACK, fontWeight: '700', color: TH.text, marginBottom: 4 }}>{editing.name}</Text>
                {editing.cal > 0 && (
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('foodPerUnit')}: {editing.cal} kcal</Text>
                )}
                {/* Wuxing info */}
                {editing.wuxing && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${ELEMENT_COLORS[editing.wuxing.primaryElement]}20` }}>
                      <Text style={{ fontSize: FONT_SUB, color: ELEMENT_COLORS[editing.wuxing.primaryElement], fontWeight: '600' }}>
                        {FLAVOR_LABELS[editing.wuxing.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[editing.wuxing.primaryElement]?.label}
                      </Text>
                    </View>
                    <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                      {editing.wuxing.nature === 'hot' ? '热性' : editing.wuxing.nature === 'warm' ? '温性' : editing.wuxing.nature === 'cool' ? '凉性' : editing.wuxing.nature === 'cold' ? '寒性' : '平性'}
                    </Text>
                    {editing.wuxing.organs?.length > 0 && (
                      <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>归{editing.wuxing.organs.join('/')}经</Text>
                    )}
                  </View>
                )}
                {editing.wuxing?.effect && (
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{editing.wuxing.effect}</Text>
                )}
              </View>

              {/* Portion adjustment (only for preset foods with calories) */}
              {editing.cal > 0 && (
                <>
                  <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginBottom: 8 }}>{T('foodPortion')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    {[0.5, 1, 1.5, 2].map(p => (
                      <TouchableOpacity key={p} onPress={() => setPortion(p)}
                        style={{
                          flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                          backgroundColor: portion === p ? P : TH.card,
                          borderWidth: portion === p ? 0 : 1, borderColor: TH.border,
                        }}>
                        <Text style={{ color: portion === p ? '#fff' : TH.text, fontWeight: portion === p ? '700' : '400', fontSize: FONT_BODY }}>
                          {p}份
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Total calories */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                    <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('foodTotalCal')}</Text>
                    <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: COLORS.ORANGE }}>
                      {Math.round(editing.cal * portion)} <Text style={{ fontSize: FONT_SUB, fontWeight: '400', color: TH.sub }}>kcal</Text>
                    </Text>
                  </View>
                </>
              )}

              {/* Motivation (optional) */}
              <Text style={{ color: TH.sub, fontSize: FONT_LABEL, marginBottom: 8 }}>
                {T('dietMarkMotivation') || '进食动机（可选）'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {EATING_MOTIVATIONS.map(m => (
                  <TouchableOpacity key={m.key}
                    onPress={() => setMotivation(motivation === m.key ? '' : m.key)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: motivation === m.key ? P : TH.card,
                      borderWidth: 1, borderColor: motivation === m.key ? P : TH.border,
                    }}>
                    <Text style={{ color: motivation === m.key ? '#fff' : TH.text, fontSize: FONT_SUB, fontWeight: '600' }}>
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
                style={{
                  backgroundColor: TH.card, borderRadius: 12, padding: 12,
                  fontSize: FONT_LABEL, color: TH.text, borderWidth: 1, borderColor: TH.border,
                  marginBottom: 16,
                }}
              />

              {/* Action buttons */}
              <TouchableOpacity onPress={handleConfirmEdit}
                style={{ backgroundColor: P, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('foodConfirm')}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={handleConfirmAndContinue}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: P, alignItems: 'center' }}>
                  <Text style={{ color: P, fontSize: FONT_BUTTON }}>保存并继续</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSavePreset}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: P, alignItems: 'center' }}>
                  <Text style={{ color: P, fontSize: FONT_BUTTON }}>{T('foodSavePreset')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Manual input section */}
          {showManual && (
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <ThemedInput value={fn} onChangeText={setFn} placeholder={T('foodName')} style={{ marginBottom: 8 }} />
              <ThemedInput value={fc} onChangeText={setFc} placeholder={T('foodCal')} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <ThemedInput value={fnote} onChangeText={setFnote} placeholder={T('foodInsight')} style={{ marginBottom: 16 }} />
              <TouchableOpacity onPress={handleConfirmManual}
                style={{ backgroundColor: P, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('foodConfirm')}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={handleSavePreset}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: P, alignItems: 'center' }}>
                  <Text style={{ color: P, fontSize: FONT_BUTTON }}>{T('foodSavePreset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowManual(false); setFn(''); setFc(''); setFnote(''); }}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>{T('commonCancel')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Back to list */}
          {(showManual || editing) && (
            <TouchableOpacity onPress={() => { setShowManual(false); setEditing(null); setPortion(1); }}
              style={{ padding: 12, alignItems: 'center', flexGrow: 0, flexShrink: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronLeft size={14} color={TH.sub} />
                <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{T('foodBackToList')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Cancel button */}
          <TouchableOpacity onPress={() => { onClose(); resetAll(); }}
            style={{ padding: 14, paddingBottom: 14 + insets.bottom, alignItems: 'center', borderTopWidth: 1, borderTopColor: TH.border, flexGrow: 0, flexShrink: 0 }}>
            <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>{T('commonCancel')}</Text>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        {toast ? (
          <Animated.View style={{
            position: 'absolute', bottom: 60, alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,.85)', paddingHorizontal: 20, paddingVertical: 10,
            borderRadius: 20, opacity: toastAnim,
          }}>
            <Text style={{ color: '#fff', fontSize: FONT_SUB }}>{toast}</Text>
          </Animated.View>
        ) : null}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
