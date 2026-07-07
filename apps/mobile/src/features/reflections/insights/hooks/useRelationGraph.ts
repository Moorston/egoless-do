import { buildRelationGraph } from '@egoless-do/core';
import { useMemo } from 'react';

import { useShallowStore } from '../../../../store/useAppStore';
import type { RelationContext, GraphBuildResult } from '../types';

/**
 * 关系图数据构建 hook
 *
 * 从 store 取数据，调用 core 的纯函数构建图数据。
 */
export function useRelationGraph(context?: RelationContext): GraphBuildResult {
  const storeData = useShallowStore(s => ({
      plans: s.plans,
      planItems: s.planItems,
      reflections: s.reflections,
      thoughtTrails: s.thoughtTrails,
      habits: s.habits,
      reflectionLinks: s.reflectionLinks,
    }));

  return useMemo(() => {
    if (!context) {
      return { nodes: [], edges: [], insights: [], contextNode: null };
    }

    return buildRelationGraph({
      context,
      plans: storeData.plans ?? [],
      planItems: storeData.planItems ?? [],
      reflections: storeData.reflections ?? [],
      thoughtTrails: storeData.thoughtTrails ?? [],
      habits: storeData.habits ?? [],
      reflectionLinks: storeData.reflectionLinks ?? [],
    });
  }, [storeData.plans, storeData.planItems, storeData.reflections, storeData.thoughtTrails, storeData.habits, storeData.reflectionLinks, context]);
}
