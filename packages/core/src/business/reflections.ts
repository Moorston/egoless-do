// ─── Reflection business logic (pure functions) ────────────────
import type { MindReflection } from '../types';
import { createReflection } from '../defaults';

export type CreateReflectionParams = Parameters<typeof createReflection>[0];

export function addReflectionToList(reflections: MindReflection[], params: CreateReflectionParams): MindReflection[] {
  return [createReflection(params), ...reflections];
}

export function togglePinInList(reflections: MindReflection[], id: string): MindReflection[] {
  const now = Date.now();
  return reflections.map(r => r.id === id ? { ...r, isPinned: !r.isPinned, updatedAt: now } : r);
}

export function deleteReflectionFromList(reflections: MindReflection[], id: string): MindReflection[] {
  return reflections.filter(r => r.id !== id);
}

export function updateReflectionInList(reflections: MindReflection[], id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>): MindReflection[] {
  const now = Date.now();
  return reflections.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r);
}
