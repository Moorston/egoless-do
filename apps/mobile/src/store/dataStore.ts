// ─── Data Store ──────────────────────────────────────────────────
// Manages business data with normalized structure.

import { create } from 'zustand';
import type { DataGateway } from '@egoless-do/core';

export interface DataStore {
  // Entity caches (normalized by ID)
  entities: Record<string, Record<string, unknown>>;

  // DataGateway reference
  gateway: DataGateway | null;
  setGateway: (gateway: DataGateway) => void;

  // Generic CRUD operations
  getEntity: <T>(collection: string, id: string) => T | null;
  setEntity: (collection: string, id: string, data: unknown) => void;
  removeEntity: (collection: string, id: string) => void;

  // Batch operations
  setEntities: (collection: string, items: Array<{ id: string; data: unknown }>) => void;
  clearCollection: (collection: string) => void;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;

  // Error states
  errors: Record<string, string | null>;
  setError: (key: string, error: string | null) => void;
}

export const useDataStore = create<DataStore>()((set, get) => ({
  // Entity caches
  entities: {},

  // DataGateway
  gateway: null,
  setGateway: (gateway) => set({ gateway }),

  // Generic CRUD
  getEntity: (collection, id) => {
    const state = get();
    return (state.entities[collection]?.[id] as Record<string, unknown>) ?? null;
  },

  setEntity: (collection, id, data) =>
    set((state) => ({
      entities: {
        ...state.entities,
        [collection]: {
          ...state.entities[collection],
          [id]: data,
        },
      },
    })),

  removeEntity: (collection, id) =>
    set((state) => {
      const collectionData = { ...state.entities[collection] };
      delete collectionData[id];
      return {
        entities: {
          ...state.entities,
          [collection]: collectionData,
        },
      };
    }),

  // Batch operations
  setEntities: (collection, items) =>
    set((state) => ({
      entities: {
        ...state.entities,
        [collection]: {
          ...state.entities[collection],
          ...Object.fromEntries(items.map((item) => [item.id, item.data])),
        },
      },
    })),

  clearCollection: (collection) =>
    set((state) => ({
      entities: {
        ...state.entities,
        [collection]: {},
      },
    })),

  // Loading states
  loading: {},
  setLoading: (key, loading) =>
    set((state) => ({
      loading: { ...state.loading, [key]: loading },
    })),

  // Error states
  errors: {},
  setError: (key, error) =>
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    })),
}));
