// ─── Reflection business logic (pure functions) ────────────────
import type { MindReflection, PlanItem, ReflectionFilters } from '../types';
import { createReflection } from '../defaults';

export type CreateReflectionParams = Parameters<typeof createReflection>[0];

export function addReflectionToList(reflections: MindReflection[], params: CreateReflectionParams): MindReflection[] {
  return [createReflection(params), ...reflections];
}

export function togglePinInList(reflections: MindReflection[], id: string): MindReflection[] {
  const now = Date.now();
  return reflections.map(r => r.id === id && !r.deleted ? { ...r, isPinned: !r.isPinned, updatedAt: now } : r);
}

export function deleteReflectionFromList(reflections: MindReflection[], id: string): MindReflection[] {
  const now = Date.now();
  return reflections.map(r => r.id === id && !r.deleted ? { ...r, deleted: true, updatedAt: now } : r);
}

export function updateReflectionInList(reflections: MindReflection[], id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>): MindReflection[] {
  const now = Date.now();
  return reflections.map(r => r.id === id && !r.deleted ? { ...r, ...updates, updatedAt: now } : r);
}

/** Link reflection to a plan item */
export function linkReflectionToPlanItem(
  reflections: MindReflection[],
  reflectionId: string,
  planItemId: string,
): MindReflection[] {
  const now = Date.now();
  return reflections.map(r =>
    r.id === reflectionId && !r.deleted ? { ...r, linkedPlanItemId: planItemId, updatedAt: now } : r
  );
}

/** Unlink reflection from plan item */
export function unlinkReflectionFromPlanItem(
  reflections: MindReflection[],
  reflectionId: string,
): MindReflection[] {
  const now = Date.now();
  return reflections.map(r =>
    r.id === reflectionId && !r.deleted ? { ...r, linkedPlanItemId: undefined, updatedAt: now } : r
  );
}

/** Get linked plan item for a reflection */
export function getLinkedPlanItem(
  reflection: MindReflection,
  planItems: PlanItem[],
): PlanItem | null {
  if (!reflection.linkedPlanItemId) return null;
  return planItems.find(i => i.id === reflection.linkedPlanItemId && !i.deleted) ?? null;
}

// ─── Filtering & grouping ────────────────────────────────────────

/** Filter reflections by ReflectionFilters (pure function) */
export function filterReflections(
  reflections: MindReflection[],
  filters: ReflectionFilters,
  planItems?: PlanItem[],
): MindReflection[] {
  return reflections.filter(r => {
    if (r.deleted) return false;
    if (!r.content?.trim()) return false;
    const tags = r.tags ?? [];
    if (filters.tags.length > 0 && !filters.tags.some(t => tags.includes(t))) return false;
    if (filters.moods.length > 0 && !filters.moods.includes(r.mood)) return false;
    if (filters.hasLink && !r.link) return false;
    if (filters.hasLinkedTask) {
      if (!r.linkedPlanItemId) return false;
      if (planItems) {
        const item = planItems.find(i => i.id === r.linkedPlanItemId && !i.deleted);
        if (!item) return false;
      }
    }
    if (filters.dateRange) {
      const ts = r.timestamp ?? 0;
      if (ts < filters.dateRange.from || ts > filters.dateRange.to) return false;
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const match = r.content.toLowerCase().includes(q) ||
        tags.some(t => t.toLowerCase().includes(q)) ||
        (r.mood && r.mood.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

/** Group reflections by date (descending order) */
export function groupReflectionsByDate(
  reflections: MindReflection[],
): Record<string, MindReflection[]> {
  const m: Record<string, MindReflection[]> = {};
  const sorted = [...reflections].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  sorted.forEach(r => {
    if (!r.timestamp) return;
    const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    if (!m[d]) m[d] = [];
    m[d].push(r);
  });
  return m;
}

/** Compute dynamic tag counts based on pre-filtered reflections (excluding tag filter) */
export function computeDynamicTagCounts(
  reflections: MindReflection[],
  filters: ReflectionFilters,
): Record<string, number> {
  // Pre-filter by everything except tags
  const preFiltered = reflections.filter(r => {
    if (r.deleted) return false;
    if (filters.moods.length > 0 && !filters.moods.includes(r.mood)) return false;
    if (filters.hasLink && !r.link) return false;
    if (filters.hasLinkedTask && !r.linkedPlanItemId) return false;
    if (filters.dateRange) {
      const ts = r.timestamp ?? 0;
      if (ts < filters.dateRange.from || ts > filters.dateRange.to) return false;
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const match = r.content.toLowerCase().includes(q) ||
        (r.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        (r.mood && r.mood.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const counts: Record<string, number> = { '': preFiltered.length };
  preFiltered.forEach(r =>
    (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }),
  );
  return counts;
}

/** Compute dynamic mood counts based on pre-filtered reflections (excluding mood filter) */
export function computeDynamicMoodCounts(
  reflections: MindReflection[],
  filters: ReflectionFilters,
): Record<string, number> {
  const preFiltered = reflections.filter(r => {
    if (r.deleted) return false;
    if (filters.tags.length > 0 && !filters.tags.some(t => (r.tags ?? []).includes(t))) return false;
    if (filters.hasLink && !r.link) return false;
    if (filters.hasLinkedTask && !r.linkedPlanItemId) return false;
    if (filters.dateRange) {
      const ts = r.timestamp ?? 0;
      if (ts < filters.dateRange.from || ts > filters.dateRange.to) return false;
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const match = r.content.toLowerCase().includes(q) ||
        (r.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        (r.mood && r.mood.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const counts: Record<string, number> = {};
  preFiltered.forEach(r => {
    if (r.mood) counts[r.mood] = (counts[r.mood] || 0) + 1;
  });
  return counts;
}
