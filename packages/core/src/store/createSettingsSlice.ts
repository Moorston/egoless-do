import type { ThemeName } from '../types';
import type { ModelConfig, AIMode } from '../ai/types';
import type { SliceCreator } from './sliceHelper';

export interface SettingsSlice {
  // Theme/Language/Remind
  theme: ThemeName;
  language: string;
  remindEnabled: boolean;
  remindTime: string;
  setTheme: (t: ThemeName) => void;
  setLanguage: (l: string) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;

  // AI
  aiMode: AIMode;
  aiModels: ModelConfig[];
  setAIMode: (mode: AIMode) => void;
  addAIModel: (model: ModelConfig) => void;
  updateAIModel: (modelId: string, updates: Partial<ModelConfig>) => void;
  removeAIModel: (modelId: string) => void;
  setDefaultAIModel: (modelId: string) => void;
  toggleAIModel: (modelId: string) => void;
}

export function createSettingsSlice(
  onPersist?: () => void,
  onSettingChange?: () => void,
  onAIPersist?: () => void,
): SliceCreator<SettingsSlice> {
  return (set, get) => ({
    // ── Theme / Language / Remind ───────────────────────────────────────
    theme: 'light' as ThemeName,
    language: 'zh',
    remindEnabled: false,
    remindTime: '21:00',

    setTheme(theme: ThemeName) { set({ theme }); onSettingChange?.(); onPersist?.(); },
    setLanguage(language: string) { set({ language }); onSettingChange?.(); onPersist?.(); },
    setRemindEnabled(v: boolean) { set({ remindEnabled: v }); onSettingChange?.(); onPersist?.(); },
    setRemindTime(t: string) { set({ remindTime: t }); onSettingChange?.(); onPersist?.(); },

    // ── AI Config ──────────────────────────────────────────────────────
    aiMode: 'hybrid' as AIMode,
    aiModels: [],

    setAIMode(mode: AIMode) {
      set({ aiMode: mode });
      onAIPersist?.();
    },

    addAIModel(model: ModelConfig) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).some((m: ModelConfig) => m.id === model.id)
          ? (s.aiModels as ModelConfig[]).map((m: ModelConfig) => m.id === model.id ? model : m)
          : [...s.aiModels as ModelConfig[], model],
      }));
      onAIPersist?.();
    },

    updateAIModel(modelId: string, updates: Partial<ModelConfig>) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) => m.id === modelId ? { ...m, ...updates } : m),
      }));
      onAIPersist?.();
    },

    removeAIModel(modelId: string) {
      set((s) => ({ aiModels: (s.aiModels as ModelConfig[]).filter((m: ModelConfig) => m.id !== modelId) }));
      onAIPersist?.();
    },

    setDefaultAIModel(modelId: string) {
      let changed = false;
      set((s) => {
        if (!(s.aiModels as ModelConfig[]).some((m: ModelConfig) => m.id === modelId)) return s;
        changed = true;
        return { aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) => ({ ...m, isDefault: m.id === modelId })) };
      });
      if (changed) onAIPersist?.();
    },

    toggleAIModel(modelId: string) {
      set((s) => ({
        aiModels: (s.aiModels as ModelConfig[]).map((m: ModelConfig) =>
          m.id === modelId ? { ...m, enabled: !m.enabled } : m
        ),
      }));
      onAIPersist?.();
    },
  });
}
