// ─── ReflectionLink slice ──────────────────────────────────────
import type { ReflectionLink, LinkType } from '../types/reflection-link';
import type { StorageAdapter, ReflectionLinkSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';

export function createReflectionLinkSlice(adapter?: StorageAdapter): SliceCreator<ReflectionLinkSlice> {
  return (set, get) => ({
    reflectionLinks: [],

    createReflectionLink: (fromId: string, toId: string, type: LinkType, note?: string) => {
      const id = uid();
      const now = Date.now();
      const link: ReflectionLink = {
        id,
        fromId,
        toId,
        type,
        note,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      set(s => ({ reflectionLinks: [...(s.reflectionLinks ?? []), link] }));
      adapter?.persistChange('reflectionLink', id, link).catch(console.error);
      return id;
    },

    updateReflectionLink: (id: string, patch: Partial<ReflectionLink>) => {
      set(s => ({
        reflectionLinks: (s.reflectionLinks ?? []).map(l =>
          l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l
        ),
      }));
      const link = get().reflectionLinks.find(l => l.id === id);
      if (link) adapter?.persistChange('reflectionLink', id, link).catch(console.error);
    },

    deleteReflectionLink: (id: string) => {
      set(s => ({
        reflectionLinks: (s.reflectionLinks ?? []).filter(l => l.id !== id),
      }));
      adapter?.markDeleted('reflectionLink', id).catch(console.error);
    },

    getLinksByReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l => 
        !l.deleted && (l.fromId === reflectionId || l.toId === reflectionId)
      );
    },

    getLinksFromReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l => 
        !l.deleted && l.fromId === reflectionId
      );
    },

    getLinksToReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l => 
        !l.deleted && l.toId === reflectionId
      );
    },

    deleteLinksByReflection: (reflectionId: string) => {
      const linksToDelete = (get().reflectionLinks ?? []).filter(l => 
        !l.deleted && (l.fromId === reflectionId || l.toId === reflectionId)
      );
      
      set(s => ({
        reflectionLinks: (s.reflectionLinks ?? []).filter(l => 
          l.fromId !== reflectionId && l.toId !== reflectionId
        ),
      }));

      linksToDelete.forEach(l => {
        adapter?.markDeleted('reflectionLink', l.id).catch(console.error);
      });
    },
  });
}
