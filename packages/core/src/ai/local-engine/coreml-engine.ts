// ─── CoreMLEngine（iOS）──────────────────────────────────────────
// 占位实现：待模型量化后替换为真实 Core ML 调用

import { createLogger } from '../../logger';

import { LocalAIEngine, AIResult } from './types';

const logger = createLogger('CoreMLEngine');

export class CoreMLEngine implements LocalAIEngine {
  readonly modelName: string;
  readonly modelVersion: string = '0.0.0-placeholder';
  private ready: boolean = false;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async initialize(): Promise<boolean> {
    // TODO: 加载 Core ML 模型
    logger.info(`Placeholder init for ${this.modelName}`);
    this.ready = false;
    return this.ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  async predict(_input: string): Promise<AIResult> {
    throw new Error('CoreMLEngine not implemented - model not quantized yet');
  }

  async batchPredict(_inputs: string[]): Promise<AIResult[]> {
    throw new Error('CoreMLEngine not implemented - model not quantized yet');
  }

  async checkForUpdate(): Promise<string | null> {
    return null;
  }

  async downloadModel(_version: string): Promise<boolean> {
    return false;
  }

  async rollback(): Promise<void> {}
}
