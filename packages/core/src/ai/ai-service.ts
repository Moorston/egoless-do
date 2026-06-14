// ─── AI Service ────────────────────────────────────────────────
import type {
  AIConfig, AIResult, ModelConfig, AIMode,
  TagSuggestion, MoodDetection, TrailInsight,
  ReviewGuide, GenerateOptions
} from './types';
import type { CheckinReview } from '../types';
import { buildReviewPrompt, parseReviewAIResponse } from '../business/review';
import { LocalAIEngine } from './local-engine';
import { createProvider, testConnection } from './cloud-providers';
import type { CloudProvider } from './cloud-providers';

export class AIService {
  private localEngine: LocalAIEngine;
  private providers: Map<string, CloudProvider> = new Map();
  private config: AIConfig;
  
  constructor(config?: Partial<AIConfig>) {
    this.localEngine = new LocalAIEngine();
    this.config = {
      mode: 'hybrid',
      models: [],
      localEngineEnabled: true,
      ...config,
    };
    this.initProviders();
  }
  
  private initProviders() {
    for (const model of this.config.models) {
      if (model.enabled) {
        try {
          this.providers.set(model.id, createProvider(model));
        } catch (e) {
          console.warn(`Failed to create provider for ${model.id}:`, e);
        }
      }
    }
  }
  
  // 获取配置
  getConfig(): AIConfig {
    return { ...this.config };
  }
  
  // 获取模式
  getMode(): AIMode {
    return this.config.mode;
  }
  
  // 设置模式
  setMode(mode: AIMode) {
    this.config.mode = mode;
  }
  
  // 更新配置
  updateConfig(config: Partial<AIConfig>) {
    if (config.mode !== undefined) {
      this.config.mode = config.mode;
    }
    if (config.models !== undefined) {
      this.config.models = config.models;
      this.providers.clear();
      this.initProviders();
    }
    if (config.localEngineEnabled !== undefined) {
      this.config.localEngineEnabled = config.localEngineEnabled;
    }
    console.log('[AIService] Config updated, providers:', this.providers.size);
  }
  
  // 获取所有模型配置
  getModels(): ModelConfig[] {
    return [...this.config.models];
  }
  
  // 获取已启用的模型
  getEnabledModels(): ModelConfig[] {
    return this.config.models.filter(m => m.enabled);
  }
  
  // 获取默认模型
  getDefaultModel(): ModelConfig | null {
    return this.config.models.find(m => m.isDefault && m.enabled) || 
           this.config.models.find(m => m.enabled) || 
           null;
  }
  
  // 添加模型
  addModel(model: ModelConfig) {
    this.config.models.push(model);
    if (model.enabled) {
      try {
        this.providers.set(model.id, createProvider(model));
      } catch (e) {
        console.warn(`Failed to create provider:`, e);
      }
    }
  }
  
  // 更新模型
  updateModel(modelId: string, updates: Partial<ModelConfig>) {
    const index = this.config.models.findIndex(m => m.id === modelId);
    if (index >= 0) {
      this.config.models[index] = { ...this.config.models[index], ...updates };
      
      // 更新提供商
      if (updates.enabled !== undefined || updates.apiKey || updates.baseUrl) {
        if (this.config.models[index].enabled) {
          try {
            this.providers.set(modelId, createProvider(this.config.models[index]));
          } catch (e) {
            console.warn(`Failed to update provider:`, e);
          }
        } else {
          this.providers.delete(modelId);
        }
      }
    }
  }
  
  // 删除模型
  removeModel(modelId: string) {
    this.config.models = this.config.models.filter(m => m.id !== modelId);
    this.providers.delete(modelId);
  }
  
  // 设置默认模型
  setDefaultModel(modelId: string) {
    this.config.models.forEach(m => {
      m.isDefault = m.id === modelId;
    });
  }
  
  // 测试模型连接
  async testModel(modelId: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    const model = this.config.models.find(m => m.id === modelId);
    if (!model) return { success: false, error: '模型不存在' };
    return testConnection(model);
  }
  
  // 获取云端提供商
  private getCloudProvider(preferredModelId?: string): CloudProvider | null {
    // 优先使用指定的模型
    if (preferredModelId) {
      const provider = this.providers.get(preferredModelId);
      if (provider) return provider;
    }
    
    // 使用默认模型
    const defaultModel = this.getDefaultModel();
    if (defaultModel) {
      const provider = this.providers.get(defaultModel.id);
      if (provider) return provider;
    }
    
    // 使用第一个可用的
    for (const provider of this.providers.values()) {
      return provider;
    }
    
    return null;
  }
  
