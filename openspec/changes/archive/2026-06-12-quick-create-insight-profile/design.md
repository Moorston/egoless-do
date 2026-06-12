## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (apps/mobile)                                 │
│  ├─ QuickCreateTrailScreen.tsx  集成 InsightPanel       │
│  ├─ InsightPanel.tsx           画像面板主组件           │
│  ├─ InsightPanelSkeleton.tsx   骨架屏                   │
│  ├─ TopicChip.tsx              可点击主题词             │
│  └─ MoodBar.tsx                心情分布条               │
├─────────────────────────────────────────────────────────┤
│  Business Logic (packages/core/src/ai/)                 │
│  ├─ insight-profile.ts         类型 + 本地统计 + AI    │
│  └─ trail-recommender.ts       复用 AI 调用模式        │
├─────────────────────────────────────────────────────────┤
│  AI Service (packages/core/src/ai/)                     │
│  ├─ ai-service.ts              复用 generateCloud      │
│  └─ cloud-providers.ts         复用 provider 机制      │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
QuickCreateTrailScreen mount
        │
        ├─ searchQuery = '' → 显示 InsightPanel
        │
        ├─ computeLocalInsights(reflections, timeRange)
        │   ├─ 统计标签频率 + 环比趋势
        │   ├─ 统计心情分布
        │   └─ 计算连续记录天数
        │   → 立即渲染统计数据
        │
        ├─ generateInsightProfile(reflections, timeRange)  [异步]
        │   ├─ 检查缓存 → 命中则直接返回
        │   ├─ 构建 prompt（感念摘要列表）
        │   ├─ 调用 AIService.generateCloud
        │   └─ 解析 JSON 响应
        │   → 更新 insightSummary + hotTopics
        │
        └─ 用户点击标签/心情/主题词
            → setSearchQuery(word) → 隐藏 InsightPanel → 触发搜索
```

### 缓存结构

```ts
// QuickCreateTrailScreen 内部 state
const insightCache = useRef<Map<string, InsightProfile>>(new Map());

// key: 'week' | 'month'
// 读: insightCache.current.get(timeRange)
// 写: AI 返回后 .set(timeRange, profile)
// 清: reflections 变化时 .clear()
```

### AI Prompt 设计

```
System: 你是感念分析助手。分析用户的反思记录，提取有意义的主题词。
要求：
1. 一句话整体洞察（20字以内，温暖、有启发性）
2. 提取 3-5 个高频主题词，每个词需要：
   - word: 主题词（2-4个字）
   - count: 出现次数
   - category: 自由分类
   - reason: 一句话解释为什么这个词重要
3. 每个主题词关联对应的感念序号
输出JSON: {"summary":"...", "topics":[{"word":"...","count":3,"category":"...","reason":"...","reflectionIndices":[0,1,2]}]}

User: 以下是用户最近{days}天的{count}条感念记录：
[0] 6/10 😌 #成长 "今天突然理解了不执着的含义..."
[1] 6/09 😰 #焦虑 "工作压力很大..."
...
请分析并提取高频主题词。
```

### 点击 → 搜索映射

| 点击项 | searchQuery | 匹配逻辑 |
|--------|-------------|----------|
| 标签 #焦虑 | `'焦虑'` | matchByKeyword: tags x5 + content x3 |
| 心情 😰 焦虑 | `'焦虑'` | matchByKeyword: mood x2 + content x3 |
| 主题词 "压力" | `'压力'` | matchByKeyword: content x3 |
| 快速入口 | `''` | preset 筛选（已有逻辑） |

### 骨架屏实现

使用 `Animated` 循环渐变遮罩：

```tsx
// shimmer 动画：从左到右的线性渐变
const shimmerAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  const loop = Animated.loop(
    Animated.timing(shimmerAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    })
  );
  loop.start();
  return () => loop.stop();
}, []);

// 渐变遮罩位置
const translateX = shimmerAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [-200, 400],
});
```

### 组件 Props 设计

```tsx
// InsightPanel
interface InsightPanelProps {
  visible: boolean;
  reflections: MindReflection[];
  onTagPress: (tag: string) => void;
  onMoodPress: (mood: string) => void;
  onTopicPress: (word: string) => void;
  onPresetPress: (presetKey: string) => void;
  onGoRecord: () => void;
}

// TopicChip
interface TopicChipProps {
  word: string;
  category: string;
  count: number;
  onPress: () => void;
}

// MoodBar
interface MoodBarProps {
  mood: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
  onPress: () => void;
}
```
