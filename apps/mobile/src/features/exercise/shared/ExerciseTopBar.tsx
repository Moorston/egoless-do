import { COLORS, FONT_BODY, FONT_SUB, FONT_CLOSE, EXERCISE_SOUNDS } from '@egoless-do/core';
import { Music } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  icon: string;
  sportName: string;
  targetInfo?: string;
  selectedSound: string;
  showSoundPicker: boolean;
  onToggleSoundPicker: () => void;
  onSelectSound: (key: string) => void;
  rightSlot?: React.ReactNode;
}

export default function ExerciseTopBar({ icon, sportName, targetInfo, selectedSound, showSoundPicker, onToggleSoundPicker, onSelectSound, rightSlot }: Props) {
  return (
    <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: FONT_CLOSE() }}>{icon}</Text>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#bbb' }}>{sportName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {rightSlot}
          {targetInfo ? (
            <Text style={{ fontSize: FONT_SUB(), color: COLORS.GREEN }}>{targetInfo}</Text>
          ) : null}
          <TouchableOpacity onPress={onToggleSoundPicker} style={{ padding: 4 }}>
            <Music size={18} color={selectedSound !== '无' ? COLORS.ORANGE : 'rgba(255,255,255,.7)'} />
          </TouchableOpacity>
        </View>
      </View>
      {showSoundPicker && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' }}>
          {EXERCISE_SOUNDS.map(s => (
            <TouchableOpacity key={s.key} onPress={() => onSelectSound(s.key)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: selectedSound === s.key ? `${COLORS.ORANGE}30` : 'rgba(255,255,255,.08)' }}>
              <Text style={{ fontSize: FONT_SUB(), color: selectedSound === s.key ? COLORS.ORANGE : 'rgba(255,255,255,.6)' }}>{s.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
