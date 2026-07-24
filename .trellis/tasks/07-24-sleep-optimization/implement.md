# 调眠页首页优化 — 执行计划

## 前置条件

- [ ] 用户已审阅 design.md 并确认
- [ ] 当前分支已创建（feature/sleep-homepage-redesign 或直接在 master 上开发）

## 执行清单

### Step 1: 提取 HomePage 组件

**文件**: `apps/mobile/src/features/sleep/SleepEngine.tsx`
**操作**: 
- 将首页渲染部分（172-341 行）提取为 `HomePage.tsx` 独立组件
- Props: 所有需要从 SleepEngine 传入的 state 和回调
- 保持 `SleepEngine` 的 state machine 逻辑不变

**验证**: 页面功能不变，布局不变

### Step 2: 视觉基调 — 夜间色彩体系

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx` (NEW)
**操作**:
- 页面背景改为 `#0a0a1a`
- 卡片背景改为 `rgba(139,92,246,0.08)` 半透明紫
- 卡片边框改为 `rgba(139,92,246,0.2)`
- 调整所有卡片样式统一

**验证**: 页面视觉风格统一为深紫主题

### Step 3: SleepSummaryCard — 昨晚睡眠概览

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 创建 `SleepSummaryCard` 子组件
- 展示：时长（大字号）、质量星星、时间轴（🛌→☀️）、仪轨状态
- 空状态：无记录时的提示
- 点击 → 打开 DiaryModal

**验证**: 首次加载页面顶部显示昨晚睡眠数据

### Step 4: BodyClockCard — 十二时辰增强交互

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 保留现有布局，增大圆点尺寸
- 每个时辰添加 `onPress` → 弹出详情 Modal
- 详情 Modal 显示：时辰名、对应脏腑、养生建议、适合修行类型
- 当前时辰高亮动画

**验证**: 点击每个时辰圆点弹出详情

### Step 5: SleepGoalCard — 可编辑睡眠目标

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 添加编辑按钮
- 编辑 Modal：目标入睡时间、目标起床时间、目标时长
- 保存 → `setSleepGoal()`

**验证**: 点击编辑 → 修改 → 保存 → 页面更新

### Step 6: QuickDiary — 快速评分

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 5 星评分（横向排列）
- 工作状态 4 选 1
- 保存按钮 → `saveSleepDiary({ quality, workState })`
- "完整日记"链接 → 打开 DiaryModal

**验证**: 选择评分 + 工作状态 → 保存 → 数据持久化

### Step 7: RitualEntrance — 视觉增强

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 渐变背景（紫色系）
- 大按钮
- 柔光效果

**验证**: 仪轨入口视觉统一，功能正常

### Step 8: TrendChart — 本周趋势

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 从 `sleepHistory` 计算近 7 天数据
- 7 根柱状图（纯 View 实现，避免额外依赖）
- 颜色随质量变化
- 平均时长标注
- 点击柱子 → 打开当天详情（或跳转历史页）

**验证**: 首页显示 7 天柱状图，颜色正确

### Step 9: StreakBar — 连续记录

**文件**: `apps/mobile/src/features/sleep/HomePage.tsx`
**操作**:
- 连续记录天数（大字号）
- "查看完整历史"按钮

**验证**: 连续记录显示正确

### Step 10: 集成与回归

**操作**:
- 确保所有 callback 正确传递
- 确保仪轨流程（barrier → gratitude → report）不受影响
- 确保 DiaryModal 功能正常

**验证**: 完整流程走通

## 验证命令

```bash
# 类型检查
pnpm run type-check

# 运行测试
pnpm run test

# 运行 app（手动测试）
pnpm run mobile
```

## 风险点与回滚

| 风险 | 回滚方案 |
|------|----------|
| 提取 HomePage 组件破坏现有功能 | `git checkout -- SleepEngine.tsx` |
| 趋势图渲染性能问题 | 移除趋势图，保留原始布局 |
| 快速日记数据同步问题 | 回退到仅使用 DiaryModal |