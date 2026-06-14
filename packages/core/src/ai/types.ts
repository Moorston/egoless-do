// ─── AI types ──────────────────────────────────────────────────

export type AIFeatureType =
  | 'tag_suggest'
  | 'mood_detect'
  | 'content_expand'
  | 'trail_insight'
  | 'review_guide';

export type AIMode = 'local' | 'cloud' | 'hybrid';

export interface AIResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'local' | 'cloud';
  model?: string;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason?: string;
}

export interface MoodDetection {
  mood: string;
  confidence: number;
  alternatives: string[];
}

export interface TrailInsight {
  summary: string;
  keyPoints: string[];
  turningPoints: string[];
  suggestions: string[];
}

export interface ReviewGuide {
  perspectives: string[];  // 复盘思路（多维度视角）
  observations: string[];
  suggestions: string[];
}

// 单个模型配置
export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  isDefault?: boolean;
}

// 预设的API提供商模板
export interface ProviderTemplate {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];  // 推荐的模型列表
  description: string;
}

// AI配置
export interface AIConfig {
  mode: AIMode;
  models: ModelConfig[];
  localEngineEnabled: boolean;
}

// 使用统计
export interface UsageStats {
  modelId: string;
  requestCount: number;
  tokenCount: number;
  lastUsed: number;
}

// 生成选项
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// 预设的提供商模板
export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: 'mimo',
    name: '小米 MIMO',
    baseUrl: 'https://api.mimo.ai/v1',
    models: ['MIMO-V2-Flash', 'MIMO-V2-Pro', 'MIMO-V2.5'],
    description: '小米大模型，支持多种规格',
  },
  {
    id: 'tongyi',
    name: '阿里云 通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    description: '阿里云大模型，有免费额度',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    description: '国产大模型，有免费额度',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    description: 'OpenAI GPT 系列',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-pro', 'gemini-1.5-flash'],
    description: 'Google 大模型',
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3', 'qwen2', 'gemma2', 'mistral'],
    description: '本地运行，无需API Key',
  },
];
