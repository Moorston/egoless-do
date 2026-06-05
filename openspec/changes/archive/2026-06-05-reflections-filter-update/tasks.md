## 1. Core 类型与逻辑

- [x] 1.1 `packages/core/src/types/reflection.ts`：从 `ReflectionFilters` 移除 `isPinned`，新增 `hasLinkedTask?: boolean`
- [x] 1.2 `packages/core/src/business/reflections.ts`：`filterReflections()` 移除 isPinned 检查，新增 `planItems?` 参数和 hasLinkedTask 检查（验证 planItem 存在且未删除）

## 2. Mobile FilterDrawer

- [x] 2.1 `FilterDrawer.tsx`：将"已置顶"按钮替换为"关联任务"按钮，传递 planItems 数据
- [x] 2.2 `FilterDrawer.tsx`：clearAll 重置时移除 isPinned，新增 hasLinkedTask

## 3. Mobile useReflections

- [x] 3.1 `useReflections.ts`：移除 `setIsPinned` action，新增 `setHasLinkedTask` action
- [x] 3.2 `useReflections.ts`：`filterReflections` 调用时传入 `planItems`
- [x] 3.3 `useReflections.ts`：active filters 列表移除 isPinned，新增 hasLinkedTask
- [x] 3.4 `useReflections.ts`：clearAllFilters 移除 isPinned，新增 hasLinkedTask

## 4. Mobile ReflectionsScreen

- [x] 4.1 `ReflectionsScreen.tsx`：FilterDrawer props 适配（移除 isPinned 相关，新增 hasLinkedTask 相关）

## 5. 验证

- [x] 5.1 TypeScript 编译通过
- [ ] 5.2 手动测试：FilterDrawer 不显示"已置顶"，显示"关联任务"
- [ ] 5.3 手动测试：关联任务筛选正确过滤（含 planItem 已删除的排除）
- [ ] 5.4 手动测试：置顶功能（Pin 图标、详情页按钮）不受影响
