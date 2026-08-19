import { getAIService } from '@egoless-do/core';
import type { TrailInsightCache, TrailReviewCache, ThoughtTrail, MindReflection, TrailNote } from '@egoless-do/core';
import { useCallback, useRef, useMemo, useEffect } from 'react';

import {useShallowStore} from '../../../store/useAppStore';

const CACHE_FRESH_MS = 5 * 60 * 1000;

function isCacheStale(
  cache: { generatedAt: number } | undefined,
  trail: ThoughtTrail | undefined,
  reflections: MindReflection[] | undefined,
  trailNotes: TrailNote[] | undefined,
): boolean {
  if (!trail) return false;
  if (!cache) return true;
  const reflectionTimestamps = trail.reflectionIds
    .map(id => (reflections ?? []).find(r => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null && !r.deleted)
    .map(r => r.timestamp);
  const noteTimestamps = (trail.noteIds ?? [])
    .map(id => (trailNotes ?? []).find(n => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n != null && !n.deleted)
    .map(n => n.createdAt);
  const allTimestamps = [...reflectionTimestamps, ...noteTimestamps];
  if (allTimestamps.length === 0) return false;
  const lastModified = Math.max(...allTimestamps);
  return lastModified > cache.generatedAt + CACHE_FRESH_MS;
}

export function useTrailAI(trailId: string, trail: ThoughtTrail | undefined) {
  const reflections = useShallowStore(s => s.reflections);
  const trailNotes = useShallowStore(s => s.trailNotes);
  const aiMode = useShallowStore(s => s.aiMode);
  const setInsightCache = useShallowStore(s => s.setInsightCache);
  const setReviewCache = useShallowStore(s => s.setReviewCache);

  const aiAbortRef = useRef<AbortController | null>(null);

  const insightCacheStale = useMemo(
    () => isCacheStale(trail?.insightCache, trail, reflections, trailNotes),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
    [trail?.insightCache, trail, reflections, trailNotes],
  );

  const reviewCacheStale = useMemo(
    () => isCacheStale(trail?.reviewCache, trail, reflections, trailNotes),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
    [trail?.reviewCache, trail, reflections, trailNotes],
  );

  const handleGenerateInsight = useCallback(async () => {
    if (!trail) return;
    if (aiAbortRef.current) aiAbortRef.current.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    const aiService = getAIService();
    const trailReflections = trail.reflectionIds
      .map(id => (reflections ?? []).find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r != null && !r.deleted);
    const notes = (trail.noteIds ?? [])
      .map(id => (trailNotes ?? []).find(n => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n != null && !n.deleted);

    try {
      const result = await aiService.generateTrailInsight(
        trailReflections.map(r => ({ content: r.content, mood: r.mood ?? '' })),
        {
          useCloud: aiMode !== 'local',
          signal: controller.signal,
          trailNotes: notes.map(n => ({ content: n.content, source: n.source, guidedQuestion: n.guidedQuestion })),
        }
      );
      if (controller.signal.aborted) return;

      const cache: TrailInsightCache = {
        summary: result.summary,
        keyPoints: result.keyPoints,
        turningPoints: result.turningPoints,
        suggestions: result.suggestions,
        generatedAt: Date.now(),
        source: aiMode === 'local' ? 'local' : 'cloud',
      };
      setInsightCache(trailId, cache);
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
    }
  }, [trail, trailId, reflections, trailNotes, aiMode, setInsightCache]);

  const handleGenerateReview = useCallback(async () => {
    if (!trail) return;
    if (aiAbortRef.current) aiAbortRef.current.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    const aiService = getAIService();
    const trailReflections = trail.reflectionIds
      .map(id => (reflections ?? []).find(r => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r != null && !r.deleted);
    const notes = (trail.noteIds ?? [])
      .map(id => (trailNotes ?? []).find(n => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n != null && !n.deleted);

    const items = [
      ...trailReflections.map(r => ({ content: r.content, mood: r.mood, timestamp: r.timestamp, kind: 'reflection' as const })),
      ...notes.map(n => ({ content: n.content, mood: n.mood, timestamp: n.createdAt, kind: 'note' as const })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    try {
      const result = await aiService.generateTrailReviewGuide(items, {
        useCloud: aiMode !== 'local',
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const cache: TrailReviewCache = {
        perspectives: result.perspectives,
        observations: result.observations,
        suggestions: result.suggestions,
        generatedAt: Date.now(),
        source: aiMode === 'local' ? 'local' : 'cloud',
      };
      setReviewCache(trailId, cache);
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
    }
  }, [trail, trailId, reflections, trailNotes, aiMode, setReviewCache]);

  useEffect(() => {
    return () => aiAbortRef.current?.abort();
  }, []);

  return { handleGenerateInsight, handleGenerateReview, insightCacheStale, reviewCacheStale };
}
