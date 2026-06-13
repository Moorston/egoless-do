import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL, FONT_BODY, FONT_TITLE } from '@egoless-do/core';

interface WriteNoteModalProps {
  visible: boolean;
  guidedQuestion?: string;
  onSave: (form: { content: string; tags: string[]; mood?: string; source: 'guided' | 'free'; guidedQuestion?: string }) => void;
  onClose: () => void;
}

const MOOD_OPTIONS = ['😊', '🌿', '😰', '😢', '🎉', '🙏', '💭'];

export function WriteNoteModal({ visible, guidedQuestion, onSave, onClose }: WriteNoteModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | undefined>();

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
    setContent('');
    setTags([]);
    setSelectedMood(undefined);
    setTagInput('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
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
            {/* 引导问题 */}
            {guidedQuestion && (
              <View style={[styles.guidedBox, { borderColor: TH.border }]}>
                <Text style={[styles.guidedText, { color: TH.sub }]}>
                  💭 {T('trailNoteGuidedBy')}:
                </Text>
                <Text style={[styles.guidedQuestion, { color: TH.text }]}>
                  {guidedQuestion}
                </Text>
              </View>
            )}

            {/* 内容输入 */}
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="写下你的思考..."
              placeholderTextColor={TH.sub}
              multiline
              style={[styles.contentInput, { color: TH.text, borderColor: TH.border }]}
              textAlignVertical="top"
            />

            {/* 标签输入 */}
            <View style={styles.tagSection}>
              <View style={styles.tagInputRow}>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="添加标签"
                  placeholderTextColor={TH.sub}
                  style={[styles.tagInput, { color: TH.text, borderColor: TH.border }]}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  onPress={handleAddTag}
                  style={[styles.tagAddButton, { backgroundColor: P }]}
                >
                  <Text style={styles.tagAddText}>+</Text>
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleRemoveTag(tag)}
                      style={[styles.tagChip, { borderColor: TH.border }]}
                    >
                      <Text style={[styles.tagChipText, { color: TH.text }]}>{tag} ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 心情选择 */}
            <View style={styles.moodSection}>
              <Text style={[styles.moodLabel, { color: TH.sub }]}>心情</Text>
              <View style={styles.moodRow}>
                {MOOD_OPTIONS.map(mood => (
                  <TouchableOpacity
                    key={mood}
                    onPress={() => setSelectedMood(selectedMood === mood ? undefined : mood)}
                    style={[
                      styles.moodButton,
                      selectedMood === mood && { backgroundColor: `${P}30` },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{mood}</Text>
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
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  scrollContent: {
    maxHeight: 400,
  },
  guidedBox: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  guidedText: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  guidedQuestion: {
    fontSize: FONT_BODY,
    fontWeight: '500',
    lineHeight: 22,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY,
    minHeight: 120,
    marginBottom: 16,
  },
  tagSection: {
    marginBottom: 16,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: FONT_SMALL,
  },
  tagAddButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagAddText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: FONT_SMALL,
  },
  moodSection: {
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: FONT_SMALL,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 20,
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
