import React, { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import ReflectionDetailContent from './ReflectionDetailContent';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../components/UI';

export default function ReflectionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ReflectionDetail'>>();
  const nav = useNavigation<any>();
  const { reflectionId } = route.params;
  const store = useAppStore();
  const T = useT();

  const handleEdit = useCallback((r: any) => {
    nav.navigate('Reflections', { editId: r.id });
  }, [nav]);

  const handleShare = useCallback(async (r: any) => {
    try {
      await Share.share({ message: r.content || '' });
    } catch {}
  }, []);

  const handleCreatePlanItem = useCallback((id: string) => {
    const r = (store.reflections ?? []).find(x => !x.deleted && x.id === id);
    if (r) {
      const activePlan = store.getActivePlan?.();
      if (activePlan) {
        nav.navigate('PlanDetail', { planId: activePlan.id, addReflectionId: id });
      } else {
        nav.navigate('PlanCreate', { reflectionId: id });
      }
    }
  }, [store, nav]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(T('confirmDelete'), T('confirmDeleteReflection'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('delete'), style: 'destructive', onPress: () => {
        store.deleteReflection(id);
        nav.goBack();
      }},
    ]);
  }, [store, nav, T]);

  return (
    <ReflectionDetailContent
      reflectionId={reflectionId}
      onClose={() => nav.goBack()}
      onEdit={handleEdit}
      onShare={handleShare}
      onCreatePlanItem={handleCreatePlanItem}
      onDelete={handleDelete}
    />
  );
}
