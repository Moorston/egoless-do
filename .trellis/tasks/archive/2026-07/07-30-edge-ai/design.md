# Design: 端侧 AI 推理

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Mobile App                                                             │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  AI Service Layer                                                 │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │  │
│  │  │  LocalAIEngine  │   │  CloudAIEngine  │   │  HybridEngine │  │  │
│  │  │  (端侧)         │   │  (云端)         │   │  (混合)       │  │  │
│  │  └────────┬────────┘   └────────┬────────┘   └───────┬───────┘  │  │
│  │           │                     │                    │          │  │
│  │           └─────────────────────┼────────────────────┘          │  │
│  │                                 │                               │  │
│  │                                 ▼                               │  │
│  │                    ┌─────────────────────────┐                  │  │
│  │                    │  Model Manager          │                  │  │
│  │                    │  - 模型加载             │                  │  │
│  │                    │  - 模型缓存             │                  │  │
│  │                    │  - OTA 更新             │                  │  │
│  │                    └─────────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    │ 模型文件                           │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Model Storage                                                    │  │
│  │  - /models/meditation-suggestion.onnx (Android)                   │  │
│  │  - /models/meditation-suggestion.mlpackage (iOS)                  │  │
│  │  - /models/emotion-analysis.onnx                                  │  │
│  │  - /models/habit-recommendation.onnx                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1. LocalAIEngine 接口

```typescript
// packages/core/src/ai/local-engine/types.ts
export interface LocalAIEngine {
  readonly modelName: string;
  readonly modelVersion: string;
  
  initialize(): Promise<boolean>;
  isReady(): boolean;
  
  predict(input: string): Promise<AIResult>;
  batchPredict(inputs: string[]): Promise<AIResult[]>;
  
  // 模型管理
  checkForUpdate(): Promise<string | null>;  // 返回新版本号，null 表示无更新
  downloadModel(version: string): Promise<boolean>;
  rollback(): Promise<void>;
}

export interface AIResult {
  text: string;
  confidence: number;
  latencyMs: number;
  modelVersion: string;
}
```

## 2. 模型量化流程

```
PyTorch Model (.pt)
    │
    ▼
ONNX Export (onnx.export)
    │
    ▼
Quantization (INT8)
    │
    ├──→ ONNX Runtime Mobile (Android)
    └──→ Core ML (iOS, via coremltools)
```

### 量化脚本

```python
# scripts/quantize-model.py
import torch
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# 1. 加载 PyTorch 模型
model = torch.load("model.pth")
model.eval()

# 2. 导出 ONNX
dummy_input = torch.randn(1, 512)
torch.onnx.export(model, dummy_input, "model.onnx", opset_version=13)

# 3. 动态量化（INT8）
quantize_dynamic(
    model_input="model.onnx",
    model_output="model.quantized.onnx",
    weight_type=QuantType.QUInt8,
)

# 4. 转换为 Core ML（iOS）
import coremltools as ct
mlmodel = ct.converters.onnx.convert(model="model.quantized.onnx")
mlmodel.save("model.mlpackage")
```

## 3. ONNX Runtime Mobile 集成（Android）

```typescript
// apps/mobile/src/ai/onnx-engine.ts
import { LocalAIEngine, AIResult } from '@egoless-do/core/ai/local-engine';

export class OnnxEngine implements LocalAIEngine {
  private session: any = null;
  
  async initialize(): Promise<boolean> {
    try {
      // 动态导入（避免 Expo Go 崩溃）
      const ort = await import('onnxruntime-react-native');
      this.session = await ort.InferenceSession.create('/models/model.quantized.onnx');
      return true;
    } catch (err) {
      console.warn('[OnnxEngine] Init failed:', err);
      return false;
    }
  }
  
  async predict(input: string): Promise<AIResult> {
    const t0 = performance.now();
    
    // 预处理
    const inputTensor = this.preprocess(input);
    
    // 推理
    const results = await this.session.run({ input: inputTensor });
    
    // 后处理
    const text = this.postprocess(results);
    
    return {
      text,
      confidence: 0.85,
      latencyMs: performance.now() - t0,
      modelVersion: this.modelVersion,
    };
  }
  
  private preprocess(input: string): any {
    // Tokenization + padding
    // 简化示例
    return new Float32Array(512).fill(0);
  }
  
  private postprocess(results: any): string {
    // 解码输出
    return '冥想建议：今晚尝试 10 分钟呼吸练习';
  }
}
```

## 4. Core ML 集成（iOS）

