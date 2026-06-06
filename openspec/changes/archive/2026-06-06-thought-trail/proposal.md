## Why

感念页面记录了用户的想法和感触，但目前缺乏将相似想法关联起来的机制。用户无法追踪一个问题的解决过程，也无法回顾某个主题的心路历程。新增"思维脉络"功能，让用户能够将相关感念串联起来，形成完整的思路脉络。

## What Changes

**新增功能：**
- **思路脉络**：用户手动创建的感念关联链，支持排序，有明确的因果/演进关系
- **标签脉络**：基于标签自动聚合的感念分组，无序，适合回顾某个主题的所有想法
- **思维脉络页面**：独立页面，包含"思路脉络"和"标签脉络"两个视图
- **两种创建方式**：从感念详情页创建 + 从思维脉络页面创建
- **自动命名**：初始命名由标签/内容生成，用户可修改

**非目标：**
- 不支持 AI 语义相似度（未来功能）
- 不支持时间线视图（现有感念页已支持）
- 不支持 Web 端（仅移动端）

## Capabilities

### New Capabilities
- `thought-trail`: 思路脉络功能，包括数据模型、创建/编辑/删除、关联感念
- `mind-trail-page`: 思维脉络页面，包括思路脉络视图和标签脉络视图

### Modified Capabilities
- `reflection`: 感念数据模型新增 thoughtTrailIds 字段，支持关联到思路脉络

## Impact

**移动端：**
- `packages/core/src/types/` - 新增 ThoughtTrail 类型
- `packages/core/src/types/reflection.ts` - MindReflection 新增字段
- `packages/core/src/store/` - 新增 thoughtTrails 状态和操作
- `apps/mobile/src/features/reflections/` - 新增思维脉络页面和组件
- `apps/mobile/src/navigation/` - 新增路由

**依赖：**
- 无新增外部依赖
