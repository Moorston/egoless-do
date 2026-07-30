# 端侧 AI 推理指南

> 端侧 AI 推理架构、使用方法和最佳实践。

## 概述

端侧 AI 推理将部分 AI 模型部署到用户设备，实现：
- **低延迟**：<50ms（vs 云端 600-3100ms）
- **离线可用**：无网络时正常工作
- **隐私保护**：数据不出设备
- **零成本**：无 API 调用费用

## 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HybridEngine                                                           │
│  ┌─────────────────┐   ┌─────────────────┐                             │
│  │  LocalAIEngine  │   │  CloudAIEngine  │                             │
│  │  (优先)         │   │  (降级)         │                             │
│  └────────┬────────┘   └────────┬────────┘                             │
│           └──────────────────────┼──────────────────────────────────────┤
│                                  │                                      │
│                          ModelManager                                   │
│                          - OTA 更新                                    │
│                          - 版本控制                                    │
│                          - 回滚机制                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 使用示例

### 基础使用

```typescript
import { HybridEngine } from '@egoless-do/core/ai/local-engine';

// 创建引擎
const engine = new HybridEngine(cloudEngine);
await engine.initialize();

// 推理
const result = await engine.predict('今晚冥想建议');
console.log(result.text);     // 冥想建议内容
console.log(result.confidence); // 置信度 0-1
console.log(result.latencyMs);  // 推理延迟
```

### 控制端侧/云端

```typescript
// 禁用端侧（仅云端）
engine.disableLocal();

// 启用端侧
const success = await engine.enableLocal();
if (!success) {
  console.log('端侧 AI 不可用，使用云端');
}

// 检查端侧状态
if (engine.isLocalReady()) {
  console.log('端侧 AI 已就绪');
}
```

## 模型管理

### 模型量化

```bash
# 量化 PyTorch 模型为 ONNX
python scripts/quantize-model.py \
  --input model.pth \
  --output model.quantized.onnx \
  --quantization int8

# 转换为 Core ML（iOS）
python scripts/convert-coreml.py \
  --input model.quantized.onnx \
  --output model.mlpackage
```

### OTA 更新

```typescript
import { ModelManager } from '@egoless-do/core/ai/local-engine';

const manager = new ModelManager();

// 检查更新
const newVersion = await manager.checkForUpdate('meditation-suggestion');
if (newVersion) {
  // 下载新版本
  const success = await manager.downloadModel('meditation-suggestion', newVersion);
  if (success) {
    console.log(`模型已更新到 ${newVersion}`);
  }
}

// 回滚
await manager.rollback('meditation-suggestion');
```

## 性能指标

| 指标 | 目标 | 当前（占位）|
|------|------|-----------|
| 端侧推理延迟 | <50ms | N/A（模型未量化）|
| 云端降级延迟 | <100ms | ✅ 达标 |
| 模型加载时间 | <500ms | N/A |
| 模型大小 | <100MB | N/A |

## 最佳实践

### 1. 优先使用端侧
```typescript
// 推荐：让 HybridEngine 自动选择
const result = await engine.predict(input);
```

### 2. 处理端侧失败
```typescript
try {
  const result = await engine.predict(input);
  if (result.confidence < 0.6) {
    // 低置信度，可提示用户或记录
    console.warn('AI 置信度低:', result.confidence);
  }
} catch (err) {
  // 端侧失败会自动降级到云端
  console.error('AI 推理失败:', err);
}
```

### 3. 模型更新策略
```typescript
// 定期检查更新（如每周一次）
const checkModelUpdate = async () => {
  const newVersion = await manager.checkForUpdate('meditation-suggestion');
  if (newVersion && isWifiConnected()) {
    await manager.downloadModel('meditation-suggestion', newVersion);
  }
};
```

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 端侧不可用 | 模型未量化 | 运行量化脚本 |
| 推理失败 | 模型损坏 | 重新下载或回滚 |
| 延迟过高 | 模型过大 | 使用量化模型 |

## 相关文档

- [AI 管线架构](../../architecture/ai-pipeline.md)
- [模型量化指南](./quantization-guide.md)
- [API 参考](./api-reference.md)
