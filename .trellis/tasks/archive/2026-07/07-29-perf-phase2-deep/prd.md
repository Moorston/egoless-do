# PRD: 性能 Phase 2（消除嵌套 FlatList + FlashList 迁移 + 性能监控）

## 背景
Phase 1 完成启动优化（TTI -70%）。Phase 2 聚焦列表渲染性能。

## 目标
- 消除 13 处 `scrollEnabled={false}` 嵌套 FlatList 反模式
- 关键列表 FlashList 采用率 100%
- 长列表帧率 45fps → 55fps+
- 性能可观测（监控 marker）

## 需求

### 1. 消除嵌套 FlatList（13 处）
- **当前**: `<ScrollView><FlatList scrollEnabled={false}/></ScrollView>`
- **影响**: 首页、打卡页、回顾页强制一次性全量布局
- **修复**: 合并为单一 FlashList 或 SectionList

### 2. 关键列表迁 FlashList
- **目标**: HomeScreen、DayCheckinScreen、ReviewView、历史列表
- **收益**: 虚拟化 + 回收，帧率 ↑

### 3. 列表分页（LIMIT + 游标）
- **目标**: 反思、食物、打卡等无限增长列表
- **收益**: 冷启动内存 ↓，查询延迟 ↓

### 4. 性能监控
- **目标**: 添加 frame rate + re-render 监控
- **收益**: 可观测，防止回归

## 验收标准
- [ ] 13 处嵌套 FlatList 消除（合并为 FlashList/SectionList）
- [ ] FlashList 关键列表覆盖率 100%
- [ ] 长列表（>50 项）帧率 55fps+
- [ ] 列表分页实现（LIMIT + 游标）
- [ ] 性能监控 marker 添加
- [ ] 全量测试通过（1832/1832）

## 影响范围
- `apps/mobile/src/features/home/screens/HomeScreen.tsx`（核心）
- `apps/mobile/src/features/home/screens/DayCheckinScreen.tsx`
- `apps/mobile/src/features/home/components/ReviewView.tsx`
- `apps/mobile/src/features/home/components/CheckinModal.tsx`
- `apps/mobile/src/features/mind/MindScreen.tsx`
- `apps/mobile/src/features/diet/DietScreen.tsx`
- `apps/mobile/src/features/*/history/*HistoryScreen.tsx`

## 工作量
- 消除嵌套 FlatList: 8h
- FlashList 迁移: 6h
- 列表分页: 4h
- 性能监控: 2h
- **总计: 12h**（含测试）

## 回滚点
各页面独立，可逐个 revert
