// ─── AI 结果类型 ──────────────────────────────────────────────
export interface AIResult {
  text: string;
  confidence: number;
  latencyMs: number;
  modelVersion: string;
}

// ─── Cloud AI Engine 接口 ─────────────────────────────────────
// 云端推理引擎统一接口
export interface CloudAIEngine {
  initialize(): Promise<void>;
  predict(input: string): Promise<AIResult>;
}

// ─── Local AI Engine 接口 ──────────────────────────────────────
// 端侧推理引擎统一接口（ONNX/Core ML 共享）
export interface LocalAIEngine {
  readonly modelName: string;
  readonly modelVersion: string;

  initialize(): Promise<boolean>;
  isReady(): boolean;

  predict(input: string): Promise<AIResult>;
  batchPredict(inputs: string[]): Promise<AIResult[]>;

  // 模型管理
  checkForUpdate(): Promise<string | null>;
  downloadModel(version: string): Promise<boolean>;
  rollback(): Promise<void>;
}

// ── 工厂函数 ──
export async function createLocalEngine(modelName: string): Promise<LocalAIEngine | null> {
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') {
      const { OnnxEngine } = require('./onnx-engine');
      return new OnnxEngine(modelName);
    } else if (Platform.OS === 'ios') {
      const { CoreMLEngine } = require('./coreml-engine');
      return new CoreMLEngine(modelName);
    }
  } catch {
    return null;
  }
  return null;
}
