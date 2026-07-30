# PRD: 端侧 AI 推理

## 背景
当前 AI 推理主要依赖云端 API（OpenAI/Claude），延迟高（600-3100ms）、成本高、无法离线使用。

## 目标
- 端侧推理延迟 <50ms（↓80%）
- 支持离线使用
- 零 API 成本
- 模型可 OTA 更新

## 需求

### 1. 模型量化
- **输入**: PyTorch 模型（冥想建议、情感分析、习惯推荐）
- **输出**: ONNX（Android）/ Core ML（iOS）量化模型（~50MB）
- **工具**: PyTorch → ONNX 转换器、coremltools

### 2. 运行时集成
- **Android**: ONNX Runtime Mobile
- **iOS**: Core ML（原生支持）
- **接口**: 统一 `LocalAIEngine` 接口

### 3. 模型 OTA 更新
- **机制**: 从 PocketBase 下载新模型
- **版本管理**: 模型版本号 + 校验和
- **回滚**: 失败时回退到旧模型

### 4. 云端降级
- **策略**: 端侧失败时降级到云端
- **透明**: 用户无感知

## 验收标准
- [ ] 冥想建议模型量化完成（ONNX + Core ML）
- [ ] LocalAIEngine 接口实现
- [ ] 端侧推理延迟 <50ms
- [ ] 离线可用（无网络时正常工作）
- [ ] 模型 OTA 更新机制
- [ ] 云端降级机制
- [ ] 全量测试通过（1832+）

## 影响范围
- 新增: `packages/core/src/ai/local-engine/`
- 新增: `apps/mobile/src/ai/`
- 修改: `packages/core/src/ai/ai-service.ts`（添加降级逻辑）
- 不影响: 现有云端 AI 功能

## 工作量
- 模型量化：1 周
- 运行时集成：1 周
- OTA 更新：1 周
- 测试 + 优化：1 周
- **总计：3-4 周**

## 回滚点
端侧 AI 失败时自动降级到云端，无破坏性影响
