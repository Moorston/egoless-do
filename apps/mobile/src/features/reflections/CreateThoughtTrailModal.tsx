import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, generateTrailName } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialReflectionIds?: string[];
  onSuccess?: (trailId: string) => void;
}

export default function CreateThoughtTrailModal({ visible, onClose, initialReflectionIds = [], onSuccess }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialReflectionIds));
  const [showSelector, setShowSelector] = useState(false);

  const reflections = useMemo(() => 
    (store.reflections ?? []).filter(r => !r.deleted).sort((a, b) => b.timestamp - a.timestamp),
    [store.reflections]
  );

  // Auto-generate name when initial reflections change
  useMemo(() => {
    if (initialReflectionIds.length > 0 && !name) {
      const initialReflections = initialReflectionIds
        .map(id => reflections.find(r => r.id === id))
        .filter((r): r is MindReflection => r != null);
      setName(generateTrailName(initialReflections, T));
    }
  }, [initialReflectionIds, reflections]);

  const handleToggleReflection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;

    const trailId = store.createThoughtTrail(
      name.trim(),
      description.trim() || undefined,
      Array.from(selectedIds)
    );

    // Reset form
    setName('');
    setDescription('');
    setSelectedIds(new Set());
    setShowSelector(false);

    onSuccess?.(trailId);
    onClose();
  }, [store, name, description, selectedIds, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setSelectedIds(new Set(initialReflectionIds));
    setShowSelector(false);
    onClose();
  }, [initialReflectionIds, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>{T('createThoughtTrail')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {!showSelector ? (
            /* Name and Description Form */
            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: TH.sub }]}>{T('thoughtTrailName')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={T('thoughtTrailNamePlaceholder')}
                placeholderTextColor={TH.sub}
                style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
              />

              <Text style={[styles.label, { color: TH.sub }]}>{T('thoughtTrailDesc')}</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={T('thoughtTrailDescPlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
              />

              <TouchableOpacity
                onPress={() => setShowSelector(true)}
                style={[styles.selectButton, { borderColor: P }]}
              >
                <Text style={{ color: P, fontSize: FONT_BODY }}>
                  {T('thoughtTrailSelectReflection')} ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Reflection Selector */
            <View style={styles.selector}>
              <TouchableOpacity
                onPress={() => setShowSelector(false)}
                style={styles.selectorBack}
              >
                <Text style={{ color: P, fontSize: FONT_BODY }}>{T('commonBack')}</Text>
              </TouchableOpacity>

              <ScrollView style={styles.reflectionList}>
                {reflections.map(r => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => handleToggleReflection(r.id)}
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
                          {new Date(r.timestamp).toISOString().slice(0, 10)}
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
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, { borderColor: TH.border }]}
            >
              <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.button, { backgroundColor: P, opacity: name.trim() ? 1 : 0.5 }]}
              disabled={!name.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{T('commonConfirm')}</Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: FONT_SUB,
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
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  selector: {
    flex: 1,
  },
  selectorBack: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reflectionList: {
    paddingHorizontal: 20,
    maxHeight: 300,
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
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  reflectionText: {
    fontSize: FONT_BODY,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 12,
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
