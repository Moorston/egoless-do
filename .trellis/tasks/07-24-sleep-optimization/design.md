# 调眠页首页优化 — 技术设计

## 概述

对 SleepEngine 首页进行视觉重构和功能增强，保持已有功能（仪轨流程、感恩、报告）不变。

## 架构

### 组件结构

```
SleepEngine (state machine)
├── HomePage (NEW — 从 SleepEngine 中提取为单独组件)
│   ├── SleepSummaryCard (昨晚睡眠概览)
│   ├── BodyClockCard (十二时辰，增强交互)
│   ├── SleepGoalCard (睡眠目标，增加编辑功能)
│   ├── QuickDiary (快速评分 + 工作状态)
│   ├── RitualEntrance (调眠仪轨入口)
│   ├── TrendChart (本周趋势 mini chart)
│   └── StreakBar (连续记录 + 历史入口)
├── SleepBarrierPage (不变)
├── SleepGratitudePage (不变)
├── SleepReportPage (不变)
└── DiaryModal (不变)
```

### 数据流

```
用户操作 → HomePage 组件 → SleepEngine 回调 → Store Action → 持久化
                                         ↕
                                  useShallowStore 选择器
```

### 关键状态

| 状态 | 来源 | 说明 |
|------|------|------|
| `todaySleep` | `getTodaySleep()` | 昨晚睡眠数据 |
| `sleepHistory` | store | 历史记录（用于趋势图） |
| `sleepGoal` | store | 睡眠目标 |
| `currentPeriod` | `getCurrentPeriod()` | 当前时辰 |
| `nextSleep` | `getNextSleepPeriod()` | 下一个睡眠时辰 |
| `sleepStreak` | computed | 连续记录天数 |

## 详细设计

### 1. SleepSummaryCard (昨晚睡眠概览)

**位置**: 页面顶部第一屏

**数据**: `todaySleep` (SleepEntry)

**展示内容**:
- 睡眠时长（大字号，`FONT_HERO()` 级别）
- 质量评分（星星，彩色）
- 时间轴：🛌 23:15 → 06:47
- 仪轨状态：✅ 已完成 / 未开始
- 感恩摘要：感恩×3

**空状态**: 显示"还没有昨晚的记录" + 鼓励文案

**交互**: 点击 → 打开 DiaryModal（编辑已有记录 / 创建新记录）

### 2. BodyClockCard (十二时辰)

**位置**: 昨晚睡眠卡片下方

**改动**: 保留现有布局，增强交互

**交互**:
- 每个时辰圆点可点击
- 点击弹出 Modal 详情（时辰名、对应脏腑、养生建议、适合修行类型）
- 当前时辰高亮动画

**数据**: `BODY_CLOCK` 常量（已存在）

### 3. SleepGoalCard (睡眠目标)

**位置**: 十二时辰卡下方

**改动**: 增加编辑功能

**交互**:
- 点击编辑按钮 → 弹出编辑 Modal
- 编辑项：目标入睡时间、目标起床时间、目标时长
- 保存 → `setSleepGoal()`

### 4. QuickDiary (快速评分)

**位置**: 睡眠目标卡下方

**交互**:
- 5 星评分（横向排列，可点击）
- 工作状态 4 选 1（精力充沛/正常/疲劳/精疲力竭）
- 保存按钮
- 点击"完整日记" → 打开 DiaryModal

**空状态**: 如果今天已记录，显示"今日已记录" + 编辑入口

**数据流**:
- 评分 + 工作状态 → `saveSleepDiary({ quality, workState })`
- 自动触发 `autoSyncHabits()`

### 5. RitualEntrance (调眠仪轨入口)

**位置**: 快速日记下方

**改动**: 视觉增强为主，功能不变

**视觉**:
- 渐变背景（紫色系）
- 柔光边缘效果
- 按钮更大，更容易点击（睡前场景的可用性）

**功能**: 不变（15/20/30 分钟 + 快速感恩）

### 6. TrendChart (本周趋势)

**位置**: 仪轨入口下方

**数据**: `sleepHistory` 近 7 天记录

**展示**:
- 7 天柱状图
- 每根柱子 = 当天睡眠时长
- 颜色随睡眠质量变化：
  - ≥7h → 紫色 (#8B5CF6)
  - 6-7h → 蓝色 (#6366F1)
  - 5-6h → 黄色 (#F59E0B)
  - <5h → 红色 (#EF4444)
- 平均时长标注

**交互**: 点击柱子 → 显示当天详情（或跳转到历史页）

**实现**: 使用 `react-native-svg`（已有依赖）或纯 View 实现

### 7. StreakBar (连续记录 + 历史入口)

**位置**: 趋势图下方，页面底部

**展示**:
- 🔥 连续记录 X 天（大字号，显眼）
- "查看完整历史 →" 按钮

## 视觉规范

### 色彩体系

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#0a0a1a` | 深空色，与当前仪轨卡一致 |
| 主色调 | `#8B5CF6` | 紫色，当前已在用 |
| 强调色 | `#6366F1` | 靛蓝 |
| 成功色 | `#10B981` | 绿色，仪轨完成 |
| 分数色 | `#F59E0B` | 金色，质量评分 |
| 卡片背景 | `rgba(139,92,246,0.08)` | 半透明紫 |
| 卡片边框 | `rgba(139,92,246,0.2)` | 半透明紫边框 |

### 字号

- 昨晚时长：`FONT_HERO()` 级别（56px）
- 卡片标题：`FONT_TITLE()`（18px）
- 正文：`FONT_BODY()`（15px）
- 辅助文字：`FONT_SUB()`（14px）

## 兼容性

- 已有数据：不受影响，新布局读取同样的 `sleepHistory` / `getTodaySleep()`
- 已有功能：仪轨流程、感恩、报告页面完全不变
- 主题系统：夜间氛围仅应用于调眠页，不影响全局主题

## 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 趋势图性能 | 大量历史数据时渲染卡顿 | 限制为 7 天，使用 `useMemo` |
| 十二时辰 Modal 过多 | 点击频繁时弹出多个 Modal | 单例 Modal，点击关闭再打开 |
| 快速日记与 DiaryModal 数据同步 | 评分不一致 | 统一通过 `saveSleepDiary` 写入 |