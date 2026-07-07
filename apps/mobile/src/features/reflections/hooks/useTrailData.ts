import { getTrailOverview, getRelatedTrails, getTrailTimelineItems } from '@egoless-do/core';
import type { ThoughtTrail } from '@egoless-do/core';
import { useMemo } from 'react';

import { useShallowStore } from '../../../store/useAppStore';

export function useTrailData(trailId: string) {
  const thoughtTrails = useShallowStore(s => s.thoughtTrails);
  const reflections = useShallowStore(s => s.reflections);
  const trailNotes = useShallowStore(s => s.trailNotes);
  const reflectionLinks = useShallowStore(s => s.reflectionLinks);
  const planItemCheckins = useShallowStore(s => s.planItemCheckins);
  const getTrailPlanItems = useShallowStore(s => s.getTrailPlanItems);

  const trail = useMemo(() =>
    (thoughtTrails ?? []).find((t: ThoughtTrail) => !t.deleted && t.id === trailId),
    [thoughtTrails, trailId]
  );

  const allTrails = useMemo(() =>
    (thoughtTrails ?? []).filter((t: ThoughtTrail) => !t.deleted),
    [thoughtTrails]
  );

  const overview = useMemo(() => {
    if (!trail) return null;
    return getTrailOverview(trail, reflections ?? [], trailNotes ?? []);
  }, [trail, reflections, trailNotes]);

  const timelineItems = useMemo(() => {
    if (!trail) return [];
    return getTrailTimelineItems(trail, reflections ?? [], trailNotes ?? []);
  }, [trail, reflections, trailNotes]);

  const links = useMemo(() => {
    if (!trail) return [];
    const ids = new Set(trail.reflectionIds ?? []);
    return (reflectionLinks ?? [])
      .filter(l => !l.deleted && ids.has(l.fromId) && ids.has(l.toId))
      .map(l => ({ fromId: l.fromId, toId: l.toId, type: l.type }));
  }, [trail, reflectionLinks]);

  const trailPlanItems = useMemo(() => {
    if (!trail) return [];
    return getTrailPlanItems(trailId);
  }, [trail, trailId, getTrailPlanItems]);

  const trailPlanCheckins = useMemo(() => {
    const ids = new Set(trailPlanItems.map(p => p.id));
    return (planItemCheckins ?? []).filter(c => !c.deleted && ids.has(c.planItemId));
  }, [trailPlanItems, planItemCheckins]);

  const relatedTrails = useMemo(() => {
    if (!trail) return [];
    return getRelatedTrails(trail, allTrails, reflections ?? [], trailNotes ?? [], 3);
  }, [trail, allTrails, reflections, trailNotes]);

  return {
    trail,
    overview,
    timelineItems,
    links,
    trailPlanItems,
    trailPlanCheckins,
    relatedTrails,
    allTrails,
    reflections,
    trailNotes,
  };
}
