import type { ModelConfig, AIMode } from '../ai/types';
import type { AISlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createAISlice(onPersist?: () => void): SliceCreator<AISlice> {
  return (set) => ({
    aiMode: 'hybrid' as AIMode,
    aiModels: [],

    setAIMode(mode: AIMode) {
      set({ aiMode: mode });
      onPersist?.();
    },

    addAIModel(model: ModelConfig) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).some((m: ModelConfig) => m.id === model.id)
          ? (s.aiModels as ModelConfig[]).map((m: ModelConfig) => m.id === model.id ? model : m)
          : [...s.aiModels as ModelConfig[], model],
      }));
      onPersist?.();
    },

    updateAIModel(modelId: string, updates: Partial<ModelConfig>) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) => m.id === modelId ? { ...m, ...updates } : m),
      }));
      onPersist?.();
    },

    removeAIModel(modelId: string) {
      set((s) => ({ aiModels: (s.aiModels as ModelConfig[]).filter((m: ModelConfig) => m.id !== modelId) }));
      onPersist?.();
    },

    setDefaultAIModel(modelId: string) {
      let changed = false;
      set((s) => {
        if (!(s.aiModels as ModelConfig[]).some((m: ModelConfig) => m.id === modelId)) return s;
        changed = true;
        return { aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) => ({ ...m, isDefault: m.id === modelId })) };
      });
      if (changed) onPersist?.();
    },

    toggleAIModel(modelId: string) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) =>
          m.id === modelId ? { ...m, enabled: !m.enabled } : m
        ),
      }));
      onPersist?.();
    },
  });
}
