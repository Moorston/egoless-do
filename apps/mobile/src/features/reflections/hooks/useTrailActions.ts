import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import type { PlanItem } from '@egoless-do/core';

export function useTrailActions(trailId: string) {
  const T = useT();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const addReflectionToTrail = useShallowStore(s => s.addReflectionToTrail);
  const removeReflectionFromTrail = useShallowStore(s => s.removeReflectionFromTrail);
  const deleteTrailNote = useShallowStore(s => s.deleteTrailNote);
  const addTrailNote = useShallowStore(s => s.addTrailNote);
  const updateThoughtTrail = useShallowStore(s => s.updateThoughtTrail);
  const deleteThoughtTrail = useShallowStore(s => s.deleteThoughtTrail);
  const createPlanItemFromTrail = useShallowStore(s => s.createPlanItemFromTrail);
  const deletePlanItem = useShallowStore(s => s.deletePlanItem);
  const updateTrailNote = useShallowStore(s => s.updateTrailNote);

  const handleWriteReflection = useCallback(() => {
    nav.navigate('MainTabs' as never, { screen: 'Reflections', params: { showNew: true, trailId } } as never);
  }, [nav, trailId]);

  const handleSelectReflectionsConfirm = useCallback((selectedIds: string[]) => {
    for (const id of selectedIds) {
      addReflectionToTrail(trailId, id);
    }
  }, [addReflectionToTrail, trailId]);

  const handleRemoveReflection = useCallback((reflectionId: string) => {
    Alert.alert(
      T('thoughtTrailRemoveReflection'),
      T('thoughtTrailRemoveReflectionConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => removeReflectionFromTrail(trailId, reflectionId),
        },
      ]
    );
  }, [removeReflectionFromTrail, trailId, T]);

  const handleDeleteNote = useCallback((noteId: string) => {
    Alert.alert(
      T('trailNoteDelete'),
      T('trailNoteDeleteConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('commonConfirm'),
          style: 'destructive',
          onPress: () => deleteTrailNote(noteId),
        },
      ]
    );
  }, [deleteTrailNote, T]);

  const handleSaveNote = useCallback((form: { content: string; tags: string[]; mood?: string; source: 'guided' | 'free'; guidedQuestion?: string }) => {
    addTrailNote(trailId, form);
  }, [addTrailNote, trailId]);

  const handleCreatePlan = useCallback((form: { name: string; description?: string; priority: string; startDate: string; endDate: string; targetMetric?: string }) => {
    createPlanItemFromTrail(trailId, form);
  }, [createPlanItemFromTrail, trailId]);

  const handleUpdateName = useCallback((name: string) => {
    if (name.trim()) {
      updateThoughtTrail(trailId, { name: name.trim() });
    }
  }, [updateThoughtTrail, trailId]);

  const handleUpdateDescription = useCallback((description: string) => {
    updateThoughtTrail(trailId, { description: description.trim() || undefined });
  }, [updateThoughtTrail, trailId]);

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
            deleteThoughtTrail(trailId);
            nav.goBack();
          },
        },
      ]
    );
  }, [deleteThoughtTrail, trailId, nav, T]);

  const handleNavigateToPlan = useCallback((planItemId: string) => {
    const item = (useAppStore.getState().planItems ?? []).find((i: PlanItem) => !i.deleted && i.id === planItemId);
    if (item) {
      nav.navigate('PlanDetail', { planId: item.planId });
    }
  }, [nav]);

  const handleDeletePlanItem = useCallback((planItemId: string) => {
    Alert.alert(
      T('planDeleteItem'),
      T('planDeleteItemConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        {
          text: T('planDeleteItem'),
          style: 'destructive',
          onPress: () => deletePlanItem(planItemId),
        },
      ]
    );
  }, [deletePlanItem, T]);

  const handleNavigateToTrail = useCallback((targetTrailId: string) => {
    if (targetTrailId === trailId) return;
    nav.push('ThoughtTrailDetail', { trailId: targetTrailId });
  }, [nav, trailId]);

  const handleUpdateNote = useCallback((noteId: string, patch: { content?: string; tags?: string[]; mood?: string }) => {
    updateTrailNote(noteId, patch);
  }, [updateTrailNote]);

  return {
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
  };
}
