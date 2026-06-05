## Why

感念页积累了大量历史功能和冗余交互，需要做一轮清理和优化：移除不再使用的置顶功能和左滑手势，补齐时间范围筛选 UI，并通过折叠旧日期来提升长列表的浏览体验。

## What Changes

1. **时间范围筛选 UI** — FilterDrawer 中增加日期范围选择器（本周/本月/近7天/近30天快捷预设），底层 `dateRange` 逻辑已就绪，仅缺 UI
2. **移除置顶功能** — 删除卡片上的置顶徽章、详情页的置顶/取消置顶按钮、以及相关筛选逻辑；详情页改为显示"创建任务/解绑任务"按钮
3. **移除左滑手势** — 移除感念卡片的 `Swipeable` 包装（编辑、创建任务按钮），保留长按菜单作为唯一操作入口
4. **旧日期折叠** — 感念列表中，仅展开最近有数据的当天卡片，历史日期组折叠为摘要卡片（显示感念数、主要标签、主要心情），点击可展开

**非目标：**
- 不修改 Web 端（本次仅 Mobile）
- 不修改感念的核心数据模型（`isPinned` 字段保留在类型中但不再使用）
- 不修改统计页

## Capabilities

### New Capabilities
- `reflections-date-range-filter`: FilterDrawer 中的日期范围筛选 UI（快捷预设 + 自定义范围）
- `reflections-date-collapse`: 旧日期组折叠为摘要卡片的 UI 交互

### Modified Capabilities
- `reflection-linked-task-filter`: 详情页按钮从置顶改为创建任务/解绑任务（UI 层变更）

## Impact

- **Mobile 端文件：**
  - `FilterDrawer.tsx` — 增加日期范围 UI
  - `ReflectionsScreen.tsx` — 移除置顶徽章、左滑手势、详情页置顶按钮，增加创建/解绑任务按钮，折叠旧日期组
  - `useReflections.ts` — 移除 `setIsPinned` 相关逻辑（已部分完成）
  - `ReflectionCard.tsx` — 移除 Swipeable 包装
- **Core 包：** 无变更（`isPinned` 字段保留，筛选逻辑已更新）
- **依赖：** 可能需要引入日期选择组件或使用原生 `DatePicker`
