## ADDED Requirements

### Requirement: 感念画像面板

系统 SHALL 在快速创建脉络页面（QuickCreateTrailScreen）搜索框为空时显示感念画像面板，帮助用户观察自己的感念模式后再决定创建什么脉络。

#### Scenario: 空输入进入时显示画像
- **WHEN** 用户从 MindTrailScreen 无输入跳转到 QuickCreateTrailScreen
- **THEN** 显示 InsightPanel，包含：时间窗口切换器、统计概览、AI 洞察、高频标签、心情分布、AI 主题词、快速入口
- **THEN** 同时显示推荐脉络（现有逻辑不变）

#### Scenario: 清空搜索框时重新显示画像
- **WHEN** 用户在 QuickCreateTrailScreen 清空搜索框
- **THEN** 重新显示 InsightPanel
- **THEN** 使用缓存数据，不重新调用 AI

#### Scenario: 输入关键词时隐藏画像
- **WHEN** 用户在搜索框输入内容
- **THEN** 隐藏 InsightPanel，显示搜索匹配结果（现有逻辑不变）

### Requirement: 时间窗口切换

系统 SHALL 支持 7 天和 30 天两个时间窗口，独立缓存每个窗口的分析结果。

#### Scenario: 切换时间窗口
- **WHEN** 用户点击时间窗口切换器（7天/30天）
- **THEN** 本地统计（标签频率、心情分布、连续天数）立即更新
- **THEN** AI 洞察区域显示骨架屏 shimmer
- **THEN** AI 返回后更新洞察摘要和主题词

#### Scenario: 切回已缓存的窗口
- **WHEN** 用户切换回之前已分析过的时间窗口
- **THEN** 直接从缓存读取完整画像数据
- **THEN** 不显示骨架屏，立即展示

### Requirement: 本地统计计算

系统 SHALL 同步计算时间窗口内的基础统计数据。

```typescript
interface InsightProfile {
  totalCount: number;           // 感念总数
  streakDays: number;           // 连续记录天数
  avgPerDay: number;            // 日均记录数
  hotTags: HotTag[];            // 高频标签
  moodDistribution: MoodEntry[];// 心情分布
  hotTopics: HotTopic[];        // AI 主题词
  insightSummary: string;       // AI 洞察摘要
  timeRange: 'week' | 'month';
  startDate: number;
  endDate: number;
}

interface HotTag {
  tag: string;
  count: number;
  percentage: number;
  trend: 'rising' | 'stable' | 'declining'; // 与上个周期对比
  sampleReflectionIds: string[];
}

interface MoodEntry {
  mood: string;
  icon: string;
  count: number;
  percentage: number;
}

interface HotTopic {
  word: string;                 // AI 提取的主题词（2-4字）
  count: number;
  category: string;             // AI 自由分类，每次最多显示4类
  sampleReflectionIds: string[];
  aiReason?: string;
}
```

#### Scenario: 本地统计计算
- **WHEN** InsightPanel 挂载或时间窗口切换
- **THEN** 调用 `computeLocalInsights(reflections, timeRange)` 同步计算标签频率、心情分布、连续天数
- **THEN** 标签趋势通过与上个同周期对比得出（7天 vs 前7天，30天 vs 前30天）

#### Scenario: 感念少于 3 条
- **WHEN** 时间窗口内感念少于 3 条
- **THEN** 显示空状态："记录更多感念后，这里会为你生成感念画像"
- **THEN** 显示"去记录"按钮，跳转到感念记录页

### Requirement: AI 感念分析

系统 SHALL 异步调用 AI 分析感念内容，提取高频主题词和一句话洞察摘要。

#### Scenario: AI 可用时生成画像
- **WHEN** AI 服务可用（`isAIRecommendAvailable() === true`）
- **THEN** 调用 `generateInsightProfile(reflections, timeRange)` 异步分析
- **THEN** AI 自由提取 3-5 个高频主题词，每个词包含：word、count、category、reason、关联感念序号
- **THEN** AI 生成一句话洞察摘要（20字以内，温暖有启发性）
- **THEN** 结果缓存到 `insightCache[timeRange]`

#### Scenario: AI 不可用时降级
- **WHEN** AI 服务不可用
- **THEN** 隐藏 AI 洞察摘要和主题词区块
- **THEN** 高频标签区块多显示（5→8个）
- **THEN** 标签/心情/快速入口正常显示，不显示错误提示

