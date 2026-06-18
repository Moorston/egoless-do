import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Trash2, Pencil, ListChecks, Network } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';
import type { TrailNote } from '@egoless-do/core';
import { useTrailData } from './useTrailData';
import { useTrailAI } from './useTrailAI';
import { useTrailActions } from './useTrailActions';

import { ReviewAIPanel } from './ReviewAIPanel';
import { TimelineList } from './TimelineList';
import { ReviewNoteCard } from './ReviewNoteCard';
import { EditNoteModal } from './EditNoteModal';
import { AddReflectionFAB } from './AddReflectionFAB';
import { WriteNoteModal } from './WriteNoteModal';
import { SelectReflectionModal } from './SelectReflectionModal';
import { PlanTasksSection } from './PlanTasksSection';
import { CreatePlanFromTrailModal } from './CreatePlanFromTrailModal';
import { RelatedTrailsSection } from './RelatedTrailsSection';
import { SegmentBar } from './SegmentBar';

export default function ThoughtTrailDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const route = useRoute();
  const nav = useNavigation();
  const trailId = (route.params as any)?.trailId;
  if (!trailId) return null;

  const {
    trail, overview, timelineItems, links, reflections, trailNotes,
    trailPlanItems, trailPlanCheckins, relatedTrails,
  } = useTrailData(trailId);

  const { handleGenerateInsight, handleGenerateReview, insightCacheStale, reviewCacheStale } = useTrailAI(trailId, trail);

  const {
    handleWriteReflection,
    handleSelectReflectionsConfirm,
    handleRemoveReflection,
    handleDeleteNote,
    handleSaveNote,
    handleCreatePlan,
    handleUpdateName,
    handleUpdateDescription,
    handleDeleteTrail,
    handleDeletePlanItem,
    handleNavigateToPlan,
    handleNavigateToTrail,
    handleUpdateNote,
  } = useTrailActions(trailId);

  // ─── Inline editing ─────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [showWriteNote, setShowWriteNote] = useState(false);
  const [guidedQuestion, setGuidedQuestion] = useState<string | undefined>();
  const [showEditNote, setShowEditNote] = useState(false);
  const [editingNote, setEditingNote] = useState<TrailNote | null>(null);
  const [showSelectReflection, setShowSelectReflection] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // ─── Local UI handlers ──────────────────────────────────────────
  const handleSelectExisting = useCallback(() => {
    setShowSelectReflection(true);
  }, []);

  const handleWriteNote = useCallback((question?: string) => {
    setGuidedQuestion(question);
    setShowWriteNote(true);
  }, []);

  const handleEditNote = useCallback((note: TrailNote) => {
    setEditingNote(note);
    setShowEditNote(true);
  }, []);

  const handleCreatePlanFromReflection = useCallback(() => {
    setShowCreatePlan(true);
  }, []);

  const handleStartEditName = useCallback(() => {
    if (trail) { setEditName(trail.name); setEditingName(true); }
  }, [trail]);

  const handleFinishEditName = useCallback(() => {
    handleUpdateName(editName);
    setEditingName(false);
  }, [editName, handleUpdateName]);

  const handleStartEditDesc = useCallback(() => {
    if (trail) { setEditDesc(trail.description ?? ''); setEditingDesc(true); }
  }, [trail]);

  const handleFinishEditDesc = useCallback(() => {
    handleUpdateDescription(editDesc);
    setEditingDesc(false);
  }, [editDesc, handleUpdateDescription]);

  const handleSaveNoteAndClose = useCallback((form: Parameters<typeof handleSaveNote>[0]) => {
    handleSaveNote(form);
    setShowWriteNote(false);
    setGuidedQuestion(undefined);
  }, [handleSaveNote]);

  const handlePlanCreateAndClose = useCallback((form: Parameters<typeof handleCreatePlan>[0]) => {
    handleCreatePlan(form);
    setShowCreatePlan(false);
  }, [handleCreatePlan]);

  const handleConfirmReflections = useCallback((selectedIds: string[]) => {
    handleSelectReflectionsConfirm(selectedIds);
    setShowSelectReflection(false);
  }, [handleSelectReflectionsConfirm]);

  // ─── Pull to refresh ────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (trail?.reflectionIds?.length) await handleGenerateInsight();
      await handleGenerateReview();
    } finally {
      setRefreshing(false);
    }
  }, [trail, handleGenerateInsight, handleGenerateReview]);

  // ─── Render ─────────────────────────────────────────────────────
  if (!trail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: TH.sub }]}>{T('trailNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        {editingName ? (
          <TextInput
            value={editName}
            onChangeText={setEditName}
            onBlur={handleFinishEditName}
            onSubmitEditing={handleFinishEditName}
            autoFocus
            style={[styles.headerTitleInput, { color: TH.text, borderColor: P, backgroundColor: TH.card }]}
          />
        ) : (
          <TouchableOpacity style={styles.headerTitleArea} onPress={handleStartEditName}>
            <Text style={[styles.headerTitle, { color: TH.text }]} numberOfLines={1}>
              {trail.name}
            </Text>
            <Pencil size={12} color={TH.sub} />
          </TouchableOpacity>
        )}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => nav.navigate('RelationMap', { context: { type: 'trail', id: trailId } })}
            style={styles.headerButton}
          >
            <Network size={20} color={P} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSelectExisting} style={styles.headerButton}>
            <ListChecks size={20} color={P} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTrail} style={styles.headerButton}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Description inline edit */}
      {editingDesc ? (
        <View style={styles.descEditRow}>
          <TextInput
            value={editDesc}
            onChangeText={setEditDesc}
            onBlur={handleFinishEditDesc}
            onSubmitEditing={handleFinishEditDesc}
            placeholder={T('thoughtTrailDescPlaceholder')}
            placeholderTextColor={TH.sub}
            style={[styles.descInput, { color: TH.text, borderColor: P, backgroundColor: TH.card }]}
            autoFocus
          />
        </View>
      ) : (
        trail.description ? (
          <TouchableOpacity onPress={handleStartEditDesc} style={styles.descRow}>
            <Text style={[styles.descText, { color: TH.sub }]} numberOfLines={2}>{trail.description}</Text>
          </TouchableOpacity>
        ) : null
      )}

      {/* Overview + Segment bar */}
      {overview && (
        <View style={styles.overviewRow}>
          <Text style={[styles.overviewText, { color: TH.sub }]} numberOfLines={1}>
            {overview.reflectionCount} {T('trailOverviewReflections')} · {overview.noteCount} {T('trailOverviewNotes')} · {overview.daySpan} {T('trailOverviewDays')} {overview.moodChanges.length > 0 ? `· ${overview.moodChanges.join('→')}` : ''}
          </Text>
        </View>
      )}

      <SegmentBar
        segments={[T('trailTabReflections'), T('trailTabReview'), T('trailTabPlan')]}
        selectedIndex={tabIndex}
        onSelect={setTabIndex}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={P}
            colors={[P]}
          />
        }
      >
        {tabIndex === 0 && (
          <TimelineList
            items={timelineItems.filter(ti => ti.kind === 'reflection')}
            links={links}
            onRemoveReflection={handleRemoveReflection}
            onDeleteNote={handleDeleteNote}
            onCreatePlanFromReflection={handleCreatePlanFromReflection}
            onCreatePlanFromNote={handleCreatePlanFromReflection}
          />
        )}

        {tabIndex === 1 && (
          <>
            <ReviewAIPanel
              insightCache={trail.insightCache}
              reviewCache={trail.reviewCache}
              onGenerateInsight={handleGenerateInsight}
              onGenerateReview={handleGenerateReview}
              onStartWrite={handleWriteNote}
              insightStale={insightCacheStale}
              reviewStale={reviewCacheStale}
            />
            {timelineItems.filter(ti => ti.kind === 'note').length > 0 ? (
              timelineItems.filter(ti => ti.kind === 'note').map(ti => (
                <ReviewNoteCard
                  key={ti.data.id}
                  note={ti.data as any}
                  onDelete={handleDeleteNote}
                  onEdit={handleEditNote}
                />
              ))
            ) : (
              <View style={styles.emptyNotes}>
                <Text style={[styles.emptyNotesText, { color: TH.sub }]}>
                  {T('trailReviewEmpty')}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyNotesButton, { backgroundColor: P }]}
                  onPress={() => handleWriteNote()}
                >
                  <Text style={styles.emptyNotesButtonText}>{T('trailReviewStart')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tabIndex === 2 && (
          <>
            <PlanTasksSection
              planItems={trailPlanItems}
              checkins={trailPlanCheckins}
              onNavigateToPlan={handleNavigateToPlan}
              onDeletePlanItem={handleDeletePlanItem}
              onCreatePlan={() => setShowCreatePlan(true)}
            />
            <RelatedTrailsSection
              relatedTrails={relatedTrails}
              onNavigateToTrail={handleNavigateToTrail}
            />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <AddReflectionFAB
        onWriteNote={() => handleWriteNote()}
      />

      {/* Modals */}
      <WriteNoteModal
        visible={showWriteNote}
        guidedQuestion={guidedQuestion}
        reviewPerspectives={(trail.reviewCache as any)?.perspectives ?? (trail.reviewCache as any)?.questions ?? []}
        onSave={handleSaveNoteAndClose}
        onClose={() => { setShowWriteNote(false); setGuidedQuestion(undefined); }}
      />

      <EditNoteModal
        visible={showEditNote}
        note={editingNote}
        onSave={handleUpdateNote}
        onClose={() => { setShowEditNote(false); setEditingNote(null); }}
      />

      <SelectReflectionModal
        visible={showSelectReflection}
        reflections={reflections ?? []}
        onConfirm={handleConfirmReflections}
        onClose={() => setShowSelectReflection(false)}
      />

      <CreatePlanFromTrailModal
        visible={showCreatePlan}
        insightCache={trail.insightCache}
        onCreate={handlePlanCreateAndClose}
        onClose={() => setShowCreatePlan(false)}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  descText: {
    fontSize: FONT_SMALL,
  },
  descEditRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  descInput: {
    fontSize: FONT_SMALL,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  overviewRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  overviewText: {
    fontSize: FONT_SMALL,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_BODY,
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyNotesText: {
    fontSize: FONT_SMALL,
    marginBottom: 12,
  },
  emptyNotesButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyNotesButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
});
