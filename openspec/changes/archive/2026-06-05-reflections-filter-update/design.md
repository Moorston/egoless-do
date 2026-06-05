## Context

感念筛选系统通过 `ReflectionFilters` 接口定义筛选条件，`filterReflections()` 纯函数执行过滤。Mobile 端通过 `FilterDrawer.tsx` 底部弹窗提供筛选入口，Web 端通过内联按钮。当前筛选条件包括：标签、心情、搜索、日期范围、有链接、已置顶。

## Goals / Non-Goals

**Goals:**
- 移除 `isPinned` 筛选条件及相关 UI
- 新增 `hasLinkedTask` 筛选条件，筛选已关联计划任务的感念
- 筛选逻辑验证 linkedPlanItemId 对应的 planItem 未删除
- 仅 Mobile 端实现

**Non-Goals:**
- 不移除 `MindReflection.isPinned` 字段或置顶 UI 功能
- 不在 Web 端添加筛选入口
- 不改变 `hasLink` 筛选（保留）

## Decisions

### 1. hasLinkedTask 筛选需要 join planItems

**选择**：`filterReflections()` 纯函数新增 `planItems` 可选参数，`hasLinkedTask` 为 true 时查找对应 planItem 是否存在且未删除。

**理由**：`MindReflection` 只存储 `linkedPlanItemId`，无法仅凭自身判断关联的 planItem 是否有效。将 `planItems` 作为参数传入纯函数，保持函数无副作用。

**替代方案**：在 `useReflections` hook 中做二次过滤 — 可行但破坏了单一过滤入口的设计。

### 2. FilterDrawer 中"关联任务"替换"已置顶"位置

**选择**：在 FilterDrawer 的"更多筛选"区域，用"关联任务"按钮替换"已置顶"按钮，保持布局不变。

**理由**：最小化 UI 变更，用户不会注意到位置变化。

## Risks / Trade-offs

- **[风险] planItems 未加载时筛选不准**：如果 store 中 planItems 尚未加载完成，hasLinkedTask 筛选可能误判。→ 缓解：planItems 与 reflections 同属 zustand store，hydration 同步完成。
- **[权衡] 纯函数新增参数**：`filterReflections` 新增 `planItems?` 参数，函数签名变化。→ 影响范围小，仅 `useReflections` hook 调用。
