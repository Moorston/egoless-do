import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../components/UI';

export function useTrailActions(trailId: string) {
  const T = useT();
  const nav = useNavigation();
  const addReflectionToTrail = useAppStore(s => s.addReflectionToTrail);
  const removeReflectionFromTrail = useAppStore(s => s.removeReflectionFromTrail);
  const deleteTrailNote = useAppStore(s => s.deleteTrailNote);
  const addTrailNote = useAppStore(s => s.addTrailNote);
  const updateThoughtTrail = useAppStore(s => s.updateThoughtTrail);
  const deleteThoughtTrail = useAppStore(s => s.deleteThoughtTrail);
  const createPlanItemFromTrail = useAppStore(s => s.createPlanItemFromTrail);

  const handleWriteReflection = useCallback(() => {
    (nav as any).navigate('Reflections', { showNew: true, trailId });
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

  const handleCreatePlan = useCallback((form: { name: string; description: string; priority: any; startDate: string; endDate: string }) => {
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
    nav.navigate('PlanDetail' as never, { planId: planItemId } as never);
  }, [nav]);

  const handleNavigateToTrail = useCallback((targetTrailId: string) => {
    if (targetTrailId === trailId) return;
    nav.push('ThoughtTrailDetail' as never, { trailId: targetTrailId } as never);
  }, [nav, trailId]);

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
    handleNavigateToPlan,
    handleNavigateToTrail,
  };
}
