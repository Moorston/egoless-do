import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { X, Check, Search } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SMALL, getMoodIcon } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';

interface SelectReflectionModalProps {
  visible: boolean;
  reflections: MindReflection[];
  initialSelectedIds?: string[];
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export function SelectReflectionModal({
  visible,
  reflections,
  initialSelectedIds = [],
  onConfirm,
  onClose,
}: SelectReflectionModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [search, setSearch] = useState('');

  const sortedReflections = useMemo(() =>
    [...reflections].filter(r => !r.deleted).sort((a, b) => b.timestamp - a.timestamp),
    [reflections]
  );

  const filteredReflections = useMemo(() => {
    if (!search.trim()) return sortedReflections;
    const kw = search.trim().toLowerCase();
    return sortedReflections.filter(r =>
      r.content.toLowerCase().includes(kw) ||
      (r.mood && r.mood.toLowerCase().includes(kw)) ||
      r.tags.some(t => t.toLowerCase().includes(kw))
    );
  }, [sortedReflections, search]);

  const handleToggle = useCallback((id: string) => {
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

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedIds));
    setSearch('');
  }, [selectedIds, onConfirm]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set(initialSelectedIds));
    setSearch('');
    onClose();
  }, [initialSelectedIds, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]} onTouchStart={() => Keyboard.dismiss()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>
              {T('thoughtTrailSelectReflection')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Search size={16} color={TH.sub} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="搜索感念内容、标签、心情..."
              placeholderTextColor={TH.sub}
              style={[styles.searchInput, { color: TH.text }]}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={TH.sub} />
              </TouchableOpacity>
            )}
          </View>

          {/* Batch actions */}
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

          {/* List */}
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {filteredReflections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: TH.sub }]}>
                  {search.trim() ? '没有匹配的感念' : '暂无感念'}
                </Text>
              </View>
            ) : (
              filteredReflections.map(r => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => handleToggle(r.id)}
                    style={[
                      styles.reflectionItem,
                      {
                        backgroundColor: isSelected ? `${P}15` : TH.card,
                        borderColor: isSelected ? P : TH.border,
                      },
                    ]}
                  >
                    <View style={styles.reflectionContent}>
                      <View style={styles.reflectionMeta}>
                        <Text style={[styles.reflectionDate, { color: TH.sub }]}>
                          {(() => { const d = new Date(r.timestamp); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                        </Text>
                        {r.mood && <Text style={styles.reflectionMood}>{getMoodIcon(r.mood)}</Text>}
                      </View>
                      <Text style={[styles.reflectionText, { color: TH.text }]} numberOfLines={2}>
                        {r.content}
                      </Text>
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

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: TH.border }]}>
            <TouchableOpacity onPress={handleClose} style={[styles.footerBtn, { borderColor: TH.border }]}>
              <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.footerBtn, { backgroundColor: P }]}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {T('commonConfirm')} ({selectedIds.size})
              </Text>
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
  list: {
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
