import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Flag, Target, Star, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { Vision, VisionType, VisionStatus } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import VisionCard from './components/VisionCard';
import VisionEditModal from './modals/VisionEditModal';

interface Props {
  TH: any;
  T: (key: string) => string;
  visionProgress: { vision: Vision; pct: number }[];
}

export default function VowTab({ TH, T, visionProgress }: Props) {
  const store = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<VisionType>('long');
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);

  const visions = useMemo(() => (store.visions ?? []).filter((v: Vision) => !v.deleted), [store.visions]);

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

  const handleSave = (data: { text: string; timeFrame?: string; deadline?: string; linkedPractices: { refType: any; refId: string }[] }) => {
    if (editingVision) {
      store.updateVision(editingVision.id, {
        text: data.text,
        timeFrame: data.timeFrame as any,
        deadline: data.deadline,
      });
      // Update linked practices
      store.removeVisionPracticesByVision(editingVision.id);
      for (const lp of data.linkedPractices) {
        store.addVisionPractice({ visionId: editingVision.id, refType: lp.refType, refId: lp.refId });
      }
    } else {
      const result = store.addVision({
        type: editType,
        text: data.text,
        timeFrame: data.timeFrame,
        deadline: data.deadline,
      });
      if (result) {
        for (const lp of data.linkedPractices) {
          store.addVisionPractice({ visionId: result.id, refType: lp.refType, refId: lp.refId });
        }
      }
    }
  };

  const handleAchieve = (id: string) => {
    Alert.alert(T('vowAchieve'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowAchieve'), onPress: () => store.achieveVision(id) },
    ]);
  };

  const handleArchive = (id: string) => {
    Alert.alert(T('vowArchive'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowArchive'), onPress: () => store.archiveVision(id) },
    ]);
  };

  const renderVisionSection = (type: VisionType, active: Vision | undefined, color: string, Icon: any) => {
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
