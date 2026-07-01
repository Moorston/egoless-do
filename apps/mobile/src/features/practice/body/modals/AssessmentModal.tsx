import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, BODY_TAGS_PRESET } from '@egoless-do/core';
import { PrimaryButton, OutlineButton } from '../../../../components/UI';

interface Props {
  visible: boolean;
  TH: any;
  T: (key: string) => string;
  profile: any;
  onClose: () => void;
  onSave: (text: string, tags: string[]) => void;
}

export default function AssessmentModal({ visible, TH, T, profile, onClose, onSave }: Props) {
  const [text, setText] = useState(profile.selfAssessment ?? '');
  const [tags, setTags] = useState<string[]>(profile.bodyTags ?? []);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('bodySelfAssessment')}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('bodySelfAssessmentHint')}</Text>
          <TextInput
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 100, maxHeight: 150, textAlignVertical: 'top', marginBottom: 8 }}
            multiline maxLength={500} value={text} onChangeText={setText}
            placeholder={T('bodySelfAssessmentInputPlaceholder')} placeholderTextColor={TH.sub}
          />
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'right', marginBottom: 16 }}>{text.length}/500</Text>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('bodyTagsLabel')}</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {BODY_TAGS_PRESET.map(group => (
              <View key={group.category} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6 }}>{group.category}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {group.tags.map(tag => (
                    <TouchableOpacity key={tag} onPress={() => toggleTag(tag)}
                      style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: tags.includes(tag) ? '#10b981' : TH.border, backgroundColor: tags.includes(tag) ? '#10b98115' : 'transparent' }}>
                      <Text style={{ fontSize: FONT_BADGE, color: tags.includes(tag) ? '#10b981' : TH.text }}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <OutlineButton label={T('bodyCancel')} onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('bodySave')} onPress={() => { onSave(text, tags); onClose(); }} color="#10b981" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
