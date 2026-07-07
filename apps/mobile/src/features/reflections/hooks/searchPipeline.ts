// ─── AI Search Pipeline (pure functions) ────────────────────────────
// Extracted from useQuickTrailSearch for testability and reuse.

import {
  computeCandidatePool, buildIndex, retrieveTopK,
  parseSmartQuery, semanticSearchReflections,
  createLogger,
} from '@egoless-do/core';
import type { MindReflection, SmartQueryResult, TrailFilters } from '@egoless-do/core';

const log = createLogger('SearchPipeline');

export type SearchResult = { ref: MindReflection; score: number; source: 'direct' | 'extended' };

/** Phase 2: Intent understanding — parse smart query, expand candidates with new filters. */
export async function runAIPhase2(
  reflections: MindReflection[],
  trimmed: string,
  candidates: MindReflection[],
  currentFilters: TrailFilters,
  allResults: SearchResult[],
  existingIds: Set<string>,
  chatHistory: string[],
): Promise<{ smartResult: SmartQueryResult | null; shouldReturn: boolean }> {
  try {
    const result = await parseSmartQuery(reflections, trimmed, chatHistory);
    if (result.question && chatHistory.length < 3) {
      return { smartResult: result, shouldReturn: true };
    }
    if (result.topic || (result.filters && Object.keys(result.filters).length > 0)) {
      const newFilters: TrailFilters = {
        timeRange: result.filters.timeRange || currentFilters.timeRange,
        tags: result.filters.tags?.length ? result.filters.tags : currentFilters.tags,
        moods: result.filters.moods?.length ? result.filters.moods : currentFilters.moods,
      };
      const newCandidates = computeCandidatePool(reflections, newFilters);
      const newIndex = buildIndex(newCandidates);
      const topic = result.topic || trimmed;
      const newScored = retrieveTopK(topic, newIndex, 20);
      for (const s of newScored) {
        if (!existingIds.has(s.index.id)) {
          const ref = newCandidates.find(r => r.id === s.index.id);
          if (ref) { allResults.push({ ref, score: s.score, source: 'direct' }); existingIds.add(ref.id); }
        }
      }
      return { smartResult: result, shouldReturn: false };
    }
    return { smartResult: null, shouldReturn: false };
  } catch (e) {
    log.debug('AI Phase 2 failed:', e);
    return { smartResult: null, shouldReturn: false };
  }
}

/** Phase 3: Semantic expansion — find related reflections via embeddings. */
export async function runAIPhase3(
  reflections: MindReflection[],
  trimmed: string,
  allResults: SearchResult[],
  existingIds: Set<string>,
): Promise<{ count: number; failed: boolean }> {
  try {
    const semanticResults = await semanticSearchReflections(reflections, trimmed);
    if (semanticResults.length > 0) {
      const sorted = semanticResults.sort((a, b) => b.relevance - a.relevance);
      for (const sr of sorted) {
        const ref = reflections[sr.reflectionIndex];
        if (ref && !existingIds.has(ref.id)) {
          allResults.push({ ref, score: sr.relevance * 0.5, source: 'extended' });
          existingIds.add(ref.id);
        }
      }
      return { count: semanticResults.length, failed: false };
    }
    return { count: 0, failed: false };
  } catch (e) {
    log.debug('AI Phase 3 failed:', e);
    return { count: 0, failed: true };
  }
}

/** Merge and rank results: direct matches first (by score), then extended. */
export function mergeResults(allResults: SearchResult[]): MindReflection[] {
  const direct = allResults.filter(r => r.source === 'direct').sort((a, b) => b.score - a.score);
  const extended = allResults.filter(r => r.source === 'extended').sort((a, b) => b.score - a.score);
  return [...direct, ...extended].map(r => r.ref);
}
