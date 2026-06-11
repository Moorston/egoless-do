// ─── AI module exports ─────────────────────────────────────────
export { AIService, getAIService, resetAIService } from './ai-service';
export { LocalAIEngine } from './local-engine';
export { 
  OpenAICompatibleProvider, 
  createProvider, testConnection 
} from './cloud-providers';

// Context reminder
export {
  getAllContextReminders,
  detectMoodPatterns,
  detectHabitRisks,
  detectStreakRisks,
  detectReflectionGaps,
} from './context-reminder';
export type { ContextReminder } from './context-reminder';

// Risk warning
export {
  getAllRiskWarnings,
  detectHabitAbandonRisk,
  detectPlanDelayRisk,
  detectStreakBreakRisk,
  detectMoodDeclineRisk,
} from './risk-warning';
export type { RiskWarning } from './risk-warning';

// Thought patterns
export {
  getAllThoughtPatterns,
  detectMoodSequencePatterns,
  detectTagPatterns,
  detectTimePatterns,
  detectKeywordPatterns,
  detectGrowthPatterns,
} from './thought-patterns';
export type { ThoughtPattern } from './thought-patterns';

// Personalized suggestions
export {
  getAllPersonalizedSuggestions,
  generateMoodSuggestions,
  generateHabitSuggestions,
  generateRiskBasedSuggestions,
  generateTimeBasedSuggestions,
} from './personalized-suggestions';
export type { PersonalizedSuggestion } from './personalized-suggestions';

// Layout algorithms
export {
  applyForceLayout,
  applyHierarchicalLayout,
  applyCircularLayout,
  applyGridLayout,
  aggregateNodes,
} from './layout-algorithms';
export type { LayoutNode, LayoutEdge, LayoutConfig } from './layout-algorithms';

export type {
  AIFeatureType, AIMode,
  AIResult, AIConfig, ModelConfig, ProviderTemplate,
  TagSuggestion, MoodDetection, TrailInsight,
  ReviewGuide, GenerateOptions, UsageStats,
} from './types';

export { PROVIDER_TEMPLATES } from './types';
