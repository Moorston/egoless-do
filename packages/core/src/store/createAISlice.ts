import type { ModelConfig, AIMode } from '../ai/types';
import type { AISlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createAISlice(onPersist?: () => void): SliceCreator<AISlice> {
  return (set: any) => ({
    aiMode: 'hybrid' as AIMode,
    aiModels: [],

    setAIMode(mode: AIMode) {
      set({ aiMode: mode });
      onPersist?.();
    },

    addAIModel(model: ModelConfig) {
      set(s => ({
        aiModels: s.aiModels.some(m => m.id === model.id)
          ? s.aiModels.map(m => m.id === model.id ? model : m)
          : [...s.aiModels, model],
      }));
      onPersist?.();
    },

    updateAIModel(modelId: string, updates: Partial<ModelConfig>) {
      set(s => ({
        aiModels: s.aiModels.map(m => m.id === modelId ? { ...m, ...updates } : m),
      }));
      onPersist?.();
    },

    removeAIModel(modelId: string) {
      set(s => ({ aiModels: s.aiModels.filter(m => m.id !== modelId) }));
      onPersist?.();
    },

    setDefaultAIModel(modelId: string) {
      let changed = false;
      set(s => {
        if (!s.aiModels.some(m => m.id === modelId)) return s;
        changed = true;
        return { aiModels: s.aiModels.map(m => ({ ...m, isDefault: m.id === modelId })) };
      });
      if (changed) onPersist?.();
    },

    toggleAIModel(modelId: string) {
      set(s => ({
        aiModels: s.aiModels.map(m =>
          m.id === modelId ? { ...m, enabled: !m.enabled } : m
        ),
      }));
      onPersist?.();
    },
  });
}
