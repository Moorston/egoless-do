import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Flag, Target, Star, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { Vision, VisionType, VisionStatus, Theme, Plan, PlanItem, RefType, VisionTimeFrame } from '@egoless-do/core';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import VisionCard from './components/VisionCard';
import VisionEditModal from './modals/VisionEditModal';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  visionProgress: { vision: Vision; pct: number }[];
}

export default function VowTab({ TH, T, visionProgress }: Props) {
  const { visions: visionsRaw, plans: plansRaw, planItems: planItemsRaw,
    updateVision, removeVisionPracticesByVision, addVisionPractice, addVision,
    achieveVision, archiveVision } = useAppStore(useShallow(s => ({
    visions: s.visions,
    plans: s.plans,
    planItems: s.planItems,
    updateVision: s.updateVision,
    removeVisionPracticesByVision: s.removeVisionPracticesByVision,
    addVisionPractice: s.addVisionPractice,
    addVision: s.addVision,
    achieveVision: s.achieveVision,
    archiveVision: s.archiveVision,
  })));
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<VisionType>('long');
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);

  const visions = useMemo(() => (visionsRaw ?? []).filter((v: Vision) => !v.deleted), [visionsRaw]);
  const plans = useMemo(() => (plansRaw ?? []).filter((p: Plan) => !p.deleted), [plansRaw]);
  const planItems = useMemo(() => (planItemsRaw ?? []).filter((i: PlanItem) => !i.deleted), [planItemsRaw]);

  const activeLifetime = useMemo(() => visions.find(v => v.type === 'lifetime' && v.status === 'active'), [visions]);
  const activeLong = useMemo(() => visions.find(v => v.type === 'long' && v.status === 'active'), [visions]);
  const activeShort = useMemo(() => visions.find(v => v.type === 'short' && v.status === 'active'), [visions]);
  const achievedOrArchived = useMemo(() =>
    visions.filter(v => v.status === 'achieved' || v.status === 'archived'),
    [visions]
  );

  const getProgress = useCallback((v: Vision) => {
    const vp = visionProgress.find(p => p.vision.id === v.id);
    return vp?.pct ?? 0;
  }, [visionProgress]);

  const getVisionStats = useCallback((v: Vision) => {
    const linked = plans.filter((p: Plan) => p.visionId === v.id);
    const planDone = linked.filter((p: Plan) => p.status === 'completed').length;
    let taskDone = 0;
    let taskTotal = 0;
    for (const plan of linked) {
      const items = planItems.filter((i: PlanItem) => i.planId === plan.id);
      taskDone += items.filter((i: PlanItem) => i.status === 'completed').length;
      taskTotal += items.length;
    }
    return { planDone, planTotal: linked.length, taskDone, taskTotal };
  }, [plans, planItems]);

  const handleCreate = (type: VisionType) => {
    const existing = visions.find(v => v.type === type && v.status === 'active');
    if (existing) {
      Alert.alert(
        T('vowTitle'),
        T('vowNeedArchive').replace('{type}', T(`vow${type === 'lifetime' ? 'Lifetime' : type === 'long' ? 'Long' : 'Short'}`)),
      );
      return;
    }
    setEditType(type);
    setEditingVision(null);
    setShowModal(true);
  };

  const handleEdit = (v: Vision) => {
    setEditType(v.type);
    setEditingVision(v);
    setShowModal(true);
  };

  const handleSave = (data: { text: string; timeFrame?: string; deadline?: string; linkedPractices: { refType: RefType; refId: string }[] }) => {
    if (editingVision) {
      updateVision(editingVision.id, {
        text: data.text,
        timeFrame: data.timeFrame as VisionTimeFrame | undefined,
        deadline: data.deadline,
      });
      // Update linked practices
      removeVisionPracticesByVision(editingVision.id);
      for (const lp of data.linkedPractices) {
        addVisionPractice({ visionId: editingVision.id, refType: lp.refType, refId: lp.refId });
      }
    } else {
      const result = addVision({
        type: editType,
        text: data.text,
        timeFrame: data.timeFrame,
        deadline: data.deadline,
      });
      if (result) {
        for (const lp of data.linkedPractices) {
          addVisionPractice({ visionId: result.id, refType: lp.refType, refId: lp.refId });
        }
      }
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

  const renderVisionSection = (type: VisionType, active: Vision | undefined, color: string, Icon: React.ComponentType<{ size?: number; color?: string }>) => {
    const label = T(`vow${type === 'lifetime' ? 'Lifetime' : type === 'long' ? 'Long' : 'Short'}`);
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 }}>
          <Icon size={16} color={color} />
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{label}</Text>
        </View>

        {active ? (
          <VisionCard
            vision={active}
            TH={TH}
            T={T}
            pct={getProgress(active)}
            {...getVisionStats(active)}
            onEdit={handleEdit}
            onAchieve={handleAchieve}
            onArchive={handleArchive}
          />
        ) : (
          <TouchableOpacity
            onPress={() => handleCreate(type)}
            style={{
              backgroundColor: TH.card, borderRadius: 16, padding: 20,
              borderWidth: 1.5, borderColor: `${color}40`, borderStyle: 'dashed',
              alignItems: 'center', gap: 8, marginBottom: 12,
            }}
          >
            <Plus size={20} color={color} />
            <Text style={{ fontSize: FONT_BODY, color: color, fontWeight: '600' }}>
              {type === 'lifetime' ? T('vowNoLifetime') : type === 'long' ? T('vowCreateLong') : T('vowCreateShort')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View>
      {/* Lifetime vision banner */}
      {renderVisionSection('lifetime', activeLifetime, '#F59E0B', Star)}

      {/* Long-term vision */}
      {renderVisionSection('long', activeLong, '#8B5CF6', Flag)}

      {/* Short-term vision */}
      {renderVisionSection('short', activeShort, '#10B981', Target)}

      {/* Achieved/Archived section */}
      {achievedOrArchived.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setShowAchieved(!showAchieved)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 12, paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub }}>
              {T('vowAchievedList')} ({achievedOrArchived.length})
            </Text>
            {showAchieved ? <ChevronUp size={16} color={TH.sub} /> : <ChevronDown size={16} color={TH.sub} />}
          </TouchableOpacity>

          {showAchieved && achievedOrArchived.map(v => (
            <VisionCard
              key={v.id}
              vision={v}
              TH={TH}
              T={T}
              pct={getProgress(v)}
              {...getVisionStats(v)}
              onEdit={handleEdit}
              onAchieve={handleAchieve}
              onArchive={handleArchive}
            />
          ))}
        </View>
      )}

      <VisionEditModal
        visible={showModal}
        TH={TH}
        T={T}
        vision={editingVision}
        type={editType}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </View>
  );
}
