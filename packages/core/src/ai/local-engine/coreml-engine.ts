// ─── CoreMLEngine（iOS）──────────────────────────────────────────
// 占位实现：待模型量化后替换为真实 Core ML 调用

import { LocalAIEngine, AIResult } from './types';

export class CoreMLEngine implements LocalAIEngine {
  readonly modelName: string;
  readonly modelVersion: string = '0.0.0-placeholder';
  private ready: boolean = false;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async initialize(): Promise<boolean> {
    // TODO: 加载 Core ML 模型
    console.log(`[CoreMLEngine] Placeholder init for ${this.modelName}`);
    this.ready = false;
    return this.ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  async predict(input: string): Promise<AIResult> {
    throw new Error('CoreMLEngine not implemented - model not quantized yet');
  }

  async batchPredict(inputs: string[]): Promise<AIResult[]> {
    throw new Error('CoreMLEngine not implemented - model not quantized yet');
  }

  async checkForUpdate(): Promise<string | null> {
    return null;
  }

  async downloadModel(version: string): Promise<boolean> {
    return false;
  }

  async rollback(): Promise<void> {}
}
