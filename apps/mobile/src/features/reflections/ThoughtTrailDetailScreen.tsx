import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Trash2, Pencil, X } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SMALL, getTrailOverview, getRelatedTrails, getTrailTimelineItems } from '@egoless-do/core';
import type { TrailInsightCache, TrailReviewCache } from '@egoless-do/core';
import { AIService } from '@egoless-do/core';

import { TrailOverviewCard } from './TrailOverviewCard';
import { InsightSection } from './InsightSection';
import { ReviewGuideSection } from './ReviewGuideSection';
import { TimelineList } from './TimelineList';
import { AddReflectionFAB } from './AddReflectionFAB';
import { WriteNoteModal } from './WriteNoteModal';
import { SelectReflectionModal } from './SelectReflectionModal';
import { PlanTasksSection } from './PlanTasksSection';
import { CreatePlanFromTrailModal } from './CreatePlanFromTrailModal';
import { RelatedTrailsSection } from './RelatedTrailsSection';

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

  // ─── Modal states ───────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showWriteNote, setShowWriteNote] = useState(false);
  const [guidedQuestion, setGuidedQuestion] = useState<string | undefined>();
  const [showSelectReflection, setShowSelectReflection] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);

  // ─── Data ───────────────────────────────────────────────────────
  const reflections = store.reflections ?? [];
  const trailNotes = store.trailNotes ?? [];
  const allTrails = useMemo(() =>
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const overview = useMemo(() => {
    if (!trail) return null;
    return getTrailOverview(trail, reflections, trailNotes);
  }, [trail, reflections, trailNotes]);

  const timelineItems = useMemo(() => {
    if (!trail) return [];
    return getTrailTimelineItems(trail, reflections, trailNotes);
  }, [trail, reflections, trailNotes]);

  const links = useMemo(() => {
    if (!trail) return [];
    const ids = new Set(trail.reflectionIds);
    return (store.reflectionLinks ?? [])
      .filter(l => !l.deleted && ids.has(l.fromId) && ids.has(l.toId))
      .map(l => ({ fromId: l.fromId, toId: l.toId, type: l.type }));
  }, [trail, store.reflectionLinks]);

  const planItems = useMemo(() => {
    if (!trail) return [];
    return store.getTrailPlanItems(trailId);
  }, [trail, trailId, store.planItems]);

  const planCheckins = useMemo(() => {
    const planItemIds = new Set(planItems.map(p => p.id));
    return (store.planItemCheckins ?? []).filter(c => planItemIds.has(c.planItemId));
  }, [planItems, store.planItemCheckins]);

  const relatedTrails = useMemo(() => {
    if (!trail) return [];
    return getRelatedTrails(trail, allTrails, reflections, trailNotes, 3);
  }, [trail, allTrails, reflections, trailNotes]);

  // ─── AI generation ──────────────────────────────────────────────
  const handleGenerateInsight = useCallback(async () => {
    if (!trail) return;
    const aiService = AIService.getInstance();
    const trailReflections = trail.reflectionIds
      .map(id => reflections.find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r != null && !r.deleted);
    const notes = (trail.noteIds ?? [])
      .map(id => trailNotes.find(n => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n != null && !n.deleted);

    const result = await aiService.generateTrailInsight(
      trailReflections.map(r => ({ content: r.content, mood: r.mood ?? '' })),
      {
        useCloud: store.aiMode !== 'local',
        trailNotes: notes.map(n => ({ content: n.content, source: n.source, guidedQuestion: n.guidedQuestion })),
      }
    );

    const cache: TrailInsightCache = {
      summary: result.summary,
      keyPoints: result.keyPoints,
      turningPoints: result.turningPoints,
      suggestions: result.suggestions,
      generatedAt: Date.now(),
      source: store.aiMode === 'local' ? 'local' : 'cloud',
    };
    store.setInsightCache(trailId, cache);
  }, [trail, trailId, reflections, trailNotes, store]);

  const handleGenerateReview = useCallback(async () => {
    if (!trail) return;
    const aiService = AIService.getInstance();
    const trailReflections = trail.reflectionIds
      .map(id => reflections.find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r != null && !r.deleted);
    const notes = (trail.noteIds ?? [])
      .map(id => trailNotes.find(n => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n != null && !n.deleted);

    const items = [
      ...trailReflections.map(r => ({ content: r.content, mood: r.mood, timestamp: r.timestamp, kind: 'reflection' as const })),
      ...notes.map(n => ({ content: n.content, mood: n.mood, timestamp: n.createdAt, kind: 'note' as const })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    const result = await aiService.generateTrailReviewGuide(items, {
      useCloud: store.aiMode !== 'local',
    });

    const cache: TrailReviewCache = {
      questions: result.questions,
      observations: result.observations,
      suggestions: result.suggestions,
      generatedAt: Date.now(),
      source: store.aiMode === 'local' ? 'local' : 'cloud',
    };
    store.setReviewCache(trailId, cache);
  }, [trail, trailId, reflections, trailNotes, store]);

  // ─── Actions ────────────────────────────────────────────────────
  const handleWriteReflection = useCallback(() => {
    (nav as any).navigate('Reflections', { showNew: true, trailId });
  }, [nav, trailId]);

  const handleSelectExisting = useCallback(() => {
    setShowSelectReflection(true);
  }, []);

  const handleWriteNote = useCallback((question?: string) => {
    setGuidedQuestion(question);
    setShowWriteNote(true);
  }, []);

  const handleSaveNote = useCallback((form: { content: string; tags: string[]; mood?: string; source: 'guided' | 'free'; guidedQuestion?: string }) => {
    store.addTrailNote(trailId, form);
    setShowWriteNote(false);
    setGuidedQuestion(undefined);
  }, [store, trailId]);

  const handleSelectReflectionsConfirm = useCallback((selectedIds: string[]) => {
    for (const id of selectedIds) {
      store.addReflectionToTrail(trailId, id);
    }
    setShowSelectReflection(false);
  }, [store, trailId]);

  const handleRemoveReflection = useCallback((reflectionId: string) => {
    Alert.alert(
      T('thoughtTrailRemoveReflection'),
      T('thoughtTrailRemoveReflectionConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => store.removeReflectionFromTrail(trailId, reflectionId),
        },
      ]
    );
  }, [store, trailId]);

  const handleDeleteNote = useCallback((noteId: string) => {
    Alert.alert(
      T('trailNoteDelete'),
      T('trailNoteDeleteConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => store.deleteTrailNote(noteId),
        },
      ]
    );
  }, [store]);

  const handleCreatePlanFromReflection = useCallback((reflectionId: string) => {
    setShowCreatePlan(true);
  }, []);

  const handleCreatePlanFromNote = useCallback((noteId: string) => {
    setShowCreatePlan(true);
  }, []);

  const handleCreatePlan = useCallback((form: { name: string; description: string; priority: any; startDate: string; endDate: string }) => {
    store.createPlanItemFromTrail(trailId, form);
    setShowCreatePlan(false);
  }, [store, trailId]);

  const handleNavigateToPlan = useCallback((planItemId: string) => {
    nav.navigate('PlanDetail' as never, { planId: planItemId } as never);
  }, [nav]);

  const handleNavigateToTrail = useCallback((targetTrailId: string) => {
    if (targetTrailId === trailId) return;
    nav.push('ThoughtTrailDetail' as never, { trailId: targetTrailId } as never);
  }, [nav, trailId]);

  // ─── Edit & Delete ──────────────────────────────────────────────
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

  // ─── Render ─────────────────────────────────────────────────────
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

      {/* Overview - compact inline */}
      {overview && <TrailOverviewCard overview={overview} />}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Timeline - 核心内容置顶 */}
        <TimelineList
          items={timelineItems}
          links={links}
          onRemoveReflection={handleRemoveReflection}
          onDeleteNote={handleDeleteNote}
          onCreatePlanFromReflection={handleCreatePlanFromReflection}
          onCreatePlanFromNote={handleCreatePlanFromNote}
        />

        {/* AI sections - 折叠 */}
        <InsightSection
          insightCache={trail.insightCache}
          onGenerate={handleGenerateInsight}
        />

        <ReviewGuideSection
          reviewCache={trail.reviewCache}
          onGenerate={handleGenerateReview}
          onStartWrite={handleWriteNote}
        />

        {/* Plan Tasks - 紧凑 */}
        <PlanTasksSection
          planItems={planItems}
          checkins={planCheckins}
          onNavigateToPlan={handleNavigateToPlan}
          onCreatePlan={() => setShowCreatePlan(true)}
        />

        {/* Related Trails - 紧凑 */}
        <RelatedTrailsSection
          relatedTrails={relatedTrails}
          onNavigateToTrail={handleNavigateToTrail}
        />
      </ScrollView>

      {/* FAB - 浮动添加按钮 */}
      <AddReflectionFAB
        onWriteReflection={handleWriteReflection}
        onSelectExisting={handleSelectExisting}
        onWriteNote={() => handleWriteNote()}
      />

      {/* Modals */}
      <WriteNoteModal
        visible={showWriteNote}
        guidedQuestion={guidedQuestion}
        onSave={handleSaveNote}
        onClose={() => { setShowWriteNote(false); setGuidedQuestion(undefined); }}
      />

      <SelectReflectionModal
        visible={showSelectReflection}
        reflections={reflections}
        onConfirm={handleSelectReflectionsConfirm}
        onClose={() => setShowSelectReflection(false)}
      />

      <CreatePlanFromTrailModal
        visible={showCreatePlan}
        insightCache={trail.insightCache}
        onCreate={handleCreatePlan}
        onClose={() => setShowCreatePlan(false)}
      />

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_BODY,
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
    fontSize: FONT_SMALL,
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