  // 云端生成
  private async generateCloud(prompt: string, options?: GenerateOptions & { preferredModelId?: string; signal?: AbortSignal }): Promise<AIResult<string>> {
    console.log('[AI Cloud] Getting cloud provider...');
    console.log('[AI Cloud] preferredModelId:', options?.preferredModelId);
    console.log('[AI Cloud] Available providers:', Array.from(this.providers.keys()));

    const provider = this.getCloudProvider(options?.preferredModelId);

    if (!provider) {
      console.log('[AI Cloud] No provider available!');
      console.log('[AI Cloud] Config models:', this.config.models.map(m => ({ id: m.id, enabled: m.enabled, isDefault: m.isDefault })));
      return {
        success: false,
        error: '没有可用的云端模型，请先配置',
        source: 'cloud',
      };
    }

    console.log('[AI Cloud] Using provider, generating...');

    try {
      const result = await provider.generate(prompt, { ...options, signal: options?.signal });
      console.log('[AI Cloud] Generation successful, result length:', result?.length ?? 0);
      return {
        success: true,
        data: result,
        source: 'cloud',
      };
    } catch (error) {
      console.log('[AI Cloud] Generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
        source: 'cloud',
      };
    }
  }
  
  // ========== 功能方法 ==========
  
  // 情绪识别（本地）
  detectMood(content: string): MoodDetection {
    return this.localEngine.detectMood(content);
  }
  
  // 标签建议（本地）
  suggestTags(content: string, history: string[]): TagSuggestion[] {
    return this.localEngine.suggestTags(content, history);
  }
  
  // 内容扩展（本地）
  suggestContentExpansion(content: string): string[] {
    return this.localEngine.suggestContentExpansion(content);
  }
  
  // 脉络洞察（增强版，支持脉络感念）
  async generateTrailInsight(
    reflections: Array<{ content: string; mood: string }>,
    options?: { useCloud?: boolean; preferredModelId?: string; signal?: AbortSignal; trailNotes?: Array<{ content: string; source: string; guidedQuestion?: string }> }
  ): Promise<TrailInsight> {
    const localInsight = this.localEngine.generateTrailInsight(reflections);

    if (!options?.useCloud || this.config.mode === 'local') {
      return localInsight;
    }

    const noteSection = options.trailNotes && options.trailNotes.length > 0
      ? `\n\n脉络内的反思笔记：\n${options.trailNotes.map((n, i) =>
          `[反思${i + 1}${n.source === 'guided' ? '(引导式)' : '(自由)'}] ${n.guidedQuestion ? `引导问题：${n.guidedQuestion}\n` : ''}${n.content}`
        ).join('\n')}`
      : '';

    const prompt = `请分析以下思维脉络，提供洞察：

感念记录：
${reflections.map((r, i) => `${i + 1}. [${r.mood}] ${r.content}`).join('\n')}${noteSection}

请用中文提供：
1. 核心摘要（一句话）
2. 关键要点（2-3个）
3. 转折点
4. 建议`;

    const result = await this.generateCloud(prompt, {
      preferredModelId: options?.preferredModelId,
      signal: options?.signal,
      systemPrompt: '你是一个帮助用户分析思维脉络的助手。请深入分析感念和反思笔记中的情绪变化、思维模式和成长轨迹。',
    });

    if (result.success && result.data) {
      return this.parseTrailInsight(result.data, localInsight);
    }

    return localInsight;
  }

  // 脉络复盘思路
  async generateTrailReviewGuide(
    items: Array<{ content: string; mood?: string; timestamp: number; kind: 'reflection' | 'note' }>,
    options?: { useCloud?: boolean; preferredModelId?: string; signal?: AbortSignal }
  ): Promise<ReviewGuide> {
    const localGuide: ReviewGuide = {
      perspectives: [
        '从成长角度看，这段时间你经历了哪些变化？',
        '从挑战角度看，哪些困难推动了你的思考？',
        '从关系角度看，他人的影响如何塑造了你的认知？',
      ],
      observations: [`这条脉络包含 ${items.length} 条记录`],
      suggestions: [],
    };

    if (!options?.useCloud || this.config.mode === 'local') {
      return localGuide;
    }

    const prompt = `基于用户思维脉络的记录，从多个维度给出复盘思路和启示：

${items.map(r => {
  const date = new Date(r.timestamp).toLocaleDateString();
  const type = r.kind === 'note' ? '[反思]' : '[感念]';
  return `${date} ${type} ${r.mood ? `[${r.mood}]` : ''} ${r.content}`;
}).join('\n')}

请用中文提供：
1. 3-4个不同维度的复盘思路（如成长角度、挑战角度、关系角度、价值观角度等），每个思路用一句话点明该维度的思考方向
2. 2-3个观察发现（基于记录中的模式和变化）
3. 1-2个行动建议`;

    const result = await this.generateCloud(prompt, {
      preferredModelId: options?.preferredModelId,
      signal: options?.signal,
      systemPrompt: '你是一个善于多维度思考的复盘顾问，帮助用户从不同视角审视自己的思维脉络，发现深层的成长启示。',
    });

    if (result.success && result.data) {
      return this.parseReviewGuide(result.data, localGuide);
    }

    return localGuide;
  }
  
