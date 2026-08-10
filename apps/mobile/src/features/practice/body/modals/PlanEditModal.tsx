import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, EXERCISE_CATEGORIES, type BodyPlan, type Theme} from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';

import { PrimaryButton, OutlineButton } from '../../../../components/UI';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

// Group exercise categories by their category i18n key
function useGroupedCategories(T: (key: string) => string) {
  return useMemo(() => {
    const groups: { label: string; items: { key: string; label: string; icon: string }[] }[] = [];
    const map = new Map<string, { key: string; label: string; icon: string }[]>();
    for (const cat of EXERCISE_CATEGORIES) {
      const groupKey = cat.category || 'bodyCatModern'; // rest falls into modern
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push({ key: cat.key, label: T(cat.i18nKey), icon: cat.icon });
    }
    // Preserve order: traditional first, then modern
    const order = ['bodyCatTraditional', 'bodyCatModern'];
    for (const k of order) {
      const items = map.get(k);
      if (items) groups.push({ label: T(k), items });
    }
    return groups;
  }, [T]);
}

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  plans: BodyPlan[];
  onClose: () => void;
  onSave: (plans: BodyPlan[]) => void;
}

export default function PlanEditModal({ visible, TH, T, plans, onClose, onSave }: Props) {
  const [editingPlans, setEditingPlans] = useState<BodyPlan[]>(() => {
    const result: BodyPlan[] = [];
    for (let i = 1; i <= 7; i++) {
      const existing = plans.find(p => p.weekday === i && !p.deleted);
      result.push(existing ?? { id: `temp_${i}`, weekday: i, part: '', sportKey: '', note: '', updatedAt: 0, deleted: false } as BodyPlan);
    }
    return result;
  });

  const groupedCategories = useGroupedCategories(T);

  // Build a reverse map from part label (translated) to key, for selecting existing plans
  const labelToKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of EXERCISE_CATEGORIES) {
      m.set(T(cat.i18nKey), cat.key);
    }
    return m;
  }, [T]);

  // Build key-to-label map for display
  const keyToLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of EXERCISE_CATEGORIES) {
      m.set(cat.key, T(cat.i18nKey));
    }
    return m;
  }, [T]);

  // Resolve the current plan part to a category key (handles both old strings and new keys)
  const getSelectedKey = (plan: BodyPlan): string => {
    // If part is already a key from EXERCISE_CATEGORIES
    if (EXERCISE_CATEGORIES.some(c => c.key === plan.part)) return plan.part;
    // If part is a translated label
    const fromLabel = labelToKey.get(plan.part);
    if (fromLabel) return fromLabel;
    return '';
  };

  const updatePlan = (idx: number, catKey: string) => {
    // Store the category key as the part value
    setEditingPlans(prev => prev.map((p, i) => i === idx ? { ...p, part: catKey } : p));
  };

  const updateNote = (idx: number, note: string) => {
    setEditingPlans(prev => prev.map((p, i) => i === idx ? { ...p, note } : p));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyPlanTitle')}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <ScrollView>
            {editingPlans.map((plan, idx) => {
              const selectedKey = getSelectedKey(plan);
              return (
                <View key={idx} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T(WEEKDAY_KEYS[idx])}</Text>
                  {groupedCategories.map(group => (
                    <View key={group.label} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 6 }}>{group.label}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {group.items.map(item => (
                          <TouchableOpacity key={item.key} onPress={() => updatePlan(idx, item.key)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: selectedKey === item.key ? '#f59e0b' : TH.border, backgroundColor: selectedKey === item.key ? '#f59e0b15' : 'transparent' }}>
                            <Text style={{ fontSize: FONT_SMALL() }}>{item.icon}</Text>
                            <Text style={{ fontSize: FONT_SMALL(), color: selectedKey === item.key ? '#f59e0b' : TH.text }}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <TextInput style={{ backgroundColor: TH.card, borderRadius: 8, padding: 10, color: TH.text, fontSize: FONT_BODY(), marginTop: 4 }} value={plan.note ?? ''} onChangeText={v => updateNote(idx, v)} placeholder={T('bodyPlanNote')} placeholderTextColor={TH.sub} />
                </View>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <OutlineButton label={T('bodyCancel')} onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('bodyPlanSave')} onPress={() => { onSave(editingPlans.filter(p => p.part)); onClose(); }} color="#f59e0b" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
