import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Animated,
  KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useTheme, useT, ThemedInput } from './UI';
import { COLORS, FOOD_PRESETS, FONT_TITLE, FONT_BUTTON, FONT_LABEL, FONT_BADGE, FONT_BODY, FONT_SUB, FONT_EMPTY, FONT_STAT_SECTION, FONT_BACK } from '@egoless-do/core';
import {
  Star, ChevronLeft, X,
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
} from 'lucide-react-native';

/** Map FOOD_PRESETS icon name strings to Lucide components */
const FOOD_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils,
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddFoodModal({ visible, onClose }: Props) {
  const TH = useTheme();
  const T  = useT();
  const P  = TH.primary;
  const store = useAppStore();

  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [editing, setEditing]   = useState<{ name: string; cal: number; note: string } | null>(null);
  const [fn, setFn]   = useState('');
  const [fc, setFc]   = useState('');
  const [fnote, setFnote] = useState('');
  const [portion, setPortion] = useState(1);
  const [toast, setToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const allTabs = useMemo(() => [
    { key: 'my', label: T('foodMyPresets'), iconComp: Star as React.ComponentType<any>, items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: store.language === 'en' ? c.labelEn : c.label, iconComp: (FOOD_ICON_MAP[c.icon] ?? Utensils) as React.ComponentType<any>, items: c.items })),
  ], [T, store.language]);

  const getFilteredItems = useCallback(() => {
    const q = search.trim().toLowerCase();
    const presetItems: { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] =
      (store.customFoodPresets ?? []).map(p => ({ name: p.name, nameEn: p.name, cal: p.calories, unit: '份', unitEn: 'serving' }));

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
  }, [allTabs, tab, search, store.customFoodPresets]);

  const resetAll = useCallback(() => {
    setSearch(''); setTab(0); setShowManual(false);
    setEditing(null); setFn(''); setFc(''); setFnote(''); setPortion(1);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(''));
    }, 2000);
  }, [toastAnim]);

  // Tap preset → open edit area
  const handleSelectPreset = useCallback((name: string, cal: number) => {
    setEditing({ name, cal, note: '' });
    setPortion(1);
    setShowManual(false);
  }, []);

  // Long press → quick add
  const handleQuickAdd = useCallback((name: string, cal: number) => {
    store.addFood({ name, calories: cal, note: '', timestamp: Date.now() });
    showToast(`${T('foodAdded')}: ${name}`);
  }, [store, T, showToast]);

  // Confirm editing preset
  const handleConfirmEdit = useCallback(() => {
    if (!editing) return;
    const totalCal = Math.round(editing.cal * portion);
    store.addFood({ name: editing.name, calories: totalCal, note: editing.note, timestamp: Date.now() });
    showToast(`${T('foodAdded')}: ${editing.name} ${totalCal}kcal`);
    setEditing(null);
    setPortion(1);
  }, [editing, portion, store, T, showToast]);

  // Confirm manual input
  const handleConfirmManual = useCallback(() => {
    if (!fn.trim()) return;
    store.addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() });
    showToast(`${T('foodAdded')}: ${fn}`);
    setFn(''); setFc(''); setFnote(''); setShowManual(false);
  }, [fn, fc, fnote, store, T, showToast]);

  // Save as preset
  const handleSavePreset = useCallback(() => {
    const name = editing?.name ?? fn;
    const cal = editing ? Math.round(editing.cal * portion) : (+fc || 0);
    if (!name.trim()) return;
    store.addCustomFoodPreset(name, cal, editing?.note ?? fnote);
    showToast(T('foodSavePreset'));
  }, [editing, fn, fc, fnote, portion, store, T, showToast]);

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

          {/* Food list */}
          {!editing && !showManual && (
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
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
              {filteredItems.length === 0 && (
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
                <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('foodPerUnit')}: {editing.cal} kcal</Text>
              </View>

              {/* Portion adjustment */}
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
                <TouchableOpacity onPress={handleSavePreset}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: P, alignItems: 'center' }}>
                  <Text style={{ color: P, fontSize: FONT_BUTTON }}>{T('foodSavePreset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditing(null); setPortion(1); }}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>{T('commonCancel')}</Text>
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
