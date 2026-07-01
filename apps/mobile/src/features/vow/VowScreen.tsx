import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useAppStore } from '../../store/useAppStore';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, VISION_TIME_FRAMES, COLORS } from '@egoless-do/core';
import type { Vision, VisionType, VisionStatus, VisionTimeFrame } from '@egoless-do/core';
import { Flag, Target, Plus, Check, Archive, Trash2, X, Star } from 'lucide-react-native';

const TYPE_CONFIG: Record<VisionType, { icon: any; label: string; color: string }> = {
  lifetime: { icon: Star, label: '终极愿景', color: '#F59E0B' },
  long: { icon: Flag, label: '长期愿景', color: '#8B5CF6' },
  short: { icon: Target, label: '短期愿景', color: '#10B981' },
};

function VisionCard({
  vision,
  TH,
  onAchieve,
  onArchive,
  onDelete,
  onEdit,
}: {
  vision: Vision;
  TH: any;
  onAchieve: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (v: Vision) => void;
}) {
  const typeCfg = TYPE_CONFIG[vision.type];
  const timeFrameLabel = vision.timeFrame
    ? VISION_TIME_FRAMES.find(f => f.key === vision.timeFrame)?.labelKey ?? vision.timeFrame
    : null;

  return (
    <View style={{
      backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12,
      borderLeftWidth: 4, borderLeftColor: typeCfg.color,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {React.createElement(typeCfg.icon, { size: 16, color: typeCfg.color })}
            <Text style={{ fontSize: FONT_BADGE, color: typeCfg.color, fontWeight: '600' }}>{typeCfg.label}</Text>
            {timeFrameLabel && (
              <Text style={{ fontSize: 11, color: TH.sub, backgroundColor: `${TH.border}60`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                {timeFrameLabel}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 22 }}>{vision.text}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(vision)} style={{ padding: 4 }}>
          <Text style={{ fontSize: FONT_BADGE, color: TH.primary }}>编辑</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {vision.status === 'active' && (
          <TouchableOpacity
            onPress={() => onAchieve(vision.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#10B98120', borderRadius: 8 }}
          >
            <Check size={14} color="#10B981" />
            <Text style={{ fontSize: FONT_BADGE, color: '#10B981', fontWeight: '600' }}>达成</Text>
          </TouchableOpacity>
        )}
        {vision.status === 'active' && (
          <TouchableOpacity
            onPress={() => onArchive(vision.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: `${TH.border}60`, borderRadius: 8 }}
          >
            <Archive size={14} color={TH.sub} />
            <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>归档</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(vision.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#EF444420', borderRadius: 8 }}
        >
          <Trash2 size={14} color="#EF4444" />
          <Text style={{ fontSize: FONT_BADGE, color: '#EF4444' }}>删除</Text>
        </TouchableOpacity>
      </View>
      {vision.status !== 'active' && (
        <View style={{ marginTop: 8 }}>
          <Text style={{
            fontSize: FONT_BADGE, color: vision.status === 'achieved' ? '#10B981' : TH.sub,
            backgroundColor: vision.status === 'achieved' ? '#10B98115' : `${TH.border}40`,
            alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
          }}>
            {vision.status === 'achieved' ? '✦ 已达成' : '已归档'}
          </Text>
        </View>
      )}
    </View>
  );
}

function AddVisionModal({
  visible,
  onClose,
  onSave,
  existing,
  TH,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: VisionType; text: string; timeFrame?: VisionTimeFrame }) => void;
  existing: Vision | null;
  TH: any;
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
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
              {existing ? '编辑愿景' : '新增愿景'}
            </Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>类型</Text>
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
                  <Text style={{ fontSize: FONT_BADGE, color: active ? cfg.color : TH.sub, marginTop: 4, fontWeight: active ? '600' : '400' }}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {type !== 'lifetime' && (
            <>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>时间范围</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {VISION_TIME_FRAMES.map(tf => {
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
                      <Text style={{ fontSize: FONT_BADGE, color: active ? TH.primary : TH.sub, fontWeight: active ? '600' : '400' }}>
                        {tf.labelKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>愿景内容</Text>
          <TextInput
            style={{
              backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text,
              fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border,
            }}
            multiline
            maxLength={500}
            value={text}
            onChangeText={setText}
            placeholder="写下你的愿景..."
            placeholderTextColor={TH.sub}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: canSave ? TH.primary : TH.border, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{existing ? '保存' : '创建'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function VowScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [filterStatus, setFilterStatus] = useState<VisionStatus | 'all'>('active');

  const visions = useMemo(() =>
    (store.visions ?? []).filter(v => filterStatus === 'all' || v.status === filterStatus),
    [store.visions, filterStatus],
  );

  const grouped = useMemo(() => {
    const order: VisionType[] = ['lifetime', 'long', 'short'];
    const map = new Map<VisionType, Vision[]>();
    for (const t of order) map.set(t, []);
    for (const v of visions) map.get(v.type)?.push(v);
    return order.filter(t => (map.get(t)?.length ?? 0) > 0).map(t => ({ type: t, items: map.get(t)! }));
  }, [visions]);

  const activeCount = useMemo(() =>
    (store.visions ?? []).filter(v => v.status === 'active').length,
    [store.visions],
  );

  const handleAdd = () => {
    setEditingVision(null);
    setShowModal(true);
  };

  const handleEdit = (v: Vision) => {
    setEditingVision(v);
    setShowModal(true);
  };

  const handleSave = (data: { type: VisionType; text: string; timeFrame?: VisionTimeFrame }) => {
    if (editingVision) {
      store.updateVision(editingVision.id, data);
    } else {
      store.addVision(data);
    }
  };

  const handleAchieve = (id: string) => {
    Alert.alert('达成愿景', '确认达成这个愿景吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确认达成', onPress: () => store.achieveVision(id) },
    ]);
  };

  const handleArchive = (id: string) => {
    Alert.alert('归档愿景', '确认归档这个愿景吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确认归档', onPress: () => store.archiveVision(id) },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除愿景', '确定要删除这个愿景吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => store.removeVision(id) },
    ]);
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Vow" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TouchableOpacity onPress={handleAdd}
          style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <Plus size={18} color={TH.primary} />
          <Text style={{ color: TH.primary, fontSize: FONT_SUB, fontWeight: '600' }}>{T('commonAdd')}</Text>
        </TouchableOpacity>

        {/* Summary */}
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TH.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Flag size={22} color={TH.primary} />
          </View>
          <View>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>进行中的愿景</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{activeCount} 个</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['active', 'achieved', 'archived', 'all'] as const).map(s => {
            const active = filterStatus === s;
            const labels: Record<string, string> = { active: '进行中', achieved: '已达成', archived: '已归档', all: '全部' };
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterStatus(s)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: active ? TH.primary : TH.card,
                }}
              >
                <Text style={{ fontSize: FONT_BADGE, color: active ? '#fff' : TH.sub, fontWeight: active ? '600' : '400' }}>
                  {labels[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {grouped.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 8 }}>还没有愿景</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 24 }}>立下一个愿景，为修行指引方向</Text>
            <TouchableOpacity onPress={handleAdd} style={{ backgroundColor: TH.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>✦ 立愿</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(({ type, items }) => (
            <View key={type} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 4 }}>
                {React.createElement(TYPE_CONFIG[type].icon, { size: 16, color: TYPE_CONFIG[type].color })}
                <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{TYPE_CONFIG[type].label}</Text>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length}</Text>
              </View>
              {items.map(v => (
                <VisionCard
                  key={v.id}
                  vision={v}
                  TH={TH}
                  onAchieve={handleAchieve}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
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
      />
    </SafeAreaView>
  );
}
