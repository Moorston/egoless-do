## 1. Tab 顺序与默认 Tab

- [x] 1.1 `ReflectionStatsScreen.tsx`：TabKey 类型新增 `'linkedTask'`
- [x] 1.2 `ReflectionStatsScreen.tsx`：tabs 数组重排序为 标签→心情→关联任务→趋势→热力图
- [x] 1.3 `ReflectionStatsScreen.tsx`：默认 activeTab 从 `'trend'` 改为 `'tags'`

## 2. 关联任务数据计算

- [x] 2.1 `ReflectionStatsScreen.tsx`：新增 `linkedTaskStats` useMemo，计算关联总数、关联率、按任务分组列表

## 3. 关联任务 Tab 渲染

- [x] 3.1 `ReflectionStatsScreen.tsx`：新增 `renderLinkedTaskTab()` 渲染函数
- [x] 3.2 `ReflectionStatsScreen.tsx`：在 tab 内容区域添加关联任务 Tab 的条件渲染

## 4. 验证

- [x] 4.1 TypeScript 编译通过
- [ ] 4.2 手动测试：Tab 顺序正确，默认显示标签
- [ ] 4.3 手动测试：关联任务 Tab 数据正确
