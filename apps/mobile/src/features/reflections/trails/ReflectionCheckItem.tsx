import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BODY, FONT_SMALL, FONT_TINY, getMoodIcon, formatDateShort } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';

interface Props {
  ref: MindReflection;
  isSelected: boolean;
  onToggle: () => void;
}

export default function ReflectionCheckItem({ ref, isSelected, onToggle }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: TH.card, borderRadius: 12,
        borderWidth: 1, borderColor: isSelected ? TH.primary : TH.border,
        padding: 12, marginBottom: 8, gap: 10,
      }}
    >
      {/* Checkbox */}
      <View style={{
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: isSelected ? TH.primary : TH.border,
        backgroundColor: isSelected ? TH.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {isSelected && <Check size={14} color="#fff" />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
            {formatDateShort(ref.timestamp)}
          </Text>
          <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(ref.mood)}</Text>
          {ref.tags.slice(0, 2).map(tag => (
            <Text key={tag} style={{
              fontSize: FONT_TINY, color: TH.primary,
              backgroundColor: `${TH.primary}15`,
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
            }}>
              {tag}
            </Text>
          ))}
        </View>
        <Text style={{
          fontSize: FONT_BODY, color: TH.text, marginTop: 4,
          lineHeight: 20,
        }} numberOfLines={2}>
          {ref.content}
        </Text>
        {ref.thoughtTrailIds && ref.thoughtTrailIds.length > 0 && (
          <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
            📎 {T('quickTrailAssignedNotice').replace('{n}', String(ref.thoughtTrailIds.length))}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
