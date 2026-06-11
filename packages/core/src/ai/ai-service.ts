// ─── AI Service ────────────────────────────────────────────────
import type {
  AIConfig, AIResult, ModelConfig, AIMode,
  TagSuggestion, MoodDetection, TrailInsight,
  ReviewGuide, GenerateOptions
} from './types';
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
  private async generateCloud(prompt: string, options?: GenerateOptions & { preferredModelId?: string }): Promise<AIResult<string>> {
    const provider = this.getCloudProvider(options?.preferredModelId);
    
    if (!provider) {
      return {
        success: false,
        error: '没有可用的云端模型，请先配置',
        source: 'cloud',
      };
    }
    
    try {
      const result = await provider.generate(prompt, options);
      return {
        success: true,
        data: result,
        source: 'cloud',
      };
    } catch (error) {
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
  
  // 脉络洞察
  async generateTrailInsight(
    reflections: Array<{ content: string; mood: string }>,
    options?: { useCloud?: boolean; preferredModelId?: string }
  ): Promise<TrailInsight> {
    const localInsight = this.localEngine.generateTrailInsight(reflections);
    
    if (!options?.useCloud || this.config.mode === 'local') {
      return localInsight;
    }
    
    const prompt = `请分析以下思维脉络，提供洞察：

${reflections.map((r, i) => `${i + 1}. [${r.mood}] ${r.content}`).join('\n')}

请用中文提供：
1. 核心摘要（一句话）
2. 关键要点（2-3个）
3. 转折点
4. 建议`;

    const result = await this.generateCloud(prompt, {
      preferredModelId: options?.preferredModelId,
      systemPrompt: '你是一个帮助用户分析思维脉络的助手。',
    });
    
    if (result.success && result.data) {
      return this.parseTrailInsight(result.data, localInsight);
    }
    
    return localInsight;
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
      const questions = lines.filter(l => l.includes('？')).slice(0, 3);
      const observations = lines.filter(l => l.match(/^\d+\./)).slice(0, 3);
      
      return {
        questions: questions.length > 0 ? questions : fallback.questions,
        observations: observations.length > 0 ? observations : fallback.observations,
        suggestions: fallback.suggestions,
      };
    } catch {
      return fallback;
    }
  }
}

// 单例
let instance: AIService | null = null;

export function getAIService(config?: Partial<AIConfig>): AIService {
  if (!instance) {
    instance = new AIService(config);
  }
  return instance;
}

export function resetAIService() {
  instance = null;
}
