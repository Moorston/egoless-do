import { FONT_SMALL, FONT_TINY , FONT_LABEL } from '@egoless-do/core';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

import {useTheme} from '../../../components/UI';

interface SmartQueryBubbleProps {
  question: string;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}

// 解析 A./B./C./D. 选项
function parseOptions(question: string): { text: string; options: string[] } {
  const optionPattern = /[A-D][.、:：]\s*/;
  const parts = question.split(optionPattern).filter(Boolean);
  const optionMatches = question.match(/[A-D][.、:：]/g) || [];

  if (optionMatches.length === 0) {
    return { text: question, options: [] };
  }

  // 第一部分是问题文本
  const text = parts[0]?.trim() || '';
  // 其余是选项
  const options = parts.slice(1).map(p => p.trim()).filter(Boolean);

  return { text, options };
}

export function SmartQueryBubble({ question, onAnswer, onSkip }: SmartQueryBubbleProps) {
  const TH = useTheme();
  const [freeInput, setFreeInput] = useState('');
  const [showFreeInput, setShowFreeInput] = useState(false);

  const { text, options } = parseOptions(question);

  const handleOptionPress = (option: string) => {
    onAnswer(option);
  };

  const handleFreeSubmit = () => {
    if (freeInput.trim()) {
      onAnswer(freeInput.trim());
      setFreeInput('');
      setShowFreeInput(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: `${TH.primary}08`, borderColor: `${TH.primary}20` }]}>
      {/* AI 头像 */}
      <View style={styles.header}>
        <Text style={styles.avatar}>🧠</Text>
        <Text style={[styles.label, { color: TH.primary }]}>AI 追问</Text>
      </View>

      {/* 问题文本 */}
      <Text style={[styles.questionText, { color: TH.text }]}>{text}</Text>

      {/* 选项按钮 */}
      {options.length > 0 && (
        <View style={styles.optionsRow}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleOptionPress(opt)}
              style={[styles.optionBtn, { backgroundColor: TH.card, borderColor: TH.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLabel, { color: TH.primary }]}>
                {String.fromCharCode(65 + idx)}
              </Text>
              <Text style={[styles.optionText, { color: TH.text }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 自由输入 */}
      {showFreeInput ? (
        <View style={[styles.freeInputRow, { borderColor: TH.border }]}>
          <TextInput
            value={freeInput}
            onChangeText={setFreeInput}
            placeholder="输入你的回答..."
            placeholderTextColor={TH.sub}
            style={[styles.freeInput, { color: TH.text }]}
            onSubmitEditing={handleFreeSubmit}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleFreeSubmit} style={[styles.sendBtn, { backgroundColor: TH.primary }]}>
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setShowFreeInput(true)}>
            <Text style={[styles.freeInputLink, { color: TH.sub }]}>自由输入...</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip}>
            <Text style={[styles.skipLink, { color: TH.sub }]}>跳过</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatar: {
    fontSize: FONT_LABEL(),
  },
  label: {
    fontSize: FONT_TINY(),
    fontWeight: '600',
  },
  questionText: {
    fontSize: FONT_SMALL(),
    lineHeight: 20,
    marginBottom: 10,
  },
  optionsRow: {
    gap: 6,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: FONT_TINY(),
    fontWeight: '700',
    width: 18,
  },
  optionText: {
    fontSize: FONT_SMALL(),
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freeInputLink: {
    fontSize: FONT_TINY(),
  },
  skipLink: {
    fontSize: FONT_TINY(),
  },
  freeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeInput: {
    flex: 1,
    fontSize: FONT_SMALL(),
    paddingVertical: 6,
    padding: 0,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: FONT_TINY(),
    fontWeight: '600',
  },
});
