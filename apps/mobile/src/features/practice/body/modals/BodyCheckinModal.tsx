import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, BODY_TAGS_PRESET, dateStr, type BodyCheckin, type BodyPlan, EXERCISE_CATEGORIES, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput , KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';

import { PrimaryButton, OutlineButton } from '../../../../components/UI';

const DIMENSIONS: { key: keyof Pick<BodyCheckin, 'energy' | 'pain' | 'comfort' | 'sleep'>; color: string }[] = [
  { key: 'energy', color: '#f59e0b' },
  { key: 'pain', color: '#ef4444' },
  { key: 'comfort', color: '#10b981' },
  { key: 'sleep', color: '#6366f1' },
];

const DIMENSION_LABELS: Record<string, string> = {
  energy: 'bodyEnergy',
  pain: 'bodyPain',
  comfort: 'bodyComfort',
  sleep: 'bodySleepQuality',
};

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  todayPlan?: BodyPlan;
  onClose: () => void;
  onSave: (data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => void;
}

export default function BodyCheckinModal({ visible, TH, T, todayPlan, onClose, onSave }: Props) {
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(3);
  const [comfort, setComfort] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const dimValues: Record<string, number> = { energy, pain, comfort, sleep };
  const dimSetters: Record<string, (v: number) => void> = {
    energy: setEnergy, pain: setPain, comfort: setComfort, sleep: setSleep,
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const resetForm = () => {
    setEnergy(3); setPain(3); setComfort(3); setSleep(3);
    setTags([]); setNote('');
  };

  const handleSave = () => {
    onSave({ date: dateStr(), energy, pain, comfort, sleep, tags, note: note.trim() || undefined });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Resolve today's plan display label
  let planLabel: string | null = null;
  if (todayPlan?.part) {
    const matchedCategory = EXERCISE_CATEGORIES.find(c => c.key === todayPlan.part);
    planLabel = matchedCategory
      ? `${matchedCategory.icon} ${T(matchedCategory.i18nKey)}`
      : todayPlan.part;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyCheckinTitle')}</Text>
            <TouchableOpacity onPress={handleClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 12 }}>{T('bodyCheckinHint')}</Text>

          {/* Today's plan context */}
          {planLabel ? (
            <View style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyPlan')}</Text>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text, marginTop: 2 }}>{planLabel}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Dimension sliders */}
            {DIMENSIONS.map(dim => (
              <View key={dim.key} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T(DIMENSION_LABELS[dim.key])}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <TouchableOpacity key={v} onPress={() => dimSetters[dim.key](v)}
                      style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: dimValues[dim.key] === v ? dim.color : TH.border, backgroundColor: dimValues[dim.key] === v ? dim.color + '20' : 'transparent' }}>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: dimValues[dim.key] === v ? '700' : '400', color: dimValues[dim.key] === v ? dim.color : TH.text }}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Tags */}
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('bodyTagsLabel')}</Text>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {BODY_TAGS_PRESET.map(group => (
                <View key={group.category} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 6 }}>{group.category}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {group.tags.map(tag => (
                      <TouchableOpacity key={tag} onPress={() => toggleTag(tag)}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: tags.includes(tag) ? '#f59e0b' : TH.border, backgroundColor: tags.includes(tag) ? '#f59e0b15' : 'transparent' }}>
                        <Text style={{ fontSize: FONT_BADGE(), color: tags.includes(tag) ? '#f59e0b' : TH.text }}>{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Note */}
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), minHeight: 80, maxHeight: 120, textAlignVertical: 'top', marginTop: 8 }}
              multiline maxLength={500} value={note} onChangeText={setNote}
              placeholder={T('bodySelfAssessmentInputPlaceholder')} placeholderTextColor={TH.sub}
            />
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'right', marginTop: 4, marginBottom: 8 }}>{String(note.length)}/500</Text>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <OutlineButton label={T('bodyCancel')} onPress={handleClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('bodySave')} onPress={handleSave} color="#f59e0b" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
              </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
