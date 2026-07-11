import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, VISION_TIME_FRAMES, SHORT_TIME_FRAMES, LONG_TIME_FRAMES, dateStr } from '@egoless-do/core';
import type { Vision, VisionType, VisionStatus, VisionTimeFrame, Theme, Plan, PlanItem } from '@egoless-do/core';
import { Flag, Target, Plus, X, Star } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import VisionCard from './components/VisionCard';

const TYPE_CONFIG: Record<VisionType, { icon: React.ComponentType<{ size?: number; color?: string }>; labelKey: string; color: string }> = {
  lifetime: { icon: Star, labelKey: 'vowLifetime', color: '#F59E0B' },
  long: { icon: Flag, labelKey: 'vowLong', color: '#8B5CF6' },
  short: { icon: Target, labelKey: 'vowShort', color: '#10B981' },
};

function AddVisionModal({
  visible,
  onClose,
  onSave,
  existing,
  TH,
  T,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: VisionType; text: string; timeFrame?: VisionTimeFrame; startDate?: string; deadline?: string }) => void;
  existing: Vision | null;
  TH: Theme;
  T: (key: string) => string;
}) {
  const [type, setType] = useState<VisionType>('short');
  const [text, setText] = useState('');
  const [timeFrame, setTimeFrame] = useState<string>('');

  const initForm = useCallback(() => {
    if (existing) {
      setType(existing.type);
      setText(existing.text);
      setTimeFrame(existing.timeFrame ?? '');
    } else {
      setType('short');
      setText('');
      setTimeFrame('');
    }
  }, [existing]);

  React.useEffect(() => { if (visible) initForm(); }, [visible, initForm]);

  const canSave = text.trim().length > 0;
  const handleSave = () => {
    if (!canSave) return;
    onSave({ type, text: text.trim(), timeFrame: (timeFrame || undefined) as VisionTimeFrame | undefined });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>
              {existing ? T('vowEditTitle') : T('vowNewTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowType')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(Object.keys(TYPE_CONFIG) as VisionType[]).map(t => {
              const cfg = TYPE_CONFIG[t];
              const active = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
                    backgroundColor: active ? cfg.color + '20' : TH.card,
                    borderWidth: 1.5, borderColor: active ? cfg.color : TH.border,
                  }}
                >
                  {React.createElement(cfg.icon, { size: 18, color: active ? cfg.color : TH.sub })}
                  <Text style={{ fontSize: FONT_BADGE(), color: active ? cfg.color : TH.sub, marginTop: 4, fontWeight: active ? '600' : '400' }}>
                    {T(cfg.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {type !== 'lifetime' && (
            <>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowTimeRange')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {VISION_TIME_FRAMES.filter(tf =>
                  type === 'long' ? LONG_TIME_FRAMES.includes(tf.key as VisionTimeFrame) : SHORT_TIME_FRAMES.includes(tf.key as VisionTimeFrame)
                ).map(tf => {
                  const active = timeFrame === tf.key;
                  return (
                    <TouchableOpacity
                      key={tf.key}
                      onPress={() => setTimeFrame(active ? '' : tf.key)}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: active ? TH.primary + '20' : TH.card,
                        borderWidth: 1, borderColor: active ? TH.primary : TH.border,
                      }}
                    >
                      <Text style={{ fontSize: FONT_BADGE(), color: active ? TH.primary : TH.sub, fontWeight: active ? '600' : '400' }}>
                        {T(tf.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowContent')}</Text>
          <TextInput
            style={{
              backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text,
              fontSize: FONT_BODY(), minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border,
            }}
            multiline maxLength={500} value={text} onChangeText={setText}
            placeholder={T('vowContentPlaceholder')} placeholderTextColor={TH.sub}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub }}>{T('vowCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: canSave ? TH.primary : TH.border, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{existing ? T('vowSave') : T('vowCreate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function VowScreen() {
  const TH = useTheme();
  const T = useT();
  const { plans: plansRaw, planItems: planItemsRaw, visions: visionsRaw,
    updateVision, addVision, achieveVision, archiveVision, removeVision } = useShallowStore(s => ({
    plans: s.plans,
    planItems: s.planItems,
    visions: s.visions,
    updateVision: s.updateVision,
    addVision: s.addVision,
    achieveVision: s.achieveVision,
    archiveVision: s.archiveVision,
    removeVision: s.removeVision,
  }));

  const [showModal, setShowModal] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [filterStatus, setFilterStatus] = useState<VisionStatus | 'all'>('active');

  const plans = plansRaw ?? [];
  const planItems = planItemsRaw ?? [];

  const visions = useMemo(() =>
    (visionsRaw ?? []).filter(v => !v.deleted && (filterStatus === 'all' || v.status === filterStatus)),
    [visionsRaw, filterStatus],
  );

  const grouped = useMemo(() => {
    const order: VisionType[] = ['lifetime', 'long', 'short'];
    const map = new Map<VisionType, Vision[]>();
    for (const t of order) map.set(t, []);
    for (const v of visions) map.get(v.type)?.push(v);
    return order.filter(t => (map.get(t)?.length ?? 0) > 0).map(t => ({ type: t, items: map.get(t)! }));
  }, [visions]);

  const activeCount = useMemo(() =>
    (visionsRaw ?? []).filter(v => !v.deleted && v.status === 'active').length,
    [visionsRaw],
  );

  const handleAdd = () => {
    setEditingVision(null);
    setShowModal(true);
  };

  const handleEdit = (v: Vision) => {
    setEditingVision(v);
    setShowModal(true);
  };

  const handleSave = (data: { type: VisionType; text: string; timeFrame?: VisionTimeFrame; startDate?: string; deadline?: string }) => {
    if (editingVision) {
      updateVision(editingVision.id, data);
    } else {
      const existing = (visionsRaw ?? []).filter(v => !v.deleted);
      const conflict = existing.find(v => v.type === data.type && v.status === 'active');
      if (conflict) {
        Alert.alert(
          T('vowTitle'),
          T('vowNeedArchive').replace('{type}', T(`vow${data.type === 'lifetime' ? 'Lifetime' : data.type === 'long' ? 'Long' : 'Short'}`)),
        );
        return;
      }
      addVision({ ...data, startDate: dateStr() });
    }
  };

  const handleAchieve = (id: string) => {
    Alert.alert(T('vowAchieve'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowAchieve'), onPress: () => achieveVision(id) },
    ]);
  };

  const handleArchive = (id: string) => {
    Alert.alert(T('vowArchive'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowArchive'), onPress: () => archiveVision(id) },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert(T('vowDelete'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowDelete'), style: 'destructive', onPress: () => removeVision(id) },
    ]);
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Vow" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text }}>{T('vowTitle')}</Text>
        <TouchableOpacity onPress={handleAdd} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Plus size={18} color={TH.primary} />
          <Text style={{ color: TH.primary, fontSize: FONT_SUB(), fontWeight: '600' }}>{T('commonAdd')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Summary */}
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TH.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Flag size={22} color={TH.primary} />
          </View>
          <View>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowActive')}</Text>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{activeCount}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['active', 'achieved', 'archived', 'all'] as const).map(s => {
            const active = filterStatus === s;
            const labels: Record<string, string> = { active: T('vowActive'), achieved: T('vowAchieved'), archived: T('vowArchived'), all: T('allStatus') };
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterStatus(s)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: active ? TH.primary : TH.card,
                }}
              >
                <Text style={{ fontSize: FONT_BADGE(), color: active ? '#fff' : TH.sub, fontWeight: active ? '600' : '400' }}>
                  {labels[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {grouped.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('vowNoVision')}</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', marginBottom: 24 }}>{T('vowLifetimeHint')}</Text>
            <TouchableOpacity onPress={handleAdd} style={{ backgroundColor: TH.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY() }}>✦ {T('vowCreate')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(({ type, items }) => (
            <View key={type} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 4 }}>
                {React.createElement(TYPE_CONFIG[type].icon, { size: 16, color: TYPE_CONFIG[type].color })}
                <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text }}>{T(TYPE_CONFIG[type].labelKey)}</Text>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{items.length}</Text>
              </View>
              {items.map(v => {
                const linked = plans.filter((p: Plan) => !p.deleted && p.visionId === v.id);
                let pct = 0;
                let totalDone = 0;
                let totalItems = 0;
                if (linked.length > 0) {
                  for (const plan of linked) {
                    const pi = planItems.filter((i: PlanItem) => i.planId === plan.id && !i.deleted);
                    totalDone += pi.filter((i: PlanItem) => i.status === 'completed').length;
                    totalItems += pi.length;
                  }
                  pct = totalItems > 0 ? Math.min(100, Math.round((totalDone / totalItems) * 100)) : 0;
                }
                const planDone = linked.filter((p: Plan) => p.status === 'completed').length;
                return (
                  <VisionCard
                    key={v.id}
                    vision={v}
                    TH={TH}
                    T={T}
                    pct={pct}
                    planDone={planDone}
                    planTotal={linked.length}
                    taskDone={totalDone}
                    taskTotal={totalItems}
                    onAchieve={handleAchieve}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    linkedPlans={linked}
                    planItems={planItems}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <AddVisionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        existing={editingVision}
        TH={TH}
        T={T}
      />
    </SafeAreaView>
  );
}
