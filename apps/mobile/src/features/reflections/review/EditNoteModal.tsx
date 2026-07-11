import { FONT_SMALL, FONT_BODY, FONT_TITLE, FONT_TINY , getMoodIcon } from '@egoless-do/core';
import type { TrailNote, Mood } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface EditNoteModalProps {
  visible: boolean;
  note: TrailNote | null;
  onSave: (noteId: string, patch: { content: string; tags: string[]; mood?: string }) => void;
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

export function EditNoteModal({ visible, note, onSave, onClose }: EditNoteModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>();

  // Initialize form when note changes
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTags(note.tags || []);
      setSelectedMood(note.mood as Mood | undefined);
    }
  }, [note]);

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
    if (!content.trim() || !note) return;
    onSave(note.id, {
      content: content.trim(),
      tags,
      mood: selectedMood,
    });
    onClose();
  }, [content, tags, selectedMood, note, onSave, onClose]);

  const handleClose = useCallback(() => {
    if (note && content.trim() !== note.content) {
      Alert.alert(
        '放弃修改',
        '当前修改未保存，确定要关闭吗？',
        [
          { text: '继续编辑', style: 'cancel' },
          {
            text: '放弃',
            style: 'destructive',
            onPress: onClose,
          },
        ]
      );
    } else {
      onClose();
    }
  }, [content, note, onClose]);

  const charCount = content.length;

  if (!note) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: TH.cardSolid }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: TH.text }]}>编辑复盘</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={TH.sub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* 引导问题 */}
              {note.guidedQuestion && (
                <View style={[styles.guidedHighlight, { backgroundColor: P + '10', borderColor: P + '30' }]}>
                  <Text style={[styles.guidedHighlightLabel, { color: P }]}>💭 引导问题</Text>
                  <Text style={[styles.guidedHighlightText, { color: TH.text }]}>
                    {note.guidedQuestion}
                  </Text>
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