```typescript
// apps/mobile/src/ai/coreml-engine.ts
import { LocalAIEngine, AIResult } from '@egoless-do/core/ai/local-engine';

export class CoreMLEngine implements LocalAIEngine {
  private model: any = null;
  
  async initialize(): Promise<boolean> {
    try {
      // iOS 原生 Core ML（通过 Expo Modules 或原生桥接）
      const { NativeModules } = require('react-native');
      this.model = NativeModules.CoreMLPredictor;
      await this.model.loadModel('meditation-suggestion');
      return true;
    } catch (err) {
      console.warn('[CoreMLEngine] Init failed:', err);
      return false;
    }
  }
  
  async predict(input: string): Promise<AIResult> {
    const t0 = performance.now();
    const result = await this.model.predict(input);
    return {
      text: result.text,
      confidence: result.confidence,
      latencyMs: performance.now() - t0,
      modelVersion: this.modelVersion,
    };
  }
}
```

## 5. 混合引擎（端侧 + 云端降级）

```typescript
// packages/core/src/ai/hybrid-engine.ts
export class HybridEngine {
  private localEngine: LocalAIEngine | null = null;
  private cloudEngine: CloudAIEngine;
  
  async initialize(): Promise<void> {
    // 1. 尝试初始化端侧引擎
    this.localEngine = await this.createLocalEngine();
    const localReady = await this.localEngine?.initialize();
    
    if (!localReady) {
      console.log('[HybridEngine] Local AI unavailable, using cloud only');
      this.localEngine = null;
    }
    
    // 2. 初始化云端引擎（始终可用）
    this.cloudEngine = new CloudAIEngine();
  }
  
  async predict(input: string): Promise<AIResult> {
    // 1. 优先使用端侧（低延迟）
    if (this.localEngine?.isReady()) {
      try {
        const result = await this.localEngine.predict(input);
        if (result.confidence > 0.7) {
          return result;  // 端侧结果可信
        }
      } catch (err) {
        console.warn('[HybridEngine] Local predict failed, falling back to cloud');
      }
    }
    
    // 2. 降级到云端
    return this.cloudEngine.predict(input);
  }
  
  private async createLocalEngine(): Promise<LocalAIEngine | null> {
    try {
      if (Platform.OS === 'android') {
        const { OnnxEngine } = await import('../../../mobile/src/ai/onnx-engine');
        return new OnnxEngine();
      } else if (Platform.OS === 'ios') {
        const { CoreMLEngine } = await import('../../../mobile/src/ai/coreml-engine');
        return new CoreMLEngine();
      }
    } catch {
      return null;
    }
  }
}
```

## 6. 模型 OTA 更新

```typescript
// packages/core/src/ai/model-manager.ts
export class ModelManager {
  private currentVersion: string = '1.0.0';
  
  async checkForUpdate(): Promise<string | null> {
    const latest = await pb.collection('models').getList(1, 1, {
      sort: '-version',
      filter: 'active=true',
    });
    
    if (latest.items.length === 0) return null;
    
    const latestVersion = latest.items[0].version;
    return latestVersion > this.currentVersion ? latestVersion : null;
  }
  
  async downloadModel(version: string): Promise<boolean> {
    try {
      // 1. 下载模型文件
      const model = await pb.collection('models').getOne(version);
      const url = pb.files.getUrl(model, model.file);
      const response = await fetch(url);
      const blob = await response.blob();
      
      // 2. 保存到本地
      const path = `/models/${model.name}.onnx`;
      await writeFile(path, blob);
      
      // 3. 验证校验和
      const checksum = await calculateChecksum(path);
      if (checksum !== model.checksum) {
        throw new Error('Checksum mismatch');
      }
      
      // 4. 更新版本
      this.currentVersion = version;
      return true;
    } catch (err) {
      console.error('[ModelManager] Download failed:', err);
      return false;
    }
  }
}
```

## 执行计划

### Week 1（模型量化）
- Day 1-2: 准备训练数据 + 微调小型模型（Qwen-0.5B）
- Day 3-4: 导出 ONNX + 量化（INT8）
- Day 5: 转换为 Core ML

### Week 2（运行时集成）
- Day 1-2: ONNX Runtime Mobile 集成（Android）
- Day 3-4: Core ML 集成（iOS）
- Day 5: HybridEngine 实现

### Week 3（OTA + 降级）
- Day 1-2: ModelManager 实现
- Day 3-4: 云端降级逻辑
- Day 5: 端到端测试

### Week 4（测试 + 优化）
- Day 1-2: 性能基准测试
- Day 3-4: 内存优化
- Day 5: 文档 + 发布

## 验证

```bash
npx vitest run  # 1832+ 测试通过
# 真机测试：端侧推理 <50ms
```

## 风险

| 风险 | 缓解 |
|------|------|
| 模型质量下降 | 量化后评估 + 云端降级 |
| 包体积膨胀 | 按需下载 + 压缩 |
| 设备兼容性 | 分级支持（高端机端侧，低端机云端）|
| OTA 失败 | 校验和 + 回滚机制 |
