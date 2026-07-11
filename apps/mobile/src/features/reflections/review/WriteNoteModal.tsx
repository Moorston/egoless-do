import { FONT_SMALL, FONT_BODY, FONT_TITLE, FONT_TINY , getMoodIcon } from '@egoless-do/core';
import type { Mood } from '@egoless-do/core';
import { X, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface WriteNoteModalProps {
  visible: boolean;
  guidedQuestion?: string;
  reviewPerspectives?: string[];
  onSave: (form: { content: string; tags: string[]; mood?: string; source: 'guided' | 'free'; guidedQuestion?: string }) => void;
  onClose: () => void;
}

const MOOD_OPTIONS: { mood: Mood; label: string }[] = [
  { mood: 'happy', label: '开心' },
  { mood: 'calm', label: '平静' },
  { mood: 'neutral', label: '平常' },
  { mood: 'sad', label: '难过' },
  { mood: 'anxious', label: '焦虑' },
  { mood: 'grateful', label: '感恩' },
];

export function WriteNoteModal({ visible, guidedQuestion, reviewPerspectives, onSave, onClose }: WriteNoteModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>();
  const [perspectivesExpanded, setPerspectivesExpanded] = useState(true);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag.startsWith('#') ? tag : `#${tag}`]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleSave = useCallback(() => {
    if (!content.trim()) return;
    onSave({
      content: content.trim(),
      tags,
      mood: selectedMood,
      source: guidedQuestion ? 'guided' : 'free',
      guidedQuestion,
    });
    setContent('');
    setTags([]);
    setSelectedMood(undefined);
    setTagInput('');
  }, [content, tags, selectedMood, guidedQuestion, onSave]);

  const handleClose = useCallback(() => {
    if (content.trim()) {
      Alert.alert(
        '放弃草稿',
        '当前内容未保存，确定要关闭吗？',
        [
          { text: '继续编辑', style: 'cancel' },
          {
            text: '放弃',
            style: 'destructive',
            onPress: () => {
              setContent('');
              setTags([]);
              setSelectedMood(undefined);
              setTagInput('');
              onClose();
            },
          },
        ]
      );
    } else {
      setContent('');
      setTags([]);
      setSelectedMood(undefined);
      setTagInput('');
      onClose();
    }
  }, [content, onClose]);

  const charCount = content.length;
  const hasPerspectives = reviewPerspectives && reviewPerspectives.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modal, { backgroundColor: TH.cardSolid }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>
              {guidedQuestion ? T('trailNoteGuided') : T('trailNoteFree')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 引导问题 - 高亮区块 */}
            {guidedQuestion && (
              <View style={[styles.guidedHighlight, { backgroundColor: P + '10', borderColor: P + '30' }]}>
                <Text style={[styles.guidedHighlightLabel, { color: P }]}>💭 引导问题</Text>
                <Text style={[styles.guidedHighlightText, { color: TH.text }]}>
                  {guidedQuestion}
                </Text>
              </View>
            )}

            {/* 复盘思路 - 可折叠 */}
            {hasPerspectives && (
              <View style={[styles.perspectivesBox, { borderColor: TH.border }]}>
                <TouchableOpacity
                  onPress={() => setPerspectivesExpanded(prev => !prev)}
                  style={styles.perspectivesHeader}
                >
                  <Text style={[styles.perspectivesLabel, { color: TH.sub }]}>💡 复盘思路</Text>
                  {perspectivesExpanded
                    ? <ChevronUp size={16} color={TH.sub} />
                    : <ChevronDown size={16} color={TH.sub} />
                  }
                </TouchableOpacity>
                {perspectivesExpanded && (
                  <View style={styles.perspectivesList}>
                    {reviewPerspectives!.map((p, i) => (
                      <Text key={i} style={[styles.perspectiveItem, { color: TH.text }]}>
                        ▎ {p}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 内容输入 */}
            <View style={styles.contentWrapper}>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="写下你的思考..."
                placeholderTextColor={TH.sub}
                multiline
                style={[styles.contentInput, { color: TH.text, borderColor: TH.border }]}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: TH.sub }]}>已写 {charCount} 字</Text>
            </View>

            {/* 标签输入 */}
            <View style={styles.tagSection}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="输入标签，回车添加"
                placeholderTextColor={TH.sub}
                style={[styles.tagInput, { color: TH.text, borderColor: TH.border }]}
                onSubmitEditing={handleAddTag}
              />
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleRemoveTag(tag)}
                      style={[styles.tagPill, { backgroundColor: P + '15' }]}
                    >
                      <Text style={[styles.tagPillText, { color: P }]}>{tag} ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 心情选择 */}
            <View style={styles.moodSection}>
              <Text style={[styles.moodLabel, { color: TH.sub }]}>心情</Text>
              <View style={styles.moodRow}>
                {MOOD_OPTIONS.map(({ mood, label }) => (
                  <TouchableOpacity
                    key={mood}
                    onPress={() => setSelectedMood(selectedMood === mood ? undefined : mood)}
                    style={[
                      styles.moodButton,
                      selectedMood === mood && { backgroundColor: `${P}30` },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{getMoodIcon(mood)}</Text>
                    <Text style={[styles.moodText, { color: selectedMood === mood ? P : TH.sub }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.actionButton, { borderColor: TH.border }]}
            >
              <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.actionButton, { backgroundColor: P }]}
              disabled={!content.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{T('trailNoteSave')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  scrollContent: {
    maxHeight: 450,
  },
  // 引导问题高亮
  guidedHighlight: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  guidedHighlightLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    marginBottom: 6,
  },
  guidedHighlightText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    lineHeight: 24,
  },
  // 复盘思路
  perspectivesBox: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  perspectivesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  perspectivesLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  perspectivesList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  perspectiveItem: {
    fontSize: FONT_SMALL(),
    lineHeight: 20,
  },
  // 内容输入
  contentWrapper: {
    marginBottom: 16,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY(),
    minHeight: 200,
  },
  charCount: {
    fontSize: FONT_TINY(),
    textAlign: 'right',
    marginTop: 4,
  },
  // 标签
  tagSection: {
    marginBottom: 16,
  },
  tagInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: FONT_SMALL(),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  // 心情
  moodSection: {
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: FONT_SMALL(),
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodEmoji: {
    fontSize: FONT_TITLE(),
  },
  moodText: {
    fontSize: FONT_SMALL(),
  },
  // 操作按钮
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
