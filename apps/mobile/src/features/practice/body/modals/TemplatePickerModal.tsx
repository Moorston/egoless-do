import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BADGE, PLAN_TEMPLATES, type PlanTemplate, type Theme } from '@egoless-do/core';
import { X, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  onClose: () => void;
  onSelect: (template: PlanTemplate) => void;
}

const INTENSITY_COLORS: Record<string, string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const INTENSITY_I18N: Record<string, string> = {
  beginner: 'bodyLevelBeginner',
  intermediate: 'bodyLevelIntermediate',
  advanced: 'bodyLevelAdvanced',
};

function TemplateCard({ template, T, TH, onPress }: { template: PlanTemplate; T: (key: string) => string; TH: Theme; onPress: () => void }) {
  const intensityColor = INTENSITY_COLORS[template.intensity] ?? TH.sub;
  const intensityLabel = T(INTENSITY_I18N[template.intensity]) || template.intensity;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{
        borderRadius: 16, borderWidth: 1, borderColor: TH.border,
        backgroundColor: TH.card, padding: 16, marginBottom: 12, overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <Text style={{ fontSize: 28 }}>{template.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>
            {T(template.nameI18nKey as never) || template.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${intensityColor}20` }}>
              <Text style={{ fontSize: FONT_SMALL(), color: intensityColor, fontWeight: '600' }}>{intensityLabel}</Text>
            </View>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{template.durationDays}天</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>·</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{String(template.weekSchedule.filter(s => s.sportKey !== 'rest').length)}练/周</Text>
          </View>
        </View>
        <ChevronRight size={18} color={TH.sub} />
      </View>

      <Text style={{ fontSize: FONT_SUB(), color: TH.sub, lineHeight: 18 }} numberOfLines={2}>
        {T(template.descriptionI18nKey as never) || template.description}
      </Text>

      {/* Quick preview of weekly schedule */}
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
        {template.weekSchedule.slice(0, 7).map((day, idx) => {
          const isRest = day.sportKey === 'rest';
          return (
            <View key={idx} style={{
              flex: 1, height: 6, borderRadius: 3,
              backgroundColor: isRest ? TH.border : '#8b5cf6',
            }} />
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

export default function TemplatePickerModal({ visible, TH, T, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyPlanTemplate') || '从模板导入'}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 16, lineHeight: 20 }}>
              {T('bodyTemplateHint') || '选择一个预设训练计划，创建后可在编辑器中微调。'}
            </Text>

            {PLAN_TEMPLATES.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                T={T}
                TH={TH}
                onPress={() => { onSelect(template); onClose(); }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}