## Context

当前思维脉络推荐系统由两部分组成：

1. **本地算法** (`computeRecommendations`) — 在 `trail-creation.ts` 中实现，检测三种模式：
   - 心情变化链 (`detectMoodNarrative`)
   - 标签聚焦链 (`detectTagFocus`)
   - 时间规律链 (`detectTimePattern`)

2. **云端 AI** (`recommendTrailsViaAI`) — 在 `trail-recommender.ts` 中实现，已导出但未在主流程中使用

**现状问题**：
- 两个推荐系统割裂，没有结合
- 推荐卡片展开体验不佳（独立 View 而非卡片内部）
- 智能查询只在 QuickCreateTrailScreen 中使用

## Goals / Non-Goals

**Goals:**
- 混合本地 + AI 推荐，提升推荐质量
- 增强卡片交互体验（整卡展开、理由展示、反馈）
- 在思维脉络主页整合智能查询
- 支持"换一批"刷新和用户偏好学习

**Non-Goals:**
- 不改动 QuickCreateTrailScreen 的智能查询逻辑
- 不做语音输入
- 不改动云端 AI 基础设施（AIService、provider）
- 不做跨页面搜索

## Decisions

### Decision 1: 混合推荐策略

**选择**: 本地算法优先 + AI 补充

**方案对比**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| A) 纯本地 | 快速、无依赖 | 无法理解语义 |
| B) 纯 AI | 语义理解强 | 需要网络、有延迟 |
| C) 本地优先 + AI 补充 | 快速响应 + 语义增强 | 实现复杂度稍高 |

**决策**: 选择方案 C
- 本地算法立即显示（< 100ms），保证用户体验
- AI 推荐后台加载，可用时合并到结果中
- 两者结果通过 `reflectionIds` 重叠度去重

**实现**:
```typescript
// 新增函数
export async function computeHybridRecommendations(
  reflections: MindReflection[],
  allTrails: ThoughtTrail[],
  aiAvailable: boolean,
): Promise<TrailRecommendation[]>

// 内部流程
1. computeRecommendations() → 本地推荐
2. recommendTrailsViaAI() → AI 推荐（如果可用）
3. mergeAndRank() → 去重 + 排序
```

### Decision 2: 推荐理由生成

**选择**: 本地模板 + AI 补充

**方案对比**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| A) 纯本地模板 | 快速、可控 | 模板有限，可能重复 |
| B) AI 生成 | 灵活、自然 | 需要网络、有延迟 |
| C) 本地优先 + AI 补充 | 快速 + 灵活 | 实现复杂度稍高 |

**决策**: 选择方案 C
- 本地推荐使用模板生成理由（基于 type 和 mood 变化）
- AI 推荐直接使用 AI 返回的理由
- 混合推荐时优先使用 AI 理由

**实现**:
```typescript
// 新增函数
export function generateRecommendationReason(rec: TrailRecommendation): string

// 模板示例
- mood 类型: "发现你在 {dateRange} 的情绪从 {firstMood} 转向 {lastMood}"
- tag 类型: "围绕 #{tag} 的 {count} 条感念，展现了持续的思考"
- time 类型: "{timeSlot} 独处时的深度反思"
```

### Decision 3: 卡片交互设计

**选择**: 整卡可点击展开 + 独立按钮区域

**交互流程**:
```
┌─────────────────────────────────────────┐
│  💡 "从焦虑到平静"                      │  ← 点击整卡展开
│  😰 → 😌 · 5条感念 · 3天               │
│  "从工作压力的焦虑中找到了平静"         │
│                                         │
│  ┌─────────────────────────────────┐   │  ← 展开后显示
│  │ 🤖 推荐理由                      │   │
│  │ AI 发现你在3月初的工作压力下...   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [快速创建 →]  [不感兴趣]              │  ← 按钮区域
└─────────────────────────────────────────┘
```

**实现**:
- `RecommendCard` 组件接收 `isExpanded` 和 `onToggleExpand` props
- 点击卡片任意区域触发 `onToggleExpand`
- "快速创建"和"不感兴趣"按钮使用 `stopPropagation` 阻止冒泡

### Decision 4: 智能查询整合

**选择**: 复用 SmartQueryBubble 组件

**交互流程**:
```
用户输入自然语言
      │
      ▼
parseSmartQuery() 分析意图
      │
      ├─ 有追问 → SmartQueryBubble 展示
      │           用户回答后重新查询
      │
      └─ 无追问 → 应用过滤器
                  matchReflectionsToTopic() 匹配
                  展示结果 + 快速创建按钮
```

**实现**:
- MindTrailScreen 添加查询状态
- 复用 SmartQueryBubble 组件
- 查询结果可以快速创建脉络

### Decision 5: 用户偏好学习

**选择**: 基于忽略记录的简单降权

**方案对比**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| A) 纯内存 | 简单 | 不持久化 |
| B) Zustand store 持久化 | 跨会话保留 | 需要存储空间 |
| C) 复杂 ML 模型 | 精准 | 过度设计 |

**决策**: 选择方案 B
- 在 Zustand store 中记录 `ignoredRecPatterns`
- 推荐时检查是否与忽略模式匹配，匹配则降权
- 模式基于：type + primaryTag + mood 组合

**实现**:
```typescript
// store 中新增
interface AppState {
  ignoredRecPatterns: string[]; // ["mood:#工作", "tag:焦虑", ...]
  addIgnoredRecPattern: (pattern: string) => void;
}

// 推荐时应用
function applyUserPreferences(
  recs: TrailRecommendation[],
  ignored: string[],
): TrailRecommendation[]
```

## Risks / Trade-offs

**Risk 1: AI 推荐延迟影响体验**
- Mitigation: 本地推荐立即显示，AI 推荐后台加载
- 用户看到的是本地推荐，AI 推荐加载完成后合并

**Risk 2: AI 推荐质量不稳定**
- Mitigation: 设置 confidence 阈值，低于阈值的 AI 推荐不展示
- 本地推荐作为保底

**Risk 3: 用户偏好学习过于简单**
- Mitigation: 先实现简单降权，后续可扩展为更复杂的模型
- 当前方案足够处理明显的重复推荐

**Risk 4: 智能查询增加页面复杂度**
- Mitigation: 查询入口可折叠，默认不显示
- 用户可以忽略查询功能，继续使用原有推荐
