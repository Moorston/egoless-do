import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_SMALL, FONT_BODY, FONT_TITLE, FONT_TINY } from '@egoless-do/core';
import { getMoodIcon } from '@egoless-do/core';
import { useAppStore } from '../../../store/useAppStore';
import type { Mood } from '@egoless-do/core';

interface CreateReflectionModalProps {
  visible: boolean;
  trailId?: string;
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

export function CreateReflectionModal({ visible, trailId, onClose }: CreateReflectionModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>();

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

    // 创建感念
    const newR = store.addReflection({
      content: content.trim(),
      tags,
      mood: selectedMood ?? '',
    });

    // 关联到思维脉络
    if (newR && trailId) {
      store.addReflectionToTrail(trailId, newR.id);
    }

    // 重置表单
    setContent('');
    setTags([]);
    setSelectedMood(undefined);
    setTagInput('');
    onClose();
  }, [content, tags, selectedMood, trailId, store, onClose]);

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
      onClose();
    }
  }, [content, onClose]);

  const charCount = content.length;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: TH.cardSolid }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: TH.text }]}>新建感念</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={TH.sub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* 内容输入 */}
              <View style={styles.contentWrapper}>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="写下你的感念..."
                  placeholderTextColor={TH.sub}
                  multiline
                  style={[styles.contentInput, { color: TH.text, borderColor: TH.border }]}
                  textAlignVertical="top"
                  autoFocus
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
                <Text style={{ color: '#fff', fontWeight: '600' }}>保存感念</Text>
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
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  scrollContent: {
    maxHeight: 450,
  },
  contentWrapper: {
    marginBottom: 16,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY,
    minHeight: 200,
  },
  charCount: {
    fontSize: FONT_TINY,
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
    fontSize: FONT_SMALL,
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
    fontSize: FONT_SMALL,
    fontWeight: '500',
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
    fontSize: 18,
  },
  moodText: {
    fontSize: FONT_SMALL,
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
