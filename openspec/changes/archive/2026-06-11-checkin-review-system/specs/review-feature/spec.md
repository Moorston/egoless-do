# 打卡复盘功能规格

## 功能概述

打卡复盘功能允许用户查看周复盘和月复盘报告，分析打卡数据、习惯养成、计划任务完成情况，并由AI生成专业的分析总结。

## 用户故事

1. 作为用户，我希望切换到"周复盘"Tab查看本周的打卡复盘报告
2. 作为用户，我希望切换到"月复盘"Tab查看本月的打卡复盘报告
3. 作为用户，我希望看到完成率、连续天数等核心指标
4. 作为用户，我希望看到未完成原因分析，了解为什么没完成
5. 作为用户，我希望看到习惯养成进度，了解每个习惯的完成情况
6. 作为用户，我希望看到计划任务进度，了解计划完成情况
7. 作为用户，我希望看到健康指标（体重、饮水、热量、运动等）
8. 作为用户，我希望看到与上周/上月的对比数据
9. 作为用户，我希望看到AI生成的专业分析总结
10. 作为用户，我希望查看历史复盘报告
11. 作为用户，我希望下拉刷新重新生成复盘

## 功能规格

### 1. 数据模型

#### 1.1 CheckinReview

```typescript
interface CheckinReview extends Syncable {
  id: string;
  period: 'week' | 'month';
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  
  completionRate: number;  // 0-100
  doneDays: number;
  totalDays: number;
  streakDays: number;
  longestStreak: number;
  
  incompleteReasons: IncompleteReasonStat[];
  incompleteItems: IncompleteItemStat[];
  habitProgress: HabitProgressStat[];
  planProgress: PlanProgressStat[];
  metrics: ReviewMetrics;
  comparison: ReviewComparison;
  
  aiSummary: string;
  highlights: string[];
  improvements: string[];
  
  generatedAt: number;
  aiModel?: string;
  lastAutoUpdateAt?: string;  // YYYY-MM-DD
}
```

### 2. 计算逻辑

#### 2.1 日期范围

- **周复盘**: 周一 00:00:00 到 周日 23:59:59
- **月复盘**: 本月1日 00:00:00 到 本月最后一天 23:59:59

#### 2.2 完成率

```
完成率 = (完成天数 / 总天数) × 100%
```

- 完成天数: checkinHistory 中 done=true 且在日期范围内的记录数
- 总天数: 日期范围内的天数

#### 2.3 连续天数

- 当前连续天数: 从今天向前推算，连续打卡的天数
- 本期最长连续天数: 日期范围内最长的连续打卡天数

#### 2.4 未完成原因分析

从 checkinHistory 中解析 note 字段的 incompleteReason，统计各原因的出现次数和占比。

#### 2.5 未完成项分析

从 checkinHistory 中解析 note 字段，统计未完成的 practices、habits、planItems。

#### 2.6 习惯养成进度

对于每个 inProgress 状态的习惯：
- doneDays: 日期范围内 checkedDates 中的天数
- targetDays: 根据习惯的目标计算
- progress: (doneDays / targetDays) × 100%
- streak: 连续完成天数

#### 2.7 计划任务进度

对于每个 inProgress 状态的计划：
- totalItems: 计划下的任务总数
- completedItems: 状态为 completed 的任务数
- progress: (completedItems / totalItems) × 100%

#### 2.8 健康指标

从 checkinHistory 的 note 字段和相关数据源聚合：
- avgWeight: 体重平均值
- weightChange: 期末体重 - 期初体重
- avgWater: 每日饮水量平均值
- avgCalories: 每日热量平均值
- totalExerciseMin: 总运动时长
- totalExerciseKm: 总运动距离
- totalMeditationMin: 总冥想时长
- fastingCount: 禁食次数
- fastingHours: 禁食总时长
- graceCount: 宽限次数

#### 2.9 对比上期

对比指标：
- completionRateDiff: 本期完成率 - 上期完成率
- streakDiff: 本期连续天数 - 上期连续天数
- weightDiff: 本期平均体重 - 上期平均体重
- waterDiff: 本期平均饮水 - 上期平均饮水
- caloriesDiff: 本期平均热量 - 上期平均热量
- exerciseMinDiff: 本期运动时长 - 上期运动时长

### 3. AI生成

#### 3.1 Prompt模板

```
System: 你是一位专业的个人成长分析师，同时具备温暖的鼓励能力。
        你的分析基于数据，既有专业深度，又能给予建设性的鼓励。请用中文回答。

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
1. SUMMARY: 一段200-250字的专业分析总结，包含整体表现评估、关键发现、趋势分析、建设性建议
2. HIGHLIGHTS: 2-3个亮点，每个1-2句话
3. IMPROVEMENTS: 2-3个改进建议，每个1-2句话

输出格式（严格遵循）：
SUMMARY:
[总结内容]

HIGHLIGHTS:
- [亮点1]
- [亮点2]

IMPROVEMENTS:
- [建议1]
- [建议2]
```

#### 3.2 响应解析

解析AI响应，提取：
- SUMMARY部分作为aiSummary
- HIGHLIGHTS部分的列表项作为highlights数组
- IMPROVEMENTS部分的列表项作为improvements数组

### 4. 生成时机

#### 4.1 切换Tab时

用户切换到周/月复盘Tab时：
1. 检查store中是否有对应复盘
2. 如果有且lastAutoUpdateAt是今天，直接显示
3. 如果有但不是今天，显示缓存 + 后台重新生成
4. 如果无，显示加载动画 + 生成

#### 4.2 周/月结束时

在dailyReset.ts中：
- 周日自动触发上周复盘生成
- 月末自动触发本月复盘生成

#### 4.3 手动刷新

用户下拉刷新时，重新生成当前复盘。

### 5. 缓存策略

- 本周/本月复盘：每天最多自动更新一次（通过lastAutoUpdateAt判断）
- 已结束的复盘：生成后不再自动更新
- 手动刷新：无限制

### 6. 同步

- 复盘记录保存在store.checkinReviews数组中
- 通过现有的同步机制同步到PocketBase
- 使用updatedAt字段处理冲突

### 7. UI规格

#### 7.1 复盘视图

- 标题：显示"周复盘"或"月复盘" + 日期范围
- 核心指标卡片：3个指标（完成率、连续天数、对比上期）
- 未完成分析卡片：原因分布 + 未完成项
- 习惯养成卡片：进度条 + 完成天数 + 连续天数
- 计划任务卡片：进度条 + 完成任务数
- 健康指标卡片：4个指标网格
- AI分析卡片：总结 + 亮点 + 改进建议
- 历史复盘入口：最近3条历史复盘 + 查看全部按钮

#### 7.2 加载状态

- 显示加载动画 + "正在生成复盘..."文字
- 使用RefreshCw图标旋转动画

#### 7.3 空状态

- 显示"暂无复盘数据"文字

### 8. 国际化

支持中文、英文、繁体中文。

### 9. 错误处理

- AI生成失败：使用默认文案
- 数据计算错误：返回空数据，显示提示
- 网络错误：显示缓存数据，提示用户刷新

### 10. 性能要求

- 复盘数据计算：< 100ms
- AI生成：< 5s（云端）/ < 1s（本地）
- UI渲染：60fps
