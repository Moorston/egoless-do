import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Pencil, X, Brain, Link2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, FONT_TINY, MIND_COLORS_EXTENDED, REFLECTION_CATEGORIES } from '@egoless-do/core';
import { getTrailStats, getMoodIcon } from '@egoless-do/core';
import type { LinkType } from '@egoless-do/core';

const LINK_TYPE_LABELS: Record<LinkType, { icon: string; label: string }> = {
  inspire: { icon: '💭', label: '引发' },
  evolve: { icon: '💡', label: '演进' },
  contrast: { icon: '🔄', label: '转折' },
  respond: { icon: '💬', label: '回应' },
  related: { icon: '🔗', label: '相关' },
};

export default function ThoughtTrailDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();
  const route = useRoute();

  const { trailId } = route.params as { trailId: string };
  const trail = useMemo(() => 
    (store.thoughtTrails ?? []).find(t => t.id === trailId),
    [store.thoughtTrails, trailId]
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const trailReflections = useMemo(() => {
    if (!trail) return [];
    return trail.reflectionIds
      .map(id => (store.reflections ?? []).find(r => r.id === id))
      .filter(r => r != null && !r.deleted)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [trail, store.reflections]);

  const stats = useMemo(() => {
    if (!trail) return { count: 0, dateRange: null, moodChanges: [] };
    return getTrailStats(trail, store.reflections ?? []);
  }, [trail, store.reflections]);

  const links = useMemo(() => {
    if (!trail) return [];
    const reflectionIds = new Set(trail.reflectionIds);
    return (store.reflectionLinks ?? []).filter(l => 
      !l.deleted && reflectionIds.has(l.fromId) && reflectionIds.has(l.toId)
    );
  }, [trail, store.reflectionLinks]);

  const getLinkBetween = useCallback((fromId: string, toId: string) => {
    return links.find(l => l.fromId === fromId && l.toId === toId);
  }, [links]);

  const handleRemoveReflection = useCallback((reflectionId: string) => {
    Alert.alert(
      T('thoughtTrailRemoveReflection'),
      '确定要从这条思路脉络中移除这个感念吗？',
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => {
            store.removeReflectionFromTrail(trailId, reflectionId);
          },
        },
      ]
    );
  }, [store, trailId]);

  const handleDeleteTrail = useCallback(() => {
    Alert.alert(
      T('thoughtTrailDelete'),
      T('thoughtTrailDeleteConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => {
            store.deleteThoughtTrail(trailId);
            nav.goBack();
          },
        },
      ]
    );
  }, [store, trailId, nav]);

  const handleOpenEdit = useCallback(() => {
    if (trail) {
      setEditName(trail.name);
      setEditDesc(trail.description ?? '');
      setShowEditModal(true);
    }
  }, [trail]);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim()) {
      store.updateThoughtTrail(trailId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setShowEditModal(false);
    }
  }, [store, trailId, editName, editDesc]);

  if (!trail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: TH.sub }]}>思路脉络不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]} numberOfLines={1}>
          {trail.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleOpenEdit} style={styles.headerButton}>
            <Pencil size={20} color={P} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTrail} style={styles.headerButton}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <Text style={[styles.statsText, { color: TH.sub }]}>
          {stats.count} {T('thoughtTrailReflections')}
          {stats.dateRange ? ` · ${stats.dateRange.start} ~ ${stats.dateRange.end}` : ''}
        </Text>
        {stats.moodChanges.length > 0 && (
          <Text style={[styles.moodText, { color: TH.sub }]}>
            心情变化: {stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
          </Text>
        )}
      </View>

      {/* Reflections List - Story Line View */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {trailReflections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: TH.sub }]}>暂无感念</Text>
          </View>
        ) : (
          trailReflections.map((r, idx) => {
            const isLast = idx === trailReflections.length - 1;
            const linkToNext = !isLast ? getLinkBetween(r.id, trailReflections[idx + 1].id) : null;
            
            return (
              <View key={r.id}>
                <View style={styles.reflectionItem}>
                  {/* Timeline dot and line */}
                  <View style={styles.timelineContainer}>
                    <View style={[styles.timelineDot, { backgroundColor: P }]} />
                    {!isLast && (
                      <View style={[styles.timelineLine, { backgroundColor: TH.border }]} />
                    )}
                  </View>

                  {/* Reflection card */}
                  <View style={[styles.reflectionCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
                    <View style={styles.reflectionHeader}>
                      <Text style={[styles.reflectionDate, { color: TH.sub }]}>
                        {new Date(r.timestamp).toISOString().slice(0, 10)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveReflection(r.id)}
                        style={styles.removeButton}
                      >
                        <Text style={[styles.removeButtonText, { color: '#EF4444' }]}>移除</Text>
                      </TouchableOpacity>
                    </View>

                    <LinearGradient
                      colors={[r.colors?.[0] || MIND_COLORS_EXTENDED[0][0], r.colors?.[1] || MIND_COLORS_EXTENDED[0][1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.reflectionGradient}
                    >
                      <Text style={styles.reflectionContent} numberOfLines={3}>
                        {r.content}
                      </Text>

                      {(r.tags.length > 0 || r.mood) && (
                        <View style={styles.reflectionTags}>
                          {r.tags.slice(0, 3).map(tag => {
                            const category = REFLECTION_CATEGORIES.find(c => `#${c.label}` === tag);
                            return (
                              <Text key={tag} style={styles.reflectionTag}>
                                {category ? `${category.icon} ` : ''}{tag}
                              </Text>
                            );
                          })}
                          {r.mood && (
                            <Text style={styles.reflectionMood}>{getMoodIcon(r.mood)}</Text>
                          )}
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                </View>

                {/* Link indicator between reflections */}
                {!isLast && linkToNext && (
                  <View style={styles.linkContainer}>
                    <View style={styles.linkLine} />
                    <View style={[styles.linkBadge, { backgroundColor: TH.card, borderColor: TH.border }]}>
                      <Text style={styles.linkIcon}>{LINK_TYPE_LABELS[linkToNext.type]?.icon || '🔗'}</Text>
                      <Text style={[styles.linkLabel, { color: TH.sub }]}>
                        {LINK_TYPE_LABELS[linkToNext.type]?.label || '相关'}
                      </Text>
                    </View>
                    <View style={styles.linkLine} />
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* AI Insight Section */}
        {trailReflections.length >= 2 && (
          <View style={[styles.insightContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <View style={styles.insightHeader}>
              <Brain size={20} color={P} />
              <Text style={[styles.insightTitle, { color: TH.text }]}>AI 洞察</Text>
            </View>
            <Text style={[styles.insightText, { color: TH.sub }]}>
              这条脉络包含 {stats.count} 条感念，记录了从 {stats.dateRange?.start} 到 {stats.dateRange?.end} 的思考过程。
              {stats.moodChanges.length > 1 && `心情经历了 ${stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')} 的变化。`}
            </Text>
            {trail.insightSummary && (
              <Text style={[styles.insightSummary, { color: TH.text }]}>
                {trail.insightSummary}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: TH.text }]}>{T('editThoughtTrail')}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={TH.sub} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: TH.sub }]}>{T('thoughtTrailName')}</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={T('thoughtTrailNamePlaceholder')}
              placeholderTextColor={TH.sub}
              style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <Text style={[styles.inputLabel, { color: TH.sub }]}>{T('thoughtTrailDesc')}</Text>
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder={T('thoughtTrailDescPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={[styles.modalButton, { borderColor: TH.border }]}
              >
                <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.modalButton, { backgroundColor: P }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{T('commonConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsText: {
    fontSize: FONT_SMALL,
  },
  moodText: {
    fontSize: FONT_SMALL,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_BODY,
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
    marginBottom: 0,
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  reflectionCard: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reflectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  reflectionDate: {
    fontSize: FONT_SMALL,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  reflectionGradient: {
    padding: 12,
  },
  reflectionContent: {
    color: '#fff',
    fontSize: FONT_BODY,
    lineHeight: 22,
    marginBottom: 8,
  },
  reflectionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reflectionTag: {
    color: 'rgba(255,255,255,.9)',
    fontSize: FONT_TINY,
  },
  reflectionMood: {
    fontSize: FONT_TINY,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    paddingVertical: 4,
  },
  linkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  linkIcon: {
    fontSize: 12,
  },
  linkLabel: {
    fontSize: FONT_TINY,
    fontWeight: '500',
  },
  insightContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  insightText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
  },
  insightSummary: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  inputLabel: {
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
