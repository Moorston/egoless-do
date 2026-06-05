## Context

`ReflectionStatsScreen.tsx` 是独立全屏页面，包含 4 个 Tab（趋势/热力图/心情/标签），所有数据通过 `useMemo` 从 `store.reflections` 直接计算。Tab 切换用本地 `useState<TabKey>` 控制。

## Goals / Non-Goals

**Goals:**
- Tab 重排序为 标签→心情→关联任务→趋势→热力图
- 默认 Tab 改为 `'tags'`
- 新增"关联任务"Tab，展示关联任务统计数据

**Non-Goals:**
- 不改变其他 Tab 的内容和样式
- 不将数据计算迁移到 core 纯函数（当前组件内计算模式一致即可）
- 不改动 Web 端

## Decisions

### 1. 关联任务 Tab 数据来源

**选择**：从 `store.reflections` 和 `store.planItems` 直接计算，不新增 core 函数。

**理由**：数据量小（筛选 `linkedPlanItemId` 存在的感念，分组聚合），与其他 Tab 的计算模式一致。

### 2. 关联任务 Tab 展示内容

**选择**：
- 顶部概览卡片：关联总数、关联率（关联数/总感念数）
- 按任务分组列表：每个 planItem 显示名称和关联的感念数量，按数量降序排列
- 未关联感念数（无 linkedPlanItemId 的感念数量）

**理由**：简洁实用，帮助用户了解哪些任务产出了最多感念。

## Risks / Trade-offs

- **[风险] planItems 未加载**：`store.planItems` 可能为 undefined。→ 缓解：空数组 fallback。