  private parseTrailInsight(aiResult: string, fallback: TrailInsight): TrailInsight {
    try {
      const lines = aiResult.split('\n').filter(l => l.trim());
      return {
        summary: lines[0] || fallback.summary,
        keyPoints: lines.filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '')).slice(0, 3),
        turningPoints: fallback.turningPoints,
        suggestions: fallback.suggestions,
      };
    } catch {
      return fallback;
    }
  }

  // 复盘引导
  async generateReviewGuide(
    weekReflections: Array<{ content: string; mood: string; timestamp: number }>,
    options?: { useCloud?: boolean; preferredModelId?: string }
  ): Promise<ReviewGuide> {
    const localGuide: ReviewGuide = {
      questions: ['这周整体感觉如何？', '有什么特别的时刻吗？', '下周想继续保持什么？'],
      observations: [`这周记录了 ${weekReflections.length} 条感念`],
      suggestions: [],
    };
    
    if (!options?.useCloud || this.config.mode === 'local') {
      return localGuide;
    }
    
    const prompt = `基于用户本周的感念记录，生成复盘引导：

${weekReflections.map(r => `[${new Date(r.timestamp).toLocaleDateString()}] ${r.content}`).join('\n')}

请用中文提供：
1. 3个引导性问题
2. 2-3个观察发现
3. 1-2个建议`;

    const result = await this.generateCloud(prompt, {
      preferredModelId: options?.preferredModelId,
      systemPrompt: '你是一个智慧的复盘引导者，用温暖、启发性的语言。',
    });
    
    if (result.success && result.data) {
      return this.parseReviewGuide(result.data, localGuide);
    }
    
    return localGuide;
  }
  
  private parseReviewGuide(aiResult: string, fallback: ReviewGuide): ReviewGuide {
    try {
      const lines = aiResult.split('\n').filter(l => l.trim());
      const perspectives = lines.filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '')).slice(0, 4);
      const observations = lines.filter(l => l.match(/^[-•]/)).map(l => l.replace(/^[-•]\s*/, '')).slice(0, 3);

      return {
        perspectives: perspectives.length > 0 ? perspectives : fallback.perspectives,
        observations: observations.length > 0 ? observations : fallback.observations,
        suggestions: fallback.suggestions,
      };
    } catch {
      return fallback;
    }
  }
  
  // 打卡复盘AI生成
  async generateCheckinReview(
    reviewData: Omit<CheckinReview, 'id' | 'updatedAt' | 'deleted' | 'aiSummary' | 'highlights' | 'improvements'>,
    options?: { useCloud?: boolean; preferredModelId?: string }
  ): Promise<{ summary: string; highlights: string[]; improvements: string[] }> {
    const defaultResult = {
      summary: '本周整体表现良好，继续保持。',
      highlights: ['坚持打卡'],
      improvements: ['继续保持'],
    };
    
    console.log('[AI Review] Starting generateCheckinReview...');
    console.log('[AI Review] useCloud:', options?.useCloud);
    console.log('[AI Review] config.mode:', this.config.mode);
    console.log('[AI Review] enabledModels:', this.getEnabledModels().length);
    console.log('[AI Review] defaultModel:', this.getDefaultModel()?.id ?? 'none');
    
    if (!options?.useCloud || this.config.mode === 'local') {
      console.log('[AI Review] Skipping cloud AI (useCloud=false or mode=local)');
      return defaultResult;
    }
    
    const prompt = buildReviewPrompt(reviewData);
    console.log('[AI Review] Prompt length:', prompt.length);
    
    const result = await this.generateCloud(prompt, {
      preferredModelId: options?.preferredModelId,
      systemPrompt: '你是一位专业的个人成长分析师，同时具备温暖的鼓励能力。你的分析基于数据，既有专业深度，又能给予建设性的鼓励。请用中文回答。',
    });
    
    console.log('[AI Review] Cloud result:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.log('[AI Review] Error:', result.error);
    }
    
    if (result.success && result.data) {
      const parsed = parseReviewAIResponse(result.data);
      console.log('[AI Review] Parsed summary length:', parsed.summary.length);
      return parsed;
    }
    
    console.log('[AI Review] Using default result');
    return defaultResult;
  }
}

// 单例
let instance: AIService | null = null;

export function getAIService(config?: Partial<AIConfig>): AIService {
  if (!instance) {
    instance = new AIService(config);
  } else if (config) {
    // 更新现有实例的配置
    instance.updateConfig(config);
  }
  return instance;
}

export function resetAIService() {
  instance = null;
}
