## 1. Bug 修复

- [x] 1.1 修复 `packages/core/src/store/createAuthSlice.ts` 的 `pullServerData` 方法，补充 `trailNote` 数据拉取（参考 `thoughtTrail` 的处理方式）

## 2. 概览组件改造

- [x] 2.1 改造 `apps/mobile/src/features/reflections/TrailOverviewCard.tsx`，从独立卡片改为行内紧凑模式（单行文本，无卡片边框）
- [x] 2.2 更新 `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx`，将概览组件放在 header 下方

## 3. 时间线置顶

- [x] 3.1 调整 `ThoughtTrailDetailScreen.tsx` 的 ScrollView 内容顺序，将 TimelineList 移到概览之后、其他区块之前
- [x] 3.2 移除独立的时间线标题区块，将标题合并到 TimelineList 组件内部或使用更简洁的样式

## 4. FAB 添加入口

- [x] 4.1 创建 `apps/mobile/src/features/reflections/AddReflectionFAB.tsx`，实现浮动操作按钮（右下角圆形按钮 + 展开菜单）
- [x] 4.2 在 `ThoughtTrailDetailScreen.tsx` 中用 AddReflectionFAB 替换 AddReflectionBar
- [x] 4.3 删除或废弃 `apps/mobile/src/features/reflections/AddReflectionBar.tsx`

## 5. AI 区域折叠

- [x] 5.1 改造 `apps/mobile/src/features/reflections/InsightSection.tsx`，支持折叠/展开（有内容时默认收起，显示摘要预览）
- [x] 5.2 改造 `apps/mobile/src/features/reflections/ReviewGuideSection.tsx`，支持折叠/展开（有内容时默认收起，显示摘要预览）

## 6. 底部区域紧凑化

- [x] 6.1 改造 `apps/mobile/src/features/reflections/PlanTasksSection.tsx`，减少 padding/margin，无内容时隐藏整个区域
- [x] 6.2 改造 `apps/mobile/src/features/reflections/RelatedTrailsSection.tsx`，减少 padding/margin，无内容时隐藏整个区域

## 7. 主页面组装

- [x] 7.1 重写 `ThoughtTrailDetailScreen.tsx` 的 ScrollView 内容区域，按新布局组装所有子组件
- [x] 7.2 增加 ScrollView 底部 padding，避免 FAB 遮挡内容
