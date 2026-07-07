import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, generateTrailName, getMoodIcon } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';
import { X, Check, Search } from 'lucide-react-native';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


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
  const { reflections: rawReflections, thoughtTrails: rawThoughtTrails, createThoughtTrail } = useShallowStore(s => ({
    reflections: s.reflections,
    thoughtTrails: s.thoughtTrails,
    createThoughtTrail: s.createThoughtTrail,
  }));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialReflectionIds));
  const [showSelector, setShowSelector] = useState(false);
  const [search, setSearch] = useState('');

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted).sort((a, b) => b.timestamp - a.timestamp),
    [rawReflections]
  );

  const thoughtTrails = useMemo(() =>
    (rawThoughtTrails ?? []).filter(t => !t.deleted),
    [rawThoughtTrails]
  );

  // Build a map: reflectionId → number of trails it belongs to
  const trailCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const trail of thoughtTrails) {
      for (const rid of trail.reflectionIds ?? []) {
        map.set(rid, (map.get(rid) ?? 0) + 1);
      }
    }
    return map;
  }, [thoughtTrails]);

  // Filtered reflections by search keyword
  const filteredReflections = useMemo(() => {
    if (!search.trim()) return reflections;
    const kw = search.trim().toLowerCase();
    return reflections.filter(r =>
      r.content.toLowerCase().includes(kw) ||
      (r.mood && r.mood.toLowerCase().includes(kw)) ||
      r.tags.some(t => t.toLowerCase().includes(kw))
    );
  }, [reflections, search]);

  // Auto-generate name when initial reflections change
  useEffect(() => {
    if (initialReflectionIds.length > 0 && !name) {
      const initialReflections = initialReflectionIds
        .map(id => reflections.find(r => r.id === id))
        .filter((r): r is MindReflection => r != null);
      setName(generateTrailName(initialReflections, T));
    }
  }, [initialReflectionIds, reflections, name, T]);

  const handleToggleReflection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredReflections.map(r => r.id)));
  }, [filteredReflections]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;

    const trailId = createThoughtTrail(
      name.trim(),
      description.trim() || undefined,
      Array.from(selectedIds)
    );

    setName('');
    setDescription('');
    setSelectedIds(new Set());
    setShowSelector(false);
    setSearch('');

    onSuccess?.(trailId);
    onClose();
  }, [createThoughtTrail, name, description, selectedIds, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setSelectedIds(new Set(initialReflectionIds));
    setShowSelector(false);
    setSearch('');
    onClose();
  }, [initialReflectionIds, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]} onTouchStart={() => Keyboard.dismiss()}>
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
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
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
                onBlur={() => Keyboard.dismiss()}
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
              {/* Search bar */}
              <View style={[styles.searchBar, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <Search size={16} color={TH.sub} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="搜索感念内容、标签、心情..."
                  placeholderTextColor={TH.sub}
                  style={[styles.searchInput, { color: TH.text }]}
                  autoCorrect={false}
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <X size={16} color={TH.sub} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Batch select/deselect buttons */}
              <View style={[styles.batchActions, { borderBottomColor: TH.border }]}>
                <TouchableOpacity onPress={handleSelectAll} style={[styles.batchBtn, { backgroundColor: `${P}15` }]}>
                  <Text style={{ color: P, fontSize: FONT_SMALL, fontWeight: '600' }}>全选</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeselectAll} style={[styles.batchBtn, { backgroundColor: `${TH.sub}15` }]}>
                  <Text style={{ color: TH.sub, fontSize: FONT_SMALL, fontWeight: '600' }}>取消全选</Text>
                </TouchableOpacity>
                <Text style={{ color: TH.sub, fontSize: FONT_SMALL, marginLeft: 'auto' }}>
                  已选 {selectedIds.size} 项
                </Text>
              </View>

              <ScrollView
                style={styles.reflectionList}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredReflections.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: TH.sub }]}>
                      {search.trim() ? '没有匹配的感念' : '暂无感念'}
                    </Text>
                  </View>
                ) : (
                  filteredReflections.map(r => {
                    const isSelected = selectedIds.has(r.id);
                    const trailCount = trailCountMap.get(r.id) ?? 0;
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
                          {/* Date + mood */}
                          <View style={styles.reflectionMeta}>
                            <Text style={[styles.reflectionDate, { color: TH.sub }]}>
                              {(() => { const d = new Date(r.timestamp); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                            </Text>
                            {r.mood ? (
                              <Text style={styles.reflectionMood}>{getMoodIcon(r.mood)}</Text>
                            ) : null}
                            {trailCount > 0 && (
                              <View style={[styles.trailBadge, { backgroundColor: `${P}20` }]}>
                                <Text style={[styles.trailBadgeText, { color: P }]}>
                                  {trailCount}脉络
                                </Text>
                              </View>
                            )}
                          </View>
                          {/* Content */}
                          <Text style={[styles.reflectionText, { color: TH.text }]} numberOfLines={2}>
                            {r.content}
                          </Text>
                          {/* Tags */}
                          {r.tags.length > 0 && (
                            <View style={styles.tagRow}>
                              {r.tags.slice(0, 3).map(tag => (
                                <View key={tag} style={[styles.tagChip, { backgroundColor: TH.bg }]}>
                                  <Text style={[styles.tagText, { color: TH.sub }]}>{tag}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        {isSelected && <Check size={18} color={P} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Selector footer with back button */}
              <View style={[styles.selectorFooter, { borderTopColor: TH.border }]}>
                <TouchableOpacity
                  onPress={() => setShowSelector(false)}
                  style={[styles.selectorBackBtn, { backgroundColor: P }]}
                >
                  <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '600' }}>
                    {T('commonBack')} ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actions — hidden during reflection selection */}
          {!showSelector && (
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
          )}
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
    height: '85%',
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
    minHeight: 300,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_BODY,
    padding: 0,
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  batchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reflectionList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: FONT_BODY,
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
  reflectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reflectionDate: {
    fontSize: FONT_SMALL,
  },
  reflectionMood: {
    fontSize: FONT_SMALL,
  },
  trailBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trailBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  reflectionText: {
    fontSize: FONT_BODY,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
  },
  selectorFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectorBackBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
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
