import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Link2, Check } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme, useT } from '../../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import type { LinkType, MindReflection } from '@egoless-do/core';

const LINK_TYPES: { type: LinkType; icon: string; label: string; description: string }[] = [
  { type: 'inspire', icon: '💭', label: '引发', description: '从这条感念引发了后续的思考' },
  { type: 'evolve', icon: '💡', label: '演进', description: '思想在这条感念基础上深化' },
  { type: 'contrast', icon: '🔄', label: '转折', description: '这条感念代表了思维的转变' },
  { type: 'respond', icon: '💬', label: '回应', description: '这条感念是对之前想法的回应' },
  { type: 'related', icon: '🔗', label: '相关', description: '这条感念与之前的想法相关' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  reflection: MindReflection | null;
}

export default function LinkReflectionModal({ visible, onClose, reflection }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const [selectedType, setSelectedType] = useState<LinkType>('related');
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const reflections = useMemo(() => {
    if (!reflection) return [];
    return (store.reflections ?? [])
      .filter(r => !r.deleted && r.id !== reflection.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [store.reflections, reflection]);

  const handleLink = useCallback(() => {
    if (!reflection || !selectedReflectionId) return;

    store.createReflectionLink(
      reflection.id,
      selectedReflectionId,
      selectedType,
      note.trim() || undefined
    );

    setSelectedReflectionId(null);
    setNote('');
    onClose();
  }, [store, reflection, selectedReflectionId, selectedType, note, onClose]);

  const handleClose = useCallback(() => {
    setSelectedReflectionId(null);
    setNote('');
    onClose();
  }, [onClose]);

  if (!reflection) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>关联感念</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Current Reflection */}
          <View style={[styles.currentReflection, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.label, { color: TH.sub }]}>当前感念：</Text>
            <Text style={[styles.content, { color: TH.text }]} numberOfLines={2}>
              {reflection.content}
            </Text>
          </View>

          {/* Link Type Selection */}
          <Text style={[styles.sectionTitle, { color: TH.text }]}>连接类型</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {LINK_TYPES.map(({ type, icon, label }) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: selectedType === type ? P : TH.card,
                    borderColor: selectedType === type ? P : TH.border,
                  },
                ]}
              >
                <Text style={styles.typeIcon}>{icon}</Text>
                <Text style={[styles.typeLabel, { color: selectedType === type ? '#fff' : TH.text }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Reflection Selection */}
          <Text style={[styles.sectionTitle, { color: TH.text }]}>选择要关联的感念</Text>
          <ScrollView style={styles.reflectionList} showsVerticalScrollIndicator={false}>
            {reflections.map(r => {
              const isSelected = selectedReflectionId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSelectedReflectionId(r.id)}
                  style={[
                    styles.reflectionItem,
                    {
                      backgroundColor: isSelected ? `${P}15` : TH.card,
                      borderColor: isSelected ? P : TH.border,
                    },
                  ]}
                >
                  <View style={styles.reflectionContent}>
                    <Text style={[styles.reflectionDate, { color: TH.sub }]}>
                      {(() => { const d = new Date(r.timestamp); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                    </Text>
                    <Text style={[styles.reflectionText, { color: TH.text }]} numberOfLines={2}>
                      {r.content}
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={P} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Note */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="备注（可选）"
            placeholderTextColor={TH.sub}
            style={[styles.noteInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, { borderColor: TH.border }]}
            >
              <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLink}
              style={[
                styles.button,
                { backgroundColor: P, opacity: selectedReflectionId ? 1 : 0.5 },
              ]}
              disabled={!selectedReflectionId}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>关联</Text>
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
  container: {
    borderRadius: 20,
    padding: 20,
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
  currentReflection: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  content: {
    fontSize: FONT_BODY,
  },
  sectionTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeScroll: {
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  reflectionList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  reflectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reflectionContent: {
    flex: 1,
  },
  reflectionDate: {
    fontSize: FONT_TINY,
    marginBottom: 2,
  },
  reflectionText: {
    fontSize: FONT_SMALL,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: FONT_SMALL,
    marginBottom: 16,
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
