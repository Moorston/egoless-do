# 打卡复盘系统提案

## 变更概述

为打卡历史页面新增**周复盘**和**月复盘**功能，通过AI分析生成专业的复盘报告，帮助用户分析"为什么没做好"和"做了哪些"，并提供改进建议。

## 目标

1. **分析未完成原因** - 统计未完成原因分布，帮助用户识别模式
2. **分析未完成项** - 统计哪些习惯/任务未完成
3. **展示核心指标** - 完成率、连续天数、健康指标等
4. **对比上期数据** - 所有指标与上周/上月对比
5. **AI生成文案** - 专业分析型 + 温暖鼓励型的复盘总结
6. **历史复盘查看** - 可查看历史生成的复盘报告
7. **持久化同步** - 复盘报告保存并同步到云端

## 非目标

- 不实现分享功能（暂时不需要）
- 不支持自定义复盘时间范围（固定本周/本月）
- 不实现复盘报告导出（暂时不需要）

## 影响平台

- **Mobile** - 主要实现平台，新增UI组件
- **Core** - 新增数据模型、业务逻辑、AI服务扩展
- **Web** - 暂不实现，后续可复用core逻辑

## 技术方案

### 数据模型

```typescript
interface CheckinReview extends Syncable {
  id: string;
  period: 'week' | 'month';
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  
  // 核心指标
  completionRate: number;
  doneDays: number;
  totalDays: number;
  streakDays: number;
  longestStreak: number;
  
  // 未完成分析
  incompleteReasons: IncompleteReasonStat[];
  incompleteItems: IncompleteItemStat[];
  
  // 习惯养成
  habitProgress: HabitProgressStat[];
  
  // 计划任务
  planProgress: PlanProgressStat[];
  
  // 各项指标
  metrics: ReviewMetrics;
  
  // 对比上期
  comparison: ReviewComparison;
  
  // AI生成
  aiSummary: string;
  highlights: string[];
  improvements: string[];
  
  // 元数据
  generatedAt: number;
  aiModel?: string;
}
```

### 生成时机

1. **切换Tab时** - 用户切换到周/月复盘Tab时自动生成
2. **周/月结束时** - 在dailyReset.ts中自动触发生成
3. **手动刷新** - 用户下拉刷新重新生成

### 缓存策略

- 本周/本月复盘：每天最多自动更新一次
- 已结束的复盘：生成后不再自动更新
- 手动刷新：无限制

### UI设计

```
┌─────────────────────────────────────────────────────────────┐
│  [历史记录]  [周复盘]  [月复盘]                              │
├─────────────────────────────────────────────────────────────┤
│  📊 本周复盘 (6/9 - 6/15)                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │  80%    │ │  5天    │ │  +10%   │                       │
│  │ 完成率  │ │ 连续    │ │ vs上周  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 未完成分析                                              │
│  • 时间不足: 3次 (60%)                                      │
│  • 健康问题: 1次 (20%)                                      │
├─────────────────────────────────────────────────────────────┤
│  ✅ 习惯养成                                                │
│  • 早睡    ████████░░ 80% (4/5天) 连续4天                  │
│  • 早起    ██████░░░░ 60% (3/5天) 连续2天                  │
├─────────────────────────────────────────────────────────────┤
│  📝 计划任务                                                │
│  • 学习计划  ████████░░ 80% (8/10任务)                      │
├─────────────────────────────────────────────────────────────┤
│  📊 健康指标                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 体重    │ │ 饮水    │ │ 热量    │ │ 运动    │          │
│  │ 64.5kg  │ │ 1800ml  │ │ 1500kcal│ │ 120min  │          │
│  │ -0.5kg  │ │ +200ml  │ │ -100kcal│ │ +30min  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
├─────────────────────────────────────────────────────────────┤
│  💡 AI分析                                                  │
│  本周整体表现良好，完成率达到80%，较上周提升10%。           │
│  早睡习惯养成效果显著，连续4天完成目标。                    │
│                                                             │
│  亮点:                                                      │
│  • 早睡习惯连续4天，形成良好规律                           │
│  • 运动时长增加30%，体能提升明显                           │
│                                                             │
│  改进建议:                                                  │
│  • 冥想完成率较低，建议设定固定时间                         │
│  • 周三未完成，可提前规划时间安排                           │
├─────────────────────────────────────────────────────────────┤
│  📚 历史复盘                                                │
│  > 2026年6月第2周 (6/2-6/8)                                │
│  > 2026年6月第1周 (5/26-6/1)                               │
│  [查看全部...]                                              │
└─────────────────────────────────────────────────────────────┘
```

