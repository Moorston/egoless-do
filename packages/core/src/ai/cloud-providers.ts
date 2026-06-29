// ─── Cloud AI Providers ────────────────────────────────────────
import type { ModelConfig, GenerateOptions } from './types';
import { createLogger } from '../logger';

const log = createLogger('AI');

export interface CloudProvider {
  name: string;
  generate(prompt: string, options?: GenerateOptions & { signal?: AbortSignal }): Promise<string>;
}

// 通用 OpenAI 兼容提供商
export class OpenAICompatibleProvider implements CloudProvider {
  constructor(private config: ModelConfig) {}

  get name() { return this.config.name; }

  async generate(prompt: string, options?: GenerateOptions & { signal?: AbortSignal }): Promise<string> {
    const { apiKey, baseUrl, model, maxTokens, temperature } = this.config;

    // 本地模型（如Ollama）不需要API Key
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    if (!apiKey && !isLocal) {
      throw new Error('请先配置API Key');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        model,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens ?? maxTokens,
        temperature: options?.temperature ?? temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API错误: ${response.status} - ${error}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`API返回非JSON响应 (status: ${response.status})`);
    }
    const msg = data.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning_content;
    log.debug('[CloudProvider] Response choices:', data.choices?.length, 'content:', content?.slice(0, 50), 'finish_reason:', data.choices?.[0]?.finish_reason);
    if (!content) {
      throw new Error(`API返回空内容，响应: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return content;
  }
}

// 提供商工厂（现在统一使用 OpenAI 兼容格式）
export function createProvider(config: ModelConfig): CloudProvider {
  return new OpenAICompatibleProvider(config);
}

// 测试连接
export async function testConnection(config: ModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  try {
    const provider = createProvider(config);
    await provider.generate('你好', { maxTokens: 10 });
    return { 
      success: true, 
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '连接失败',
      latency: Date.now() - startTime,
    };
  }
}
