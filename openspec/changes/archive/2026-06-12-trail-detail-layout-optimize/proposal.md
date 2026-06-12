## Why

思维脉络详情页刚完成功能扩展（AI洞察、复盘引导、脉络感念、计划任务、相关脉络），但布局仍是简单的垂直堆叠，导致：
- 核心内容（时间线）被推到下方，用户要滚动很久才能看到
- AI 区域空状态占大量空间，有内容时也缺乏视觉层级
- 添加入口（三个按钮）打断阅读流
- 底部区域（关联计划、相关脉络）容易被忽略
- 概览卡片存在数据未加载的 bug（`pullServerData` 缺少 `trailNote` 拉取）

## What Changes

### Bug 修复
- 修复 `createAuthSlice.ts` 的 `pullServerData` 方法，补充 `trailNote` 数据拉取

### 布局重构
- **概览压缩**：从独立卡片改为 header 下方的一行统计条
- **时间线置顶**：核心内容移到最前面
- **添加入口整合**：三个按钮合并为一个浮动操作按钮（FAB），弹出菜单选择
- **AI 区域可折叠**：洞察和复盘引导默认收起，有内容时可展开查看
- **底部区域紧凑化**：关联计划和相关脉络使用更紧凑的卡片样式
- **视觉层级优化**：通过间距、背景色、字体权重区分主次

### 交互优化
- FAB 点击弹出三个选项：写感念、选已有、写反思
- AI 区域收起时显示摘要预览（如有内容）
- 时间线标题与概览合并，减少冗余

## Capabilities

### New Capabilities
- `trail-detail-layout`: 脉络详情页布局重构，包含概览压缩、时间线置顶、FAB 添加入口、AI 可折叠区域、底部紧凑化

### Modified Capabilities

## Impact

- **平台**: Mobile（`apps/mobile`）
- **文件变更**:
  - `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 主页面重构
  - `apps/mobile/src/features/reflections/TrailOverviewCard.tsx` — 改为紧凑模式
  - `apps/mobile/src/features/reflections/InsightSection.tsx` — 支持折叠
  - `apps/mobile/src/features/reflections/ReviewGuideSection.tsx` — 支持折叠
  - `apps/mobile/src/features/reflections/AddReflectionBar.tsx` — 改为 FAB 菜单
  - `apps/mobile/src/features/reflections/PlanTasksSection.tsx` — 紧凑样式
  - `apps/mobile/src/features/reflections/RelatedTrailsSection.tsx` — 紧凑样式
  - `packages/core/src/store/createAuthSlice.ts` — 修复 pullServerData
- **非目标**: 不改变功能逻辑，不改变数据模型，不涉及 Web 端