## 文件变更

### 新增文件

1. `packages/core/src/types/review.ts` - 数据模型定义
2. `packages/core/src/business/review.ts` - 分析引擎（纯函数）
3. `packages/core/src/store/createReviewSlice.ts` - 状态管理
4. `apps/mobile/src/features/home/ReviewView.tsx` - 复盘视图组件
5. `apps/mobile/src/features/home/ReviewHistoryScreen.tsx` - 复盘历史页面

### 修改文件

1. `packages/core/src/ai/ai-service.ts` - 新增generateCheckinReview方法
2. `packages/core/src/store/types.ts` - 新增ReviewSlice类型
3. `packages/core/src/defaults.ts` - 新增checkinReviews默认值
4. `packages/core/src/dailyReset.ts` - 新增周/月复盘自动生成
5. `apps/mobile/src/store/useAppStore.ts` - 集成ReviewSlice
6. `apps/mobile/src/features/home/CheckinHistoryScreen.tsx` - 新增Tab切换
7. `packages/core/src/i18n/zh.ts, en.ts, zh-Hant.ts` - 新增翻译

## AI Prompt设计

```
System: 你是一位专业的个人成长分析师，同时具备温暖的鼓励能力。
        你的分析基于数据，既有专业深度，又能给予建设性的鼓励。

User: 请基于以下{周/月}复盘数据，生成一份专业的分析总结：

## 时间范围
{startDate} - {endDate}

## 核心指标
- 打卡完成率: {completionRate}% ({doneDays}/{totalDays}天)
- 连续天数: {streakDays}天 (本期最长: {longestStreak}天)
- 对比上期: 完成率{+/-X}%, 连续天数{+/-X}天

## 未完成分析
- 主要原因: {reason1}({count1}次), {reason2}({count2}次)
- 未完成项: {item1}({count1}次), {item2}({count2}次)

## 习惯养成
{habit1}: 完成{doneDays}/{targetDays}天, 连续{streak}天
{habit2}: 完成{doneDays}/{targetDays}天, 连续{streak}天

## 计划任务
{plan1}: 完成{completedItems}/{totalItems}项, 进度{progress}%
{plan2}: 完成{completedItems}/{totalItems}项, 进度{progress}%

## 健康指标
- 体重: {avgWeight}kg (变化{weightChange}kg)
- 平均饮水: {avgWater}ml/天
- 平均热量: {avgCalories}kcal/天
- 运动: {totalExerciseMin}分钟, {totalExerciseKm}km
- 冥想: {totalMeditationMin}分钟
- 禁食: {fastingCount}次, {fastingHours}小时

请生成：
1. SUMMARY: 一段200-250字的专业分析总结
2. HIGHLIGHTS: 2-3个亮点
3. IMPROVEMENTS: 2-3个改进建议
```

## 验证标准

1. 用户可以在CheckinHistoryScreen切换到周/月复盘Tab
2. 复盘数据正确计算（完成率、连续天数、习惯进度等）
3. 未完成原因和未完成项正确统计
4. 健康指标正确聚合
5. 对比上期数据正确计算
6. AI文案正确生成并显示
7. 复盘报告持久化保存
8. 复盘报告同步到云端
9. 可以查看历史复盘列表
10. 周/月结束时自动生成复盘