#### Scenario: AI 调用失败
- **WHEN** AI 调用返回失败
- **THEN** 静默降级，同 AI 不可用的展示
- **THEN** 不显示错误提示

### Requirement: 点击筛选交互

系统 SHALL 支持点击画像中的标签、心情、主题词进行筛选。

#### Scenario: 点击高频标签
- **WHEN** 用户点击高频标签（如 #焦虑）
- **THEN** 搜索框自动填入标签文字（"焦虑"）
- **THEN** 触发 `matchByKeyword` 搜索，按时间倒序显示匹配感念
- **THEN** 隐藏 InsightPanel

#### Scenario: 点击心情分布项
- **WHEN** 用户点击心情项（如 😰 焦虑）
- **THEN** 搜索框自动填入心情文字（"焦虑"）
- **THEN** 触发搜索，匹配 mood 或 content 中包含该文字的感念

#### Scenario: 点击 AI 主题词
- **WHEN** 用户点击主题词（如 "压力"）
- **THEN** 搜索框自动填入主题词
- **THEN** 触发搜索，匹配 content 中包含该词的感念

#### Scenario: 点击快速入口
- **WHEN** 用户点击快速入口（未归类/深夜/情绪变化）
- **THEN** 触发对应的 preset 筛选（unassigned/nightThoughts/moodChange）
- **THEN** 搜索框不填入文字

### Requirement: 骨架屏加载态

系统 SHALL 在 AI 加载期间显示骨架屏 shimmer 动画。

#### Scenario: AI 加载中显示骨架屏
- **WHEN** AI 洞察正在加载
- **THEN** 洞察摘要区域显示一行灰色色块（宽度70%）+ shimmer 动画
- **THEN** 主题词区域显示 4 个灰色圆角卡片 + shimmer 动画

#### Scenario: AI 加载完成
- **WHEN** AI 返回成功
- **THEN** 骨架屏消失，显示实际内容
- **THEN** 内容带淡入动画

### Requirement: 缓存策略

系统 SHALL 为每个时间窗口独立缓存画像数据。

#### Scenario: 缓存写入
- **WHEN** AI 分析完成
- **THEN** 将完整 InsightProfile 写入 `insightCache[timeRange]`

#### Scenario: 缓存读取
- **WHEN** 切换到已缓存的时间窗口
- **THEN** 直接使用缓存数据，不重新调用 AI

#### Scenario: 缓存失效
- **WHEN** 感念数据发生变化（新增/编辑/删除）
- **THEN** 清除所有缓存，下次进入时重新计算

### Requirement: 心情分布条

系统 SHALL 以可视化进度条形式展示心情分布。

#### Scenario: 展示心情分布
- **WHEN** 有心情数据
- **THEN** 每个心情显示：emoji + 心情名 + 进度条 + 百分比 + 次数
- **THEN** 按次数降序排列
- **THEN** 进度条颜色与心情关联

### Requirement: 高频标签趋势指示

系统 SHALL 显示高频标签与上个时间窗口的对比趋势。

#### Scenario: 标签频率上升
- **WHEN** 某标签在当前窗口出现次数 > 上个窗口
- **THEN** 显示 ↗ 上升指示

#### Scenario: 标签频率持平
- **WHEN** 某标签在当前窗口出现次数 = 上个窗口
- **THEN** 显示 → 持平指示

#### Scenario: 标签频率下降
- **WHEN** 某标签在当前窗口出现次数 < 上个窗口
- **THEN** 显示 ↘ 下降指示

### Requirement: 空输入跳转

MindTrailScreen 底部输入框 SHALL 允许空输入直接跳转到 QuickCreateTrailScreen。

#### Scenario: 空输入跳转
- **WHEN** 用户点击发送按钮（输入框为空）
- **THEN** 跳转到 QuickCreateTrailScreen，不传递 initialText
- **THEN** QuickCreateTrailScreen 显示 InsightPanel

#### Scenario: 有输入跳转
- **WHEN** 用户输入文字后点击发送
- **THEN** 跳转到 QuickCreateTrailScreen，传递 initialText
- **THEN** 搜索框预填文字，触发搜索（现有行为不变）
