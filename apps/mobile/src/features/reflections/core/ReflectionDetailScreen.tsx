import type { MindReflection } from '@egoless-do/core';
import { formatDate } from '@egoless-do/core';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useState } from 'react';
import { Alert, Share } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppStore, useShallowStore, type MobileStore } from '../../../store/useAppStore';

import ReflectionDetailContent from './ReflectionDetailContent';
import ShareCard from './ShareCard';


export default function ReflectionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ReflectionDetail'>>();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { reflectionId } = route.params;
  const { reflections, getActivePlan, deleteReflection } = useShallowStore(s => ({ reflections: s.reflections, getActivePlan: s.getActivePlan, deleteReflection: s.deleteReflection }));
  const T = useT();
  const language = useAppStore(useShallow((s: MobileStore) => s.language));
  const [shareReflection, setShareReflection] = useState<MindReflection | null>(null);

  const handleEdit = useCallback((r: MindReflection) => {
    // NOTE: Reflections is a MainTab screen, nested navigator type mismatch
    nav.navigate('Reflections' as never, { editId: r.id } as never);
  }, [nav]);

  const handleShare = useCallback(async (r: MindReflection) => {
    Alert.alert(T('reflShare'), '', [
      {
        text: T('shareTextShare'), onPress: async () => {
          try {
            const tagsStr = r.tags?.length ? `\n🏷️ ${r.tags.join(' ')}` : '';
            const moodStr = r.mood ? `\n💭 ${r.mood}` : '';
            const timeStr = formatDate(new Date(r.timestamp ?? 0), language, { year: 'numeric', month: 'long', day: 'numeric' });
            await Share.share({
              message: `「${r.content}」${tagsStr}${moodStr}\n\n📅 ${timeStr}\n— 来自心流纪 · Egoless Do\nhttps://egoless-do.app`,
            });
          } catch { /* Share API unavailable — ignore */ }
        },
      },
      { text: T('shareImageShare'), onPress: () => setShareReflection(r) },
      { text: T('cancel'), style: 'cancel' },
    ]);
  }, [T]);

  const handleCreatePlanItem = useCallback((id: string) => {
    const r = (reflections ?? []).find(x => !x.deleted && x.id === id);
    if (r) {
      const activePlan = getActivePlan?.();
      if (activePlan) {
        nav.navigate('PlanCreate', { planId: activePlan.id, reflectionId: id });
      } else {
        nav.navigate('PlanCreate', { reflectionId: id });
      }
    }
  }, [reflections, getActivePlan, nav]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(T('confirmDelete'), T('confirmDeleteReflection'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('delete'), style: 'destructive', onPress: () => {
        deleteReflection(id);
        nav.goBack();
      }},
    ]);
  }, [deleteReflection, nav, T]);

  return (
    <>
      <ReflectionDetailContent
        reflectionId={reflectionId}
        onClose={() => nav.goBack()}
        onEdit={handleEdit}
        onShare={handleShare}
        onCreatePlanItem={handleCreatePlanItem}
        onDelete={handleDelete}
      />
      <ShareCard
        visible={!!shareReflection}
        onClose={() => setShareReflection(null)}
        reflection={shareReflection}
      />
    </>
  );
}
