## Why

从思维脉络创建的计划任务，其 `link` 字段被设为 `'manual'`，导致：
1. 计划详情页的任务列表中看不到任务来源（LinkBadge 不显示）
2. 计划详情页的"关联脉络"通过感念间接查找，直接通过 `item.trailId` 关联的脉络可能找不到
3. 用户无法区分哪些任务是从脉络创建的、哪些是手动创建的

需要将脉络作为一等链接类型，与感念（reflection）对齐。

## What Changes

- `PlanItemLink` 类型新增 `'trail'`
- `LINK_COLORS` 新增 `trail` 颜色
- `createPlanItem` 中 trail 来源设 `link: 'trail'` 而非 `'manual'`
- `PlanDetailContent.relatedTrails` 优先用 `item.trailId` 直接查找，不再只依赖感念间接关联
- `LinkBadge` 自动显示脉络标签（已有逻辑，只需 link 类型正确）
- i18n 新增 `planLinkTrail` 文案
- 脉络详情页的计划任务卡片（`PlanTaskCard`）点击跳转到计划详情 ✅ 已有

**非目标：**
- 不修改 `LINK_OPTIONS`（用户手动选择的联动模块列表），trail 类型仅在自动创建时设置
- 不修改 `CreatePlanFromTrailModal` 的表单结构

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

- `plan`: PlanItemLink 类型扩展，计划详情页关联脉络查找逻辑优化

## Impact

- **平台**: mobile（核心交互），core（类型和业务逻辑）
- **文件**:
  - `packages/core/src/types/plan.ts` — PlanItemLink 类型
  - `packages/core/src/constants.ts` — LINK_COLORS
  - `packages/core/src/business/plan.ts` — createPlanItem 逻辑
  - `packages/core/src/i18n/zh.ts`, `zh-Hant.ts`, `en.ts`, `types.ts` — i18n
  - `apps/mobile/src/features/plan/PlanDetailContent.tsx` — relatedTrails 计算
- **数据兼容**: 已有的 `link='manual'` 的脉络任务不会自动迁移，仅影响新创建的任务
