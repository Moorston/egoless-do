import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { X, Link, Unlink } from 'lucide-react-native';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, VISION_TIME_FRAMES } from '@egoless-do/core';
import type { Vision, VisionType, VisionTimeFrame, RefType } from '@egoless-do/core';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { TagPill } from '../../../components/UI';

interface Props {
  visible: boolean;
  TH: any;
  T: (key: string) => string;
  vision?: Vision | null;
  type: VisionType;
  onClose: () => void;
  onSave: (data: { text: string; timeFrame?: VisionTimeFrame; deadline?: string; linkedPractices: { refType: RefType; refId: string }[] }) => void;
}

export default function VisionEditModal({ visible, TH, T, vision, type, onClose, onSave }: Props) {
  const { habits, plans, visionPractices } = useAppStore(useShallow(s => ({ habits: s.habits, plans: s.plans, visionPractices: s.visionPractices })));
  const [text, setText] = useState('');
  const [timeFrame, setTimeFrame] = useState<VisionTimeFrame | ''>('');
  const [deadline, setDeadline] = useState('');
  const [linkedHabits, setLinkedHabits] = useState<string[]>([]);
  const [linkedPlans, setLinkedPlans] = useState<string[]>([]);

  const filteredHabits = (habits ?? []).filter((h: any) => !h.deleted);
  const filteredPlans = (plans ?? []).filter((p: any) => !p.deleted);

  useEffect(() => {
    if (visible) {
      if (vision) {
        setText(vision.text);
        setTimeFrame(vision.timeFrame ?? '');
        setDeadline(vision.deadline ?? '');
      } else {
        setText('');
        setTimeFrame('');
        setDeadline('');
      }

      // Load existing linked practices
      if (vision) {
        const existing = (visionPractices ?? []).filter(
          (vp: any) => vp.visionId === vision.id && !vp.deleted
        );
        setLinkedHabits(existing.filter((vp: any) => vp.refType === 'habit').map((vp: any) => vp.refId));
        setLinkedPlans(existing.filter((vp: any) => vp.refType === 'plan').map((vp: any) => vp.refId));
      } else {
        setLinkedHabits([]);
        setLinkedPlans([]);
      }
    }
  }, [visible, vision, visionPractices]);

  const toggleHabit = useCallback((id: string) => {
    setLinkedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  }, []);

  const togglePlan = useCallback((id: string) => {
    setLinkedPlans(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }, []);

  const handleSave = () => {
    if (!text.trim()) return;
    const practices: { refType: RefType; refId: string }[] = [];
    for (const hId of linkedHabits) practices.push({ refType: 'habit', refId: hId });
    for (const pId of linkedPlans) practices.push({ refType: 'plan', refId: pId });
    onSave({
      text: text.trim(),
      timeFrame: (timeFrame || undefined) as VisionTimeFrame | undefined,
      deadline: deadline || undefined,
      linkedPractices: practices,
    });
    onClose();
  };

  const canSave = text.trim().length > 0;

  // Time frames relevant to type
  const availableTimeFrames = VISION_TIME_FRAMES.filter(tf => {
    if (type === 'long') return ['1year', '3years', '5years'].includes(tf.key);
    if (type === 'short') return ['3months', '6months', '1year'].includes(tf.key);
    return false;
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, maxHeight: '85%',
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
              {vision ? T('vowEdit') : T('vowCreate')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Text input */}
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('vowText')}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={T('vowTextPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              maxLength={500}
              style={{
                backgroundColor: TH.card, borderRadius: 12, padding: 12,
                color: TH.text, fontSize: FONT_BODY,
                minHeight: 80, textAlignVertical: 'top',
                borderWidth: 1, borderColor: TH.border, marginBottom: 16,
              }}
            />

            {/* TimeFrame (for long/short only) */}
            {type !== 'lifetime' && availableTimeFrames.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('vowTimeFrame')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {availableTimeFrames.map(tf => {
                    const active = timeFrame === tf.key;
                    return (
                      <TouchableOpacity
                        key={tf.key}
                        onPress={() => setTimeFrame(active ? '' : tf.key)}
                        style={{
                          paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                          backgroundColor: active ? '#8B5CF620' : TH.card,
                          borderWidth: 1, borderColor: active ? '#8B5CF6' : TH.border,
                        }}
                      >
                        <Text style={{ fontSize: FONT_BADGE, color: active ? '#8B5CF6' : TH.sub, fontWeight: active ? '600' : '400' }}>
                          {T(tf.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Deadline (for long/short only) */}
            {type !== 'lifetime' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>{T('vowDeadline')}</Text>
                <TextInput
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={TH.sub}
                  style={{
                    backgroundColor: TH.card, borderRadius: 10, padding: 12,
                    color: TH.text, fontSize: FONT_BODY,
                    borderWidth: 1, borderColor: TH.border,
                  }}
                />
              </View>
            )}

            {/* Link habits */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('vowLinkHabit')}</Text>
              {filteredHabits.length === 0 ? (
                <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('vowNoLink')}</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {filteredHabits.map((h: any) => {
                    const active = linkedHabits.includes(h.id);
                    return (
                      <TouchableOpacity
                        key={h.id}
                        onPress={() => toggleHabit(h.id)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                          backgroundColor: active ? '#10B98120' : TH.card,
                          borderWidth: 1, borderColor: active ? '#10B981' : TH.border,
                        }}
                      >
                        {active ? <Link size={12} color="#10B981" /> : <Unlink size={12} color={TH.sub} />}
                        <Text style={{ fontSize: FONT_BADGE, color: active ? '#10B981' : TH.sub }}>
                          {h.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Link plans */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('vowLinkPlan')}</Text>
              {filteredPlans.length === 0 ? (
                <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('vowNoLink')}</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {filteredPlans.map((p: any) => {
                    const active = linkedPlans.includes(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => togglePlan(p.id)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                          backgroundColor: active ? '#F59E0B20' : TH.card,
                          borderWidth: 1, borderColor: active ? '#F59E0B' : TH.border,
                        }}
                      >
                        {active ? <Link size={12} color="#F59E0B" /> : <Unlink size={12} color={TH.sub} />}
                        <Text style={{ fontSize: FONT_BADGE, color: active ? '#F59E0B' : TH.sub }}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1, padding: 14, borderRadius: 12,
                borderWidth: 1, borderColor: TH.border, alignItems: 'center',
              }}
            >
              <Text style={{ color: TH.sub, fontSize: FONT_BODY, fontWeight: '600' }}>{T('vowCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={{
                flex: 1, padding: 14, borderRadius: 12,
                backgroundColor: canSave ? '#8B5CF6' : TH.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>
                {vision ? T('vowSave') : T('vowCreate')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
