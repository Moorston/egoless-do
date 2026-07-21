import {
  FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION, dateStr,
  BODY_TAGS_PRESET, type BodyCheckin, type BodyPlan, type Theme,
} from '@egoless-do/core';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

import { PrimaryButton, OutlineButton, TagPill } from '../../../components/UI';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  plan?: BodyPlan;
  onSave: (data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => void;
  onSkip: () => void;
}

function BodyCheckinInline({ TH, T, plan, onSave, onSkip }: Props) {
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(1);
  const [comfort, setComfort] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const allTags = BODY_TAGS_PRESET.flatMap(g => g.tags);

  const handleSave = () => {
    onSave({ date: dateStr(), energy, pain, comfort, sleep: sleepQuality, tags: selectedTags, note: note || undefined });
  };

  const renderSlider = (label: string, value: number, onChange: (v: number) => void, lowLabel: string, highLabel: string, color: string) => (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{label}</Text>
        <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color }}>{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <TouchableOpacity key={v} onPress={() => onChange(v)}
            style={{
              flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: v === value ? color : TH.card,
              borderWidth: v === value ? 0 : 1, borderColor: TH.border,
            }}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: v === value ? '700' : '400', color: v === value ? '#fff' : TH.text }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{lowLabel}</Text>
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{highLabel}</Text>
      </View>
    </View>
  );

  return (
    <View>
      {plan && (
        <View style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodyFlowPractice')}</Text>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text, marginTop: 4 }}>
            {plan.part} {plan.note ? `— ${plan.note}` : ''}
          </Text>
        </View>
      )}

      {renderSlider(T('bodyEnergy'), energy, setEnergy, '低', '高', '#f59e0b')}
      {renderSlider(T('bodyPain'), pain, setPain, '无痛', '剧痛', '#ef4444')}
      {renderSlider(T('bodyComfort'), comfort, setComfort, '不适', '舒适', '#10b981')}
      {renderSlider(T('bodySleepQuality'), sleepQuality, setSleepQuality, '差', '好', '#3b82f6')}

      <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('bodyTagsLabel')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {allTags.map(tag => (
          <TagPill key={tag} label={tag} active={selectedTags.includes(tag)}
            onPress={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            color="#8b5cf6"
          />
        ))}
      </View>

      <TextInput
        style={{ backgroundColor: TH.card, borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border, minHeight: 60, marginBottom: 16, textAlignVertical: 'top' }}
        placeholder={T('bodyCheckinNotePlaceholder')}
        placeholderTextColor={TH.sub}
        multiline maxLength={500}
        value={note} onChangeText={setNote}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <OutlineButton label={T('bodyFlowSkip')} onPress={onSkip} style={{ flex: 1 }} />
        <PrimaryButton label={T('bodySave')} onPress={handleSave} color="#8b5cf6" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export default BodyCheckinInline;
