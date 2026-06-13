import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Trash2, Pencil, Target } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';
import { useTrailData } from './useTrailData';
import { useTrailAI } from './useTrailAI';
import { useTrailActions } from './useTrailActions';

import { InsightSection } from './InsightSection';
import { ReviewGuideSection } from './ReviewGuideSection';
import { TimelineList } from './TimelineList';
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
  const { trailId } = route.params as { trailId: string };

  const {
    trail, overview, timelineItems, links, reflections,
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
    handleNavigateToPlan,
    handleNavigateToTrail,
  } = useTrailActions(trailId);

  // ─── Inline editing ─────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [showWriteNote, setShowWriteNote] = useState(false);
  const [guidedQuestion, setGuidedQuestion] = useState<string | undefined>();
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
      if (trail?.insightCache) await handleGenerateInsight();
      if (trail?.reviewCache) await handleGenerateReview();
    } finally {
      setRefreshing(false);
    }
  }, [trail, handleGenerateInsight, handleGenerateReview]);

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
          <TouchableOpacity onPress={() => setShowCreatePlan(true)} style={styles.headerButton}>
            <Target size={20} color={P} />
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
            placeholder="添加描述..."
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
            {overview.reflectionCount} 感念 · {overview.noteCount} 笔记 · {overview.daySpan} 天 {overview.moodChanges.length > 0 ? `· ${overview.moodChanges.join('→')}` : ''}
          </Text>
        </View>
      )}

      <SegmentBar
        segments={['时间线', '洞察', '复盘', '计划']}
        selectedIndex={tabIndex}
        onSelect={setTabIndex}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
            items={timelineItems}
            links={links}
            onRemoveReflection={handleRemoveReflection}
            onDeleteNote={handleDeleteNote}
            onCreatePlanFromReflection={handleCreatePlanFromReflection}
            onCreatePlanFromNote={handleCreatePlanFromReflection}
          />
        )}

        {tabIndex === 1 && (
          <InsightSection
            insightCache={trail.insightCache}
            onGenerate={handleGenerateInsight}
            stale={insightCacheStale}
          />
        )}

        {tabIndex === 2 && (
          <ReviewGuideSection
            reviewCache={trail.reviewCache}
            onGenerate={handleGenerateReview}
            onStartWrite={handleWriteNote}
            stale={reviewCacheStale}
          />
        )}

        {tabIndex === 3 && (
          <>
            <PlanTasksSection
              planItems={trailPlanItems}
              checkins={trailPlanCheckins}
              onNavigateToPlan={handleNavigateToPlan}
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
        onWriteReflection={handleWriteReflection}
        onSelectExisting={handleSelectExisting}
        onWriteNote={() => handleWriteNote()}
      />

      {/* Modals */}
      <WriteNoteModal
        visible={showWriteNote}
        guidedQuestion={guidedQuestion}
        onSave={handleSaveNoteAndClose}
        onClose={() => { setShowWriteNote(false); setGuidedQuestion(undefined); }}
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
});
