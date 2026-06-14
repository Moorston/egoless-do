## Context

当前 `PlanItemLink` 类型为 `'manual' | 'checkin' | 'fasting' | 'meditation' | 'exercise' | 'habit' | 'reflection'`。从脉络创建计划任务时，`createPlanItem` 将 link 设为 `'manual'`，丢失了来源信息。

PlanItem 数据模型已有 `trailId?: string` 字段，但 link 类型没有对应的 `'trail'` 值。

## Goals / Non-Goals

**Goals:**
- 脉络创建的计划任务 link 类型为 `'trail'`，可在 LinkBadge 中正确显示
- 计划详情页通过 `item.trailId` 直接查找关联脉络，不依赖感念间接关联

**Non-Goals:**
- 不在 LINK_OPTIONS 中添加 trail（用户手动创建任务时不选择此类型，仅自动创建时设置）
- 不迁移已有的 `link='manual'` 的脉络任务数据

## Decisions

1. **`PlanItemLink` 新增 `'trail'`**
   - 类型定义修改，同步 `LINK_COLORS` 和 i18n

2. **`LINK_COLORS` 中 trail 使用紫色 `#8B5CF6`**
   - 与现有颜色不冲突，紫色代表思维/脉络

3. **`createPlanItem` 中 trail 来源设 `link: 'trail'`**
   - 修改 `packages/core/src/business/plan.ts` 的 `createPlanItem` 函数

4. **`PlanDetailContent.relatedTrails` 优化查找逻辑**
   - 优先通过 `item.trailId` 直接查找
   - 保留感念间接查找作为补充（兼容 reflection 来源的任务）

5. **`PlanTaskCard` 点击跳转已有实现**
   - `onPress={() => onNavigateToPlan(item.id)}` 跳转到 PlanDetail

## Risks / Trade-offs

- **数据兼容**: 已有脉络任务 link='manual' 不会自动变为 'trail'，旧数据显示不受影响（LinkBadge 对 manual 返回 null）
- **LINK_OPTIONS 不含 trail**: 用户在编辑页手动修改 link 类型时看不到 trail 选项，这是预期行为（trail 仅自动设置）
