// ─── OnnxEngine（Android）────────────────────────────────────────
// 占位实现：待模型量化后替换为真实 ONNX Runtime 调用

import { LocalAIEngine, AIResult } from './types';

export class OnnxEngine implements LocalAIEngine {
  readonly modelName: string;
  readonly modelVersion: string = '0.0.0-placeholder';
  private ready: boolean = false;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async initialize(): Promise<boolean> {
    // TODO: 加载 ONNX 模型
    console.log(`[OnnxEngine] Placeholder init for ${this.modelName}`);
    this.ready = false; // 模型未量化前不可用
    return this.ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  async predict(input: string): Promise<AIResult> {
    throw new Error('OnnxEngine not implemented - model not quantized yet');
  }

  async batchPredict(inputs: string[]): Promise<AIResult[]> {
    throw new Error('OnnxEngine not implemented - model not quantized yet');
  }

  async checkForUpdate(): Promise<string | null> {
    return null;
  }

  async downloadModel(version: string): Promise<boolean> {
    return false;
  }

  async rollback(): Promise<void> {}
}
