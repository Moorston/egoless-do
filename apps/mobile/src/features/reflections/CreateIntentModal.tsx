import React, { useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { X, Target } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';

interface Props {
  visible: boolean;
  onClose: () => void;
  reflection: MindReflection | null;
}

export default function CreateIntentModal({ visible, onClose, reflection }: Props) {
  const TH = useTheme();
  const P = TH.primary;
  const store = useAppStore();

  const [content, setContent] = useState('');
  const [why, setWhy] = useState('');

  const handleCreate = useCallback(() => {
    if (!content.trim() || !reflection) return;

    const intentId = store.createIntent(
      content.trim(),
      why.trim() || '从感念中提炼',
      'reflection',
      [reflection.id]
    );

    // Reset form
    setContent('');
    setWhy('');
    onClose();
  }, [store, reflection, content, why, onClose]);

  const handleClose = useCallback(() => {
    setContent('');
    setWhy('');
    onClose();
  }, [onClose]);

  if (!reflection) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Target size={20} color={P} />
              <Text style={[styles.title, { color: TH.text }]}>创建意图</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Source Reflection */}
          <View style={[styles.sourceCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.sourceLabel, { color: TH.sub }]}>来源感念：</Text>
            <Text style={[styles.sourceContent, { color: TH.text }]} numberOfLines={3}>
              {reflection.content}
            </Text>
          </View>

          {/* Intent Content */}
          <Text style={[styles.inputLabel, { color: TH.text }]}>你想做什么？</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="例如：每天冥想10分钟"
            placeholderTextColor={TH.sub}
            style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />

          {/* Why */}
          <Text style={[styles.inputLabel, { color: TH.text }]}>为什么想做？（可选）</Text>
          <TextInput
            value={why}
            onChangeText={setWhy}
            placeholder="例如：帮助我保持平静"
            placeholderTextColor={TH.sub}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, { borderColor: TH.border }]}
            >
              <Text style={{ color: TH.sub }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.button, { backgroundColor: P, opacity: content.trim() ? 1 : 0.5 }]}
              disabled={!content.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>创建意图</Text>
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
    padding: 24,
  },
  container: {
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  sourceCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sourceLabel: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  sourceContent: {
    fontSize: FONT_BODY,
  },
  inputLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: FONT_BODY,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
