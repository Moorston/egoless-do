import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL , getMoodIcon } from '@egoless-do/core';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

import { useTheme } from '../../../components/UI';

const MOOD_OPTIONS = [
  { key: '开心', emoji: '😊' },
  { key: '平静', emoji: '🌿' },
  { key: '焦虑', emoji: '😰' },
  { key: '难过', emoji: '😢' },
  { key: '兴奋', emoji: '🎉' },
  { key: '感恩', emoji: '🙏' },
];

interface Props {
  onSave: (mood: string, insight: string, saveAsReflection: boolean) => void;
  onSkip: () => void;
}

export default function CheckinReflection({ onSave, onSkip }: Props) {
  const TH = useTheme();
  const P = TH.primary;
  
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [insight, setInsight] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSave = useCallback(() => {
    if (selectedMood) {
      onSave(selectedMood, insight, insight.trim().length > 0);
    }
  }, [selectedMood, insight, onSave]);

  return (
    <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
      {/* Header */}
      <Text style={[styles.title, { color: TH.text }]}>打卡完成！</Text>
      <Text style={[styles.subtitle, { color: TH.sub }]}>记录一下此刻的感受</Text>

      {/* Mood Selection */}
      <Text style={[styles.label, { color: TH.text }]}>现在感觉如何？</Text>
      <View style={styles.moodGrid}>
        {MOOD_OPTIONS.map(({ key, emoji }) => (
          <TouchableOpacity
            key={key}
            onPress={() => {
              setSelectedMood(key);
              setShowInput(true);
            }}
            style={[
              styles.moodButton,
              {
                backgroundColor: selectedMood === key ? `${P}20` : TH.card,
                borderColor: selectedMood === key ? P : TH.border,
              },
            ]}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
            <Text style={[styles.moodLabel, { color: TH.text }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Insight Input (optional) */}
      {showInput && (
        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: TH.text }]}>有什么想记录的吗？（可选）</Text>
          <TextInput
            value={insight}
            onChangeText={setInsight}
            placeholder="输入你的想法..."
            placeholderTextColor={TH.sub}
            multiline
            numberOfLines={3}
            style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onSkip}
          style={[styles.skipButton, { borderColor: TH.border }]}
        >
          <Text style={[styles.skipText, { color: TH.sub }]}>跳过</Text>
        </TouchableOpacity>
        
        {selectedMood && (
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: P }]}
          >
            <Text style={styles.saveText}>
              {insight.trim() ? '保存为感念' : '记录心情'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SUB(),
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginBottom: 12,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  moodButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: FONT_SMALL(),
  },
  inputSection: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY(),
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipText: {
    fontSize: FONT_BODY(),
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    color: '#fff',
  },
});
