import React, { useCallback, useState } from 'react';
import { Alert, Share } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/types';
import ReflectionDetailContent from './ReflectionDetailContent';
import ShareCard from './ShareCard';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useT } from '../../../components/UI';

export default function ReflectionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ReflectionDetail'>>();
  const nav = useNavigation<any>();
  const { reflectionId } = route.params;
  const { reflections, getActivePlan, deleteReflection } = useAppStore(useShallow(s => ({ reflections: s.reflections, getActivePlan: s.getActivePlan, deleteReflection: s.deleteReflection })));
  const T = useT();
  const [shareReflection, setShareReflection] = useState<any>(null);

  const handleEdit = useCallback((r: any) => {
    nav.navigate('Reflections', { editId: r.id });
  }, [nav]);

  const handleShare = useCallback(async (r: any) => {
    Alert.alert(T('reflShare'), '', [
      {
        text: T('shareTextShare'), onPress: async () => {
          try {
            const tagsStr = r.tags?.length ? `\n🏷️ ${r.tags.join(' ')}` : '';
            const moodStr = r.mood ? `\n💭 ${r.mood}` : '';
            const timeStr = new Date(r.timestamp ?? 0).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
            await Share.share({
              message: `「${r.content}」${tagsStr}${moodStr}\n\n📅 ${timeStr}\n— 来自心流纪 · Egoless Do\nhttps://egoless-do.app`,
            });
          } catch {}
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
