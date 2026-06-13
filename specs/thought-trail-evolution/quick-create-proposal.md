# 快速创建脉络 — 设计方案

> 搜索引擎式统一入口，一步创建思维脉络

**关联文档**: [思维脉络系统深度设计](./design.md) | **日期**: 2026-06-11

---

## 1. 问题定义

### 1.1 当前创建流程的摩擦

```
当前路径 A（从脉络列表）:
  感念页 → 脉络卡片 → 脉络列表 → +按钮 → 填名称 → 选感念 → 确认
  共 6 步，3 个页面跳转

当前路径 B（从感念长按）:
  感念列表 → 长按 → 菜单 → 关联脉络 → 选脉络/新建 → 填名称 → 选感念 → 确认
  共 7 步，交互链路过长
```

**核心痛点**:

| 痛点 | 说明 |
|------|------|
| 名称必填 | 用户还没选感念就要先想名字，认知负担重 |
| 选择感念是平铺列表 | 没有分组/推荐，感念多了很难找 |
| 没有智能建议 | 系统不帮忙，用户自己判断哪些感念该放一起 |
| `source: 'auto'` 是空壳 | 数据模型预留了自动/推荐，但从未实现 |
| 多步确认 | 填名称 → 选感念 → 确认，三步才能创建 |

### 1.2 目标

- **最快路径 2 步**: 打开 → 点击推荐 → 创建完成
- **最短路径 3 步**: 打开 → 输入关键词 → 创建完成
- **最精路径 5 步**: 打开 → 输入描述 → 筛选 → 精选 → 创建完成

---

## 2. 设计方案

### 2.1 页面结构 — 搜索引擎式统一入口

一个页面，不分工 Tab，搜索框 + 筛选器 + 推荐结果，层层递进。

```
┌──────────────────────────────────────────┐
│  ← 快速创建脉络                    关闭   │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🔍 描述你想追踪的思路...    [发送] │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [本月▾] [#工作] [#生活] [😰] [😊]       │
│  [最近心情变化] [未归属] [深夜思考]       │
│                                          │
│  ── 推荐思路链 ──────────────────────     │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 💡 "从焦虑到行动"                │    │
│  │ 😰→😐→🤔→😊→😊  5/1─5/10       │    │
│  │ 5条 · #工作 · 情绪↗上升          │    │
│  │ "从加班焦虑到找到节奏的完整路径"   │    │
│  │                    [一键生成]     │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ 💡 "深夜的自我对话"              │    │
│  │ 🤔→😰→😐→😊      5/2─5/11      │    │
│  │ 4条 · 23:00后 · 情绪↗上升        │    │
│  │ "深夜独处时的深度反思"            │    │
│  │                    [一键生成]     │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ 💡 "#工作 专题"                  │    │
│  │ 😰→😐→😊→😊→😐→😰→😊→😊       │    │
│  │ 8条 · #工作 · 跨度15天           │    │
│  │ "工作相关的情绪起伏和成长"        │    │
│  │                    [一键生成]     │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

### 2.2 两种交互路径

**路径 A: 点击推荐 → 一键生成**

```
用户看到推荐 → 点「一键生成」→ 卡片展开为感念列表（预选全部）
→ 可增删 → 命名（自动生成，可改）→ 创建 → 跳转详情页

步骤: 1-2 步
```

**路径 B: 输入描述 → 匹配 → 筛选 → 创建**

```
用户输入 "最近工作的焦虑"
→ 匹配结果列表（默认全选）
→ 用筛选器进一步过滤
→ 命名（自动生成，可改）→ 创建 → 跳转详情页

步骤: 3-5 步
```

### 2.3 页面状态流转

```
                    ┌─────────┐
                    │  初始态  │
                    │ (推荐页) │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │ 点击推荐卡片  │         │ 输入描述/筛选 │
    └──────┬───────┘         └──────┬───────┘
           │                        │
           ▼                        ▼
    ┌──────────────┐         ┌──────────────┐
    │ 预览感念列表  │         │ 匹配结果列表  │
    │ (可增删)     │←────────│ (可增删+筛选) │
    └──────┬───────┘         └──────┬───────┘
           │                        │
           └────────────┬───────────┘
                        ▼
                ┌──────────────┐
                │  确认创建     │
                │ (命名+确认)   │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ 跳转详情页    │
                └──────────────┘
```

两种入口最终汇入同一个「预览感念列表」状态，共享后续流程。

### 2.4 多对多关系

一个感念可以属于多个脉络。数据模型已支持（`thoughtTrailIds: string[]`），不需要修改。

**UI 处理**:
- 推荐卡片标注「其中 N 条已属于其他脉络」
- 提供「仅选择未归属的感念」快捷筛选
- 创建成功后，若有重叠，轻提示「X 条感念同时属于其他脉络」

---

## 3. 页面详细设计

### 3.1 组件层级

```
QuickCreateTrailScreen (全屏页面，Stack 导航)
├── SafeAreaView
│   ├── HeaderBar                    ← 返回箭头 + 标题 + 关闭按钮
│   ├── ScrollView
│   │   ├── SearchBar                ← 搜索输入框 + 发送按钮
│   │   ├── FilterRow                ← 横向滚动筛选条
│   │   │   ├── TimeRangeChip        ← 时间范围下拉
│   │   │   ├── TagChip[]            ← 标签筛选（TagPill 复用）
│   │   │   ├── MoodChip[]           ← 心情筛选（TagPill 复用）
│   │   │   └── PresetChip[]         ← 快速预设
│   │   ├── RecommendSection         ← 推荐区（初始态显示）
│   │   │   └── RecommendCard[]      ← 推荐卡片 ×3
│   │   └── MatchSection             ← 匹配结果区（输入后显示）
│   │       └── ReflectionCheckItem[] ← 可勾选的感念条目
│   └── CreatePanel                  ← 底部固定面板（有选中时显示）
│       ├── SelectionSummary         ← 已选摘要（情绪时间线）
│       ├── TrailNameInput           ← 脉络名称输入
│       └── CreateButton             ← 创建按钮
```

### 3.2 状态管理

页面内部使用 `useState` 管理，不需要新增 store slice。

```typescript
// 页面状态
const [searchQuery, setSearchQuery] = useState('');
const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months' | 'all'>('month');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
const [activePreset, setActivePreset] = useState<string | null>(null);

// 推荐结果（本地计算）
const [recommendations, setRecommendations] = useState<TrailRecommendation[]>([]);

// 匹配结果（本地或AI）
const [matchResults, setMatchResults] = useState<MindReflection[]>([]);
const [matchMode, setMatchMode] = useState<'local' | 'ai'>('local');
const [isMatching, setIsMatching] = useState(false);

// 已选感念
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// 脉络名称
const [trailName, setTrailName] = useState('');

// 展开的推荐卡片（null = 无展开，number = 展开的索引）
const [expandedCard, setExpandedCard] = useState<number | null>(null);
```

### 3.3 数据流

```
筛选条件变化
    │
    ▼
computeCandidatePool(reflections, filters)  ← 本地，毫秒
    │
    ├──→ computeRecommendations(candidates)  ← 本地，毫秒
    │        │
    │        ▼
    │    setRecommendations(...)             ← 推荐区更新
    │
    └──→ (如果有 searchQuery)
              │
              ├──→ matchByKeyword(query, candidates)  ← 本地，毫秒
              │        │
              │        ▼
              │    setMatchResults(...)       ← 匹配区更新
              │
              └──→ (如果本地匹配 < 3 且 AI 可用)
                        │
                        └──→ matchByAI(query, candidates)  ← 云端，秒级
                                 │
                                 ▼
                             setMatchResults(...)  ← 匹配区追加
```

### 3.4 搜索框设计

```
┌──────────────────────────────────────────┐
│  ┌──────────────────────────────────┐    │
│  │ Search  描述你想追踪的思路...  ➤  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  模式指示:                                │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🔍 本地   │  │ 🤖 AI    │             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘
```

**交互逻辑**:
- 输入为空: 显示推荐区（3 条推荐卡片）
- 输入有内容 + 回车/点发送: 触发匹配
- 本地匹配 ≥ 3 条: 直接展示结果，模式指示显示「🔍 本地」
- 本地匹配 < 3 条 + AI 可用: 自动切换到 AI 匹配，模式指示显示「🤖 AI 分析中...」
- 本地匹配 < 3 条 + AI 不可用: 展示本地结果 + 提示「尝试换个关键词」

**样式**（复用现有搜索框模式）:

```tsx
<View style={{
  flexDirection: 'row', alignItems: 'center', gap: 6,
  backgroundColor: TH.card, borderRadius: 12,
  paddingHorizontal: 12, paddingVertical: 10,
  borderWidth: 1, borderColor: TH.border,
}}>
  <Search size={18} color={TH.sub} />
  <TextInput
    value={searchQuery}
    onChangeText={setSearchQuery}
    onSubmitEditing={handleSearch}
    placeholder={T('quickTrailSearchPlaceholder')}
    placeholderTextColor={TH.sub}
    style={{ flex: 1, color: TH.text, fontSize: FONT_BODY, padding: 0 }}
    returnKeyType="search"
  />
  {searchQuery.length > 0 ? (
    <TouchableOpacity onPress={handleClear}>
      <X size={16} color={TH.sub} />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity onPress={handleSearch}>
      <Send size={18} color={TH.primary} />
    </TouchableOpacity>
  )}
</View>
```

### 3.5 筛选器行设计

```
┌──────────────────────────────────────────────────────────┐
│ ← [本月▾] [#工作] [#生活] [#反思] [😰] [😊] [🌿] →      │
│                                                          │
│  [最近心情变化]  [未归属]  [深夜思考]                      │
└──────────────────────────────────────────────────────────┘
```

**第一行: 条件筛选**（横向 ScrollView）

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {/* 时间范围 — 下拉触发 */}
  <ChipDropdown
    label={timeRangeLabel}
    icon={<Calendar size={14} />}
    options={[
      { key: 'week', label: T('thisWeek') },
      { key: 'month', label: T('thisMonth') },
      { key: '3months', label: T('last3Months') },
      { key: 'all', label: T('allTime') },
    ]}
    selected={timeRange}
    onSelect={setTimeRange}
  />

  {/* 标签 — 复用 TagPill，支持多选 */}
  {userTags.map(tag => (
    <TagPill
      key={tag}
      label={`#${tag}`}
      active={selectedTags.includes(tag)}
      onPress={() => toggleTag(tag)}
      color={TH.primary}
    />
  ))}

  {/* 心情 — 复用 TagPill */}
  {userMoods.map(mood => (
    <TagPill
      key={mood}
      label={`${getMoodIcon(mood)} ${mood}`}
      active={selectedMoods.includes(mood)}
      onPress={() => toggleMood(mood)}
      color={TH.accent}
    />
  ))}
</ScrollView>
```

**第二行: 快速预设**（横向 ScrollView）

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {PRESETS.map(preset => (
    <TouchableOpacity
      key={preset.key}
      onPress={() => applyPreset(preset.key)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 16, borderWidth: 1,
        backgroundColor: activePreset === preset.key ? `${TH.primary}15` : TH.card,
        borderColor: activePreset === preset.key ? TH.primary : TH.border,
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: FONT_SMALL }}>{preset.icon}</Text>
      <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>{preset.label}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

**预设定义**:

```typescript
const PRESETS = [
  {
    key: 'moodChange',
    icon: '📈',
    label: '最近心情变化',
    filter: (refs) => refs.filter(r => /* 最近7天心情有变化 */),
  },
  {
    key: 'unassigned',
    icon: '📌',
    label: '未归属感念',
    filter: (refs) => refs.filter(r => !r.thoughtTrailIds?.length),
  },
  {
    key: 'nightThoughts',
    icon: '🌙',
    label: '深夜思考',
    filter: (refs) => refs.filter(r => new Date(r.timestamp).getHours() >= 23),
  },
];
```

### 3.6 推荐卡片设计

```
┌──────────────────────────────────────────┐
│  ┌─ 左侧装饰条 (#8B5CF6) ────────────┐  │
│  │                                    │  │
│  │  💡 "从焦虑到行动"                 │  │
│  │                                    │  │
│  │  😰 → 😐 → 🤔 → 😊 → 😊          │  │
│  │  5/1   5/3   5/5   5/7  5/10      │  │
│  │                                    │  │
│  │  5条感念 · #工作 · 跨度10天        │  │
│  │  情绪趋势: ↗ 上升                  │  │
│  │                                    │  │
│  │  "从加班焦虑开始，经历反思，        │  │
│  │   最终找到工作节奏"                 │  │
│  │                                    │  │
│  │  2条已属于其他脉络                  │  │
│  │                                    │  │
│  │                    [一键生成 →]     │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**样式**（复用 MindTrailEntryCard 的装饰条模式）:

```tsx
<View style={{
  backgroundColor: TH.card, borderRadius: 12,
  borderWidth: 1, borderColor: TH.border,
  marginBottom: 12, overflow: 'hidden',
}}>
  {/* 左侧装饰条 */}
  <View style={{
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: '#8B5CF6',
  }} />

  <View style={{ padding: 14, paddingLeft: 18 }}>
    {/* 标题 */}
    <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>
      💡 "{rec.name}"
    </Text>

    {/* 心情时间线 */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
      {rec.moods.map((mood, i) => (
        <React.Fragment key={i}>
          <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(mood)}</Text>
          {i < rec.moods.length - 1 && (
            <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>→</Text>
          )}
        </React.Fragment>
      ))}
    </View>

    {/* 日期范围 */}
    <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 4 }}>
      {formatDate(rec.startDate)}─{formatDate(rec.endDate)}
    </Text>

    {/* 统计行 */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
        {rec.count}条感念
      </Text>
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
        #{rec.primaryTag}
      </Text>
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
        跨度{rec.spanDays}天
      </Text>
      <Text style={{ fontSize: FONT_SMALL, color: trendColor(rec.trend) }}>
        {trendArrow(rec.trend)} {trendLabel(rec.trend)}
      </Text>
    </View>

    {/* 叙事摘要 */}
    <Text style={{
      fontSize: FONT_SMALL, color: TH.sub, marginTop: 6,
      fontStyle: 'italic', lineHeight: 18,
    }}>
      "{rec.narrative}"
    </Text>

    {/* 已归属提示 */}
    {rec.assignedCount > 0 && (
      <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
        {rec.assignedCount}条已属于其他脉络
      </Text>
    )}

    {/* 操作按钮 */}
    <TouchableOpacity
      onPress={() => handleQuickGenerate(rec)}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
        marginTop: 10, gap: 4,
      }}
    >
      <Text style={{ fontSize: FONT_BUTTON, color: TH.primary, fontWeight: '600' }}>
        一键生成
      </Text>
      <ChevronRight size={16} color={TH.primary} />
    </TouchableOpacity>
  </View>
</View>
```

### 3.7 匹配结果列表设计

```
┌──────────────────────────────────────────┐
│  🔍 匹配结果 · 6条感念                   │
│                                          │
│  ☑️ ┌──────────────────────────────────┐ │
│    │ 5/1  😰 #工作 "加班到很晚，       │ │
│    │      感觉压力很大..."              │ │
│    │      📎 脉络: 工作焦虑             │ │
│    └──────────────────────────────────┘ │
│  ☑️ ┌──────────────────────────────────┐ │
│    │ 5/3  😐 #工作 "反思了一下，       │ │
│    │      是不是对自己要求太高了"       │ │
│    └──────────────────────────────────┘ │
│  ☐  ┌──────────────────────────────────┐ │
│    │ 5/8  😰 #生活 "又开始想工作       │ │
│    │      的事了，周末也不安"           │ │
│    └──────────────────────────────────┘ │
│  ...                                     │
│                                          │
│  [全选]  [仅未归属]  已选 4 条            │
│                                          │
│  匹配理由: 关键词「工作」「焦虑」        │
└──────────────────────────────────────────┘
```

**样式**（复用 ReflectionCard 的卡片样式）:

```tsx
<TouchableOpacity
  onPress={() => toggleSelect(ref.id)}
  style={{
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: TH.card, borderRadius: 12,
    borderWidth: 1, borderColor: isSelected ? TH.primary : TH.border,
    padding: 12, marginBottom: 8, gap: 10,
  }}
>
  {/* 勾选框 */}
  <View style={{
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: isSelected ? TH.primary : TH.border,
    backgroundColor: isSelected ? TH.primary : 'transparent',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  }}>
    {isSelected && <Check size={14} color="#fff" />}
  </View>

  {/* 感念内容 */}
  <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
        {formatDate(ref.timestamp)}
      </Text>
      <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(ref.mood)}</Text>
      {ref.tags.slice(0, 2).map(tag => (
        <Text key={tag} style={{
          fontSize: FONT_TINY, color: TH.primary,
          backgroundColor: `${TH.primary}15`,
          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
        }}>
          #{tag}
        </Text>
      ))}
    </View>
    <Text style={{
      fontSize: FONT_BODY, color: TH.text, marginTop: 4,
      lineHeight: 20,
    }} numberOfLines={2}>
      {ref.content}
    </Text>
    {/* 已归属脉络 */}
    {ref.thoughtTrailIds?.length > 0 && (
      <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
        📎 已属于 {ref.thoughtTrailIds.length} 个脉络
      </Text>
    )}
  </View>
</TouchableOpacity>
```

### 3.8 推荐卡片展开为感念列表

点击「一键生成」后，推荐卡片展开，显示该组的感念列表：

```
┌──────────────────────────────────────────┐
│  💡 "从焦虑到行动"               [收起 ∧] │
│                                          │
│  ☑️ 5/1  😰 "加班到很晚..."              │
│  ☑️ 5/3  😐 "反思了一下..."              │
│  ☑️ 5/5  🤔 "跟朋友聊了聊..."            │
│  ☑️ 5/7  😊 "想通了，接受不完美"          │
│  ☑️ 5/10 😊 "状态好了很多"               │
│                                          │
│  [全选] [取消全选]  已选 5 条              │
└──────────────────────────────────────────┘
```

展开动画使用 React Native `Animated.timing`（与现有代码一致）:

```tsx
const expandAnim = useRef(new Animated.Value(0)).current;

const handleExpand = (index: number) => {
  setExpandedCard(index);
  expandAnim.setValue(0);
  Animated.timing(expandAnim, {
    toValue: 1,
    duration: 250,
    useNativeDriver: false,
  }).start();
};
```

### 3.9 底部创建面板

当有感念被选中时，底部固定面板出现：

```
┌──────────────────────────────────────────┐
│                                          │
│  已选 4 条 · 😰→😐→😊→😊                │
│  5/1 ─── 5/3 ─── 5/7 ─── 5/10           │
│                                          │
│  脉络名称:                               │
│  ┌──────────────────────────────────┐    │
│  │ 从焦虑到行动              [编辑✎] │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │       创建脉络 (4条感念)          │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

**样式**:

```tsx
{selectedIds.size > 0 && (
  <View style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: TH.cardSolid,
    borderTopWidth: 1, borderTopColor: TH.border,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: 40, // 底部安全区
  }}>
    {/* 已选摘要 */}
    <SelectionSummary
      count={selectedIds.size}
      moods={selectedMoods}
      dateRange={selectedDateRange}
    />

    {/* 名称输入 */}
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: TH.bg, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: TH.border,
      marginTop: 8,
    }}>
      <TextInput
        value={trailName}
        onChangeText={setTrailName}
        placeholder={T('quickTrailNamePlaceholder')}
        placeholderTextColor={TH.sub}
        style={{ flex: 1, color: TH.text, fontSize: FONT_BODY, padding: 0 }}
      />
      <TouchableOpacity onPress={regenerateName}>
        <RefreshCw size={16} color={TH.sub} />
      </TouchableOpacity>
    </View>

    {/* 创建按钮 */}
    <TouchableOpacity
      onPress={handleCreate}
      style={{
        backgroundColor: TH.primary, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        marginTop: 10,
      }}
    >
      <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '700' }}>
        {T('quickTrailCreate')} ({selectedIds.size}{T('quickTrailReflections')})
      </Text>
    </TouchableOpacity>
  </View>
)}
```

### 3.10 创建流程

```typescript
const handleCreate = async () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  // 自动生成名称（如果用户没有修改）
  const name = trailName || generateTrailName(
    ids.map(id => reflections.find(r => r.id === id)).filter(Boolean) as MindReflection[],
    T
  );

  // 调用 store action
  const trailId = store.createThoughtTrail(name, '', ids, 'manual');

  // 跳转详情页
  nav.navigate('ThoughtTrailDetail', { trailId });
};
```

### 3.11 HeaderBar 设计

```tsx
<View style={{
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  paddingHorizontal: 16, paddingVertical: 12,
  borderBottomWidth: 1, borderBottomColor: TH.border,
}}>
  <TouchableOpacity onPress={() => nav.goBack()}>
    <ArrowLeft size={24} color={TH.text} />
  </TouchableOpacity>
  <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
    {T('quickCreateTrail')}
  </Text>
  <TouchableOpacity onPress={() => nav.goBack()}>
    <X size={24} color={TH.sub} />
  </TouchableOpacity>
</View>
```

---

## 4. 推荐算法

### 4.1 缩域策略 — 先缩小范围再推荐

```
原始感念池 (200条)
       │
       ▼
  ┌─────────────┐
  │ 时间窗口筛选  │  默认: 最近30天
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ 标签/心情筛选 │  可选
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ 关键词过滤   │  用户输入
  └──────┬──────┘
         │
         ▼
   候选池 (20-40条)
         │
    ┌────┴────┐
    ▼         ▼
  本地分组   AI推荐
```

### 4.2 候选池计算

```typescript
function computeCandidatePool(
  reflections: MindReflection[],
  filters: {
    timeRange: 'week' | 'month' | '3months' | 'all';
    tags: string[];
    moods: string[];
    query?: string;
    preset?: string;
  }
): MindReflection[] {
  let pool = reflections.filter(r => !r.deleted);

  // 时间筛选
  if (filters.timeRange !== 'all') {
    const now = Date.now();
    const ranges = { week: 7, month: 30, '3months': 90 };
    const days = ranges[filters.timeRange];
    const cutoff = now - days * 86400000;
    pool = pool.filter(r => r.timestamp >= cutoff);
  }

  // 标签筛选（OR 关系）
  if (filters.tags.length > 0) {
    pool = pool.filter(r =>
      r.tags.some(t => filters.tags.includes(t))
    );
  }

  // 心情筛选（OR 关系）
  if (filters.moods.length > 0) {
    pool = pool.filter(r => filters.moods.includes(r.mood));
  }

  // 预设筛选
  if (filters.preset) {
    const presetDef = PRESETS.find(p => p.key === filters.preset);
    if (presetDef) pool = presetDef.filter(pool);
  }

  // 关键词筛选
  if (filters.query) {
    const q = filters.query.toLowerCase();
    pool = pool.filter(r =>
      r.content.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      r.mood.toLowerCase().includes(q)
    );
  }

  // 按时间倒序
  return pool.sort((a, b) => b.timestamp - a.timestamp);
}
```

### 4.3 推荐计算 — 三种维度

```typescript
interface TrailRecommendation {
  name: string;
  narrative: string;           // 一句话叙事
  reflectionIds: string[];     // 包含的感念 ID
  moods: string[];             // 按时间排列的心情序列
  primaryTag: string;          // 主要标签
  startDate: number;
  endDate: number;
  spanDays: number;
  trend: 'up' | 'down' | 'flat'; // 情绪趋势
  assignedCount: number;       // 已属于其他脉络的数量
  score: number;               // 排序分数
  type: 'mood' | 'tag' | 'time'; // 推荐类型
}

function computeRecommendations(
  candidates: MindReflection[],
  allTrails: ThoughtTrail[]
): TrailRecommendation[] {
  const recs: TrailRecommendation[] = [];

  // 维度 1: 情绪叙事型
  const moodRec = detectMoodNarrative(candidates);
  if (moodRec) recs.push(moodRec);

  // 维度 2: 主题聚焦型
  const tagRec = detectTagFocus(candidates);
  if (tagRec) recs.push(tagRec);

  // 维度 3: 时间规律型
  const timeRec = detectTimePattern(candidates);
  if (timeRec) recs.push(timeRec);

  // 按分数排序，取 top 3
  return recs
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(rec => ({
      ...rec,
      assignedCount: rec.reflectionIds.filter(id => {
        const r = candidates.find(c => c.id === id);
        return r?.thoughtTrailIds && r.thoughtTrailIds.length > 0;
      }).length,
    }));
}
```

### 4.4 维度 1: 情绪叙事型

检测心情变化最明显的一组感念：

```typescript
function detectMoodNarrative(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  // 按时间排序
  const sorted = [...refs].sort((a, b) => a.timestamp - b.timestamp);

  // 滑动窗口找心情变化最大的连续子序列
  let bestWindow: MindReflection[] = [];
  let bestScore = 0;

  for (let size = 3; size <= Math.min(8, sorted.length); size++) {
    for (let i = 0; i <= sorted.length - size; i++) {
      const window = sorted.slice(i, i + size);
      const moods = window.map(r => r.mood);
      const uniqueMoods = new Set(moods).size;
      const hasTransition = hasMoodTransition(moods);

      // 评分: 心情种类 × 2 + 有转变 × 3 + 数量适中 × 1
      const score = uniqueMoods * 2 + (hasTransition ? 3 : 0) + (size >= 4 && size <= 6 ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestWindow = window;
      }
    }
  }

  if (bestWindow.length < 3) return null;

  return {
    name: generateNarrativeName(bestWindow),
    narrative: generateNarrative(bestWindow),
    reflectionIds: bestWindow.map(r => r.id),
    moods: bestWindow.map(r => r.mood),
    primaryTag: getMostFrequentTag(bestWindow),
    startDate: bestWindow[0].timestamp,
    endDate: bestWindow[bestWindow.length - 1].timestamp,
    spanDays: daysBetween(bestWindow[0].timestamp, bestWindow[bestWindow.length - 1].timestamp),
    trend: computeMoodTrend(bestWindow),
    assignedCount: 0,
    score: bestScore,
    type: 'mood',
  };
}

function hasMoodTransition(moods: string[]): boolean {
  for (let i = 1; i < moods.length; i++) {
    if (moods[i] !== moods[i - 1]) return true;
  }
  return false;
}
```

### 4.5 维度 2: 主题聚焦型

检测标签最集中的感念组：

```typescript
function detectTagFocus(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  // 统计标签频次
  const tagCounts = new Map<string, MindReflection[]>();
  for (const r of refs) {
    for (const tag of r.tags) {
      const arr = tagCounts.get(tag) ?? [];
      arr.push(r);
      tagCounts.set(tag, arr);
    }
  }

  // 找感念最多且心情有变化的标签
  let bestTag = '';
  let bestScore = 0;

  for (const [tag, tagRefs] of tagCounts) {
    if (tagRefs.length < 3) continue;
    const uniqueMoods = new Set(tagRefs.map(r => r.mood)).size;
    const score = tagRefs.length + uniqueMoods * 2;

    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    }
  }

  if (!bestTag) return null;

  const tagRefs = tagCounts.get(bestTag)!;
  const sorted = tagRefs.sort((a, b) => a.timestamp - b.timestamp);
  const limited = sorted.slice(0, 8); // 最多8条

  return {
    name: `#${bestTag}`,
    narrative: generateTagNarrative(bestTag, limited),
    reflectionIds: limited.map(r => r.id),
    moods: limited.map(r => r.mood),
    primaryTag: bestTag,
    startDate: limited[0].timestamp,
    endDate: limited[limited.length - 1].timestamp,
    spanDays: daysBetween(limited[0].timestamp, limited[limited.length - 1].timestamp),
    trend: computeMoodTrend(limited),
    assignedCount: 0,
    score: bestScore,
    type: 'tag',
  };
}
```

### 4.6 维度 3: 时间规律型

检测按时段聚类的感念：

```typescript
function detectTimePattern(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  // 按小时分组
  const hourGroups = new Map<number, MindReflection[]>();
  for (const r of refs) {
    const hour = new Date(r.timestamp).getHours();
    const arr = hourGroups.get(hour) ?? [];
    arr.push(r);
    hourGroups.set(hour, arr);
  }

  // 找感念最多的时段（合并相邻小时）
  const timeSlots = [
    { label: '深夜', range: [23, 0, 1, 2, 3], icon: '🌙' },
    { label: '清晨', range: [5, 6, 7], icon: '🌅' },
    { label: '午间', range: [12, 13], icon: '☀️' },
    { label: '傍晚', range: [17, 18, 19], icon: '🌇' },
  ];

  let bestSlot = timeSlots[0];
  let bestRefs: MindReflection[] = [];

  for (const slot of timeSlots) {
    const slotRefs = refs.filter(r => {
      const hour = new Date(r.timestamp).getHours();
      return slot.range.includes(hour);
    });
    if (slotRefs.length > bestRefs.length) {
      bestSlot = slot;
      bestRefs = slotRefs;
    }
  }

  if (bestRefs.length < 3) return null;

  const sorted = bestRefs.sort((a, b) => a.timestamp - b.timestamp);
  const limited = sorted.slice(0, 8);

  return {
    name: `${bestSlot.icon} ${bestSlot.label}的思考`,
    narrative: generateTimeNarrative(bestSlot.label, limited),
    reflectionIds: limited.map(r => r.id),
    moods: limited.map(r => r.mood),
    primaryTag: getMostFrequentTag(limited),
    startDate: limited[0].timestamp,
    endDate: limited[limited.length - 1].timestamp,
    spanDays: daysBetween(limited[0].timestamp, limited[limited.length - 1].timestamp),
    trend: computeMoodTrend(limited),
    assignedCount: 0,
    score: bestRefs.length,
    type: 'time',
  };
}
```

### 4.7 叙事生成

```typescript
function generateNarrative(refs: MindReflection[]): string {
  if (refs.length < 2) return '';

  const firstMood = refs[0].mood;
  const lastMood = refs[refs.length - 1].mood;
  const primaryTag = getMostFrequentTag(refs);

  if (firstMood === lastMood) {
    return `持续的${firstMood}状态，围绕${primaryTag}的思考`;
  }

  const templates: Record<string, Record<string, string>> = {
    '焦虑': {
      '平静': `从${primaryTag}的焦虑中找到了平静`,
      '开心': `经历${primaryTag}的焦虑后收获了满足`,
      '平静': `在${primaryTag}中从焦虑走向释然`,
    },
    '难过': {
      '平静': `从${primaryTag}的低落中慢慢恢复`,
      '开心': `经历了${primaryTag}的低谷后重新振作`,
    },
    '平静': {
      '开心': `在${primaryTag}中保持平静并收获成长`,
    },
  };

  return templates[firstMood]?.[lastMood]
    ?? `从${firstMood}到${lastMood}的${primaryTag}之路`;
}
```

### 4.8 情绪趋势计算

```typescript
function computeMoodTrend(refs: MindReflection[]): 'up' | 'down' | 'flat' {
  if (refs.length < 2) return 'flat';

  const MOOD_SCORES: Record<string, number> = {
    '难过': 1, '焦虑': 2, '生气': 2, '疲惫': 2,
    '平静': 3, '释然': 3, '淡定': 3,
    '开心': 4, '满足': 4, '感恩': 4, '兴奋': 4,
  };

  const scores = refs.map(r => MOOD_SCORES[r.mood] ?? 3);
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (avgSecond - avgFirst > 0.5) return 'up';
  if (avgFirst - avgSecond > 0.5) return 'down';
  return 'flat';
}

function trendArrow(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
}

function trendLabel(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '上升' : trend === 'down' ? '下降' : '平稳';
}

function trendColor(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : '#9E9E9E';
}
```

---

## 5. AI 匹配（Phase 2）

### 5.1 对话匹配数据流

```
用户输入: "最近工作的焦虑"
    │
    ▼
本地匹配 (毫秒级):
  关键词分词: ["工作", "焦虑"]
  命中: content 包含 "工作" → 8条
        content 包含 "焦虑" → 5条
        tags 包含 "工作" → 8条
  取并集 → 10条，按相关度排序
    │
    ├──≥ 3条→ 直接展示结果，标记「🔍 本地匹配」
    │
    └──< 3条→ 触发 AI 匹配
                │
                ▼
          AI 匹配 (秒级):
            候选池摘要压缩 → 发送给 LLM
            LLM 返回匹配结果 + 理由
            追加到结果列表，标记「🤖 AI 匹配」
```

### 5.2 摘要压缩

```typescript
function buildReflectionSummary(ref: MindReflection): string {
  const date = new Date(ref.timestamp).toLocaleDateString('zh-CN', {
    month: 'numeric', day: 'numeric',
  });
  const tags = ref.tags.length > 0 ? ` #${ref.tags.join(' #')}` : '';
  const content = ref.content.slice(0, 50);
  return `${date} ${ref.mood}${tags} "${content}${ref.content.length > 50 ? '...' : ''}"`;
}
```

### 5.3 AI 推荐 Prompt

```typescript
const AI_RECOMMEND_PROMPT = {
  system: `你是思维脉络分析助手。你的任务是从用户的反思记录中发现有意义的思路链。
要求：
- 每条链包含 3-6 条感念（用序号引用，从0开始）
- 链内感念应有叙事连贯性（时间线+情绪变化）
- 避免过于宽泛的分组（如"所有焦虑的感念"）
- 给出链的名称和一句话解释
- 输出JSON数组格式`,

  buildUser: (summaries: string[], query?: string) => {
    const list = summaries.map((s, i) => `[${i}] ${s}`).join('\n');
    const queryPart = query ? `\n\n用户想追踪的主题: "${query}"` : '';
    return `以下是用户的反思记录：\n${list}${queryPart}\n\n请发现 2-3 条有意义的思路链。`;
  },
};

// 期望输出格式
interface AIRecommendation {
  name: string;
  description: string;
  reflectionIndices: number[];
  confidence: number;
}
```

### 5.4 AI 匹配 Prompt

```typescript
const AI_MATCH_PROMPT = {
  system: `你是思维脉络分析助手。用户会描述一个想追踪的主题，你需要从反思记录中找到相关的感念。
要求：
- 返回相关感念的序号（从0开始）
- 给出每条感念的匹配理由
- 按相关度排序
- 输出JSON格式`,

  buildUser: (summaries: string[], topic: string) => {
    const list = summaries.map((s, i) => `[${i}] ${s}`).join('\n');
    return `以下是用户的反思记录：\n${list}\n\n用户想追踪的主题: "${topic}"\n\n请找到相关的感念。`;
  },
};

// 期望输出格式
interface AIMatchResult {
  reflectionIndex: number;
  reason: string;
  relevance: number;
}
```

---

## 6. 空状态与边界

### 6.1 感念数量不足（< 5 条）

```
┌──────────────────────────────────────────┐
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📝                              │    │
│  │ 你只有 2 条感念，还不足以         │    │
│  │ 发现有价值的思路链。              │    │
│  │                                  │    │
│  │ 继续记录感念，当积累到 5 条以上   │    │
│  │ 时，系统会自动发现你的思维模式。  │    │
│  │                                  │    │
│  │ [去记录感念]                      │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── 或者手动创建 ─────────────────        │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 选择感念创建脉络      [手动选择 →] │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

点击「手动选择」→ 展示所有感念的勾选列表（复用匹配结果列表样式）。

### 6.2 推荐无结果

```
┌──────────────────────────────────────────┐
│                                          │
│  🔍 没有找到匹配的感念                    │
│                                          │
│  试试:                                    │
│  · 换个关键词                             │
│  · 放宽筛选条件                           │
│  · [重置所有筛选]                         │
│                                          │
└──────────────────────────────────────────┘
```

### 6.3 AI 不可用

未配置 AI 或网络不可用时:
- 搜索框下方不显示「🤖 AI」模式切换
- 本地匹配不足时显示「尝试换个关键词」而非「AI 分析中」
- 推荐区只展示本地推荐，无 AI 推荐卡片

### 6.4 已归属感念的处理

当用户选中的感念已有归属时:

```
┌──────────────────────────────────────────┐
│  ℹ️ 你选的 4 条感念中，有 2 条已属于      │
│  其他脉络。加入新脉络不会从旧脉络移除。   │
│                                          │
│  [知道了]  [仅选择未归属的]               │
└──────────────────────────────────────────┘
```

---

## 7. 技术实现

### 7.1 新增文件清单

| 文件 | 用途 | 行数估算 |
|------|------|---------|
| `apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx` | 主页面 | ~400 |
| `apps/mobile/src/features/reflections/RecommendCard.tsx` | 推荐卡片组件 | ~120 |
| `apps/mobile/src/features/reflections/SelectionSummary.tsx` | 已选摘要组件 | ~60 |
| `packages/core/src/business/trail-creation.ts` | 分组/评分/叙事 | ~300 |
| `packages/core/src/ai/trail-recommender.ts` | AI 推荐+匹配 | ~150 |
| `packages/core/src/i18n/zh.ts` (修改) | 新增 i18n keys | ~20 行新增 |

### 7.2 修改的现有文件

| 文件 | 修改内容 |
|------|----------|
| `apps/mobile/src/navigation/types.ts` | 新增 `QuickCreateTrail` 路由 |
| `apps/mobile/src/navigation/index.tsx` | 注册路由 |
| `apps/mobile/src/features/reflections/MindTrailScreen.tsx` | "+" 按钮改为跳转 QuickCreateTrail |
| `packages/core/src/i18n/en.ts` | 新增英文 i18n keys |
| `packages/core/src/i18n/zh-Hant.ts` | 新增繁体 i18n keys |

### 7.3 i18n Keys

```typescript
// zh.ts 新增
quickCreateTrail: '快速创建脉络',
quickTrailSearchPlaceholder: '描述你想追踪的思路...',
quickTrailNamePlaceholder: '脉络名称（可选）',
quickTrailCreate: '创建脉络',
quickTrailReflections: '条感念',
quickTrailRecommend: '推荐思路链',
quickTrailMatch: '匹配结果',
quickTrailMatchLocal: '🔍 本地匹配',
quickTrailMatchAI: '🤖 AI 匹配',
quickTrailNoResults: '没有找到匹配的感念',
quickTrailTryAgain: '试试换个关键词或放宽筛选条件',
quickTrailResetFilters: '重置所有筛选',
quickTrailNotEnough: '你只有 {n} 条感念，还不足以发现有价值的思路链。',
quickTrailKeepRecording: '继续记录感念，当积累到 5 条以上时，系统会自动发现你的思维模式。',
quickTrailGoRecord: '去记录感念',
quickTrailManualCreate: '选择感念创建脉络',
quickTrailManualSelect: '手动选择',
quickTrailSelectAll: '全选',
quickTrailDeselectAll: '取消全选',
quickTrailOnlyUnassigned: '仅未归属',
quickTrailSelected: '已选 {n} 条',
quickTrailAssignedNotice: '{n} 条已属于其他脉络',
quickTrailAssignedExplain: '加入新脉络不会从旧脉络移除。',
quickTrailPresetMoodChange: '最近心情变化',
quickTrailPresetUnassigned: '未归属感念',
quickTrailPresetNight: '深夜思考',
quickTrailTrendUp: '上升',
quickTrailTrendDown: '下降',
quickTrailTrendFlat: '平稳',
quickTrailNarrativeDefault: '从{from}到{to}的{tag}之路',
quickTrailLocalMatch: '本地匹配',
quickTrailAIMatch: 'AI 匹配',
quickTrailAIAnalyzing: 'AI 分析中...',
quickTrailCollapse: '收起',
```

### 7.4 导航注册

```typescript
// navigation/types.ts 新增
export type RootStackParamList = {
  // ... 现有路由
  QuickCreateTrail: undefined;
};

// navigation/index.tsx 注册
<Stack.Screen
  name="QuickCreateTrail"
  component={QuickCreateTrailScreen}
  options={{ headerShown: false }}
/>
```

### 7.5 入口接入

```typescript
// MindTrailScreen.tsx — 修改 "+" 按钮
<TouchableOpacity onPress={() => nav.navigate('QuickCreateTrail')}>
  <Plus size={20} color={TH.primary} />
  <Text style={{ color: TH.primary }}>{T('quickCreateTrail')}</Text>
</TouchableOpacity>
```

### 7.6 trail-creation.ts 导出

```typescript
// packages/core/src/business/trail-creation.ts

// 候选池计算
export function computeCandidatePool(reflections, filters): MindReflection[];

// 推荐计算
export function computeRecommendations(candidates, allTrails): TrailRecommendation[];

// 维度检测
export function detectMoodNarrative(refs): TrailRecommendation | null;
export function detectTagFocus(refs): TrailRecommendation | null;
export function detectTimePattern(refs): TrailRecommendation | null;

// 评分
export function scoreGroup(refs): number;

// 叙事生成
export function generateNarrative(refs): string;
export function generateNarrativeName(refs): string;

// 情绪趋势
export function computeMoodTrend(refs): 'up' | 'down' | 'flat';

// 摘要压缩（供 AI 使用）
export function buildReflectionSummary(ref): string;

// 关键词匹配
export function matchByKeyword(query, candidates): MindReflection[];

// 类型定义
export interface TrailRecommendation { ... }
export interface TrailFilters { ... }
```

### 7.7 trail-recommender.ts 导出

```typescript
// packages/core/src/ai/trail-recommender.ts

import { getAIService } from './ai-service';
import { buildReflectionSummary } from '../business/trail-creation';

// AI 推荐
export async function recommendTrailsViaAI(
  reflections: MindReflection[],
  query?: string,
): Promise<AIRecommendation[]>;

// AI 匹配
export async function matchReflectionsToTopic(
  reflections: MindReflection[],
  topic: string,
): Promise<AIMatchResult[]>;

// 检查 AI 是否可用
export function isAIRecommendAvailable(): boolean;
```

---

## 8. 实现计划

### Phase 1: 基础框架 (本地优先)

- [ ] `trail-creation.ts` — 候选池计算 + 三个维度检测 + 评分 + 叙事生成
- [ ] `QuickCreateTrailScreen.tsx` — 页面框架 + 搜索框 + 筛选器
- [ ] `RecommendCard.tsx` — 推荐卡片组件（情绪时间线 + 趋势 + 叙事）
- [ ] 匹配结果列表（复用 ReflectionCard 样式 + 勾选）
- [ ] `SelectionSummary.tsx` — 已选摘要 + 命名 + 创建
- [ ] 推荐卡片展开为感念列表
- [ ] 空状态处理
- [ ] 导航注册 + 入口接入
- [ ] i18n

### Phase 2: AI 增强

- [ ] `trail-recommender.ts` — AI 推荐（摘要压缩 + LLM 调用）
- [ ] AI 对话匹配
- [ ] 本地/AI 自动切换
- [ ] AI 不可用降级

### Phase 3: 体验优化

- [ ] 筛选变化 → 推荐实时更新
- [ ] 创建后缺口提示（V2）
- [ ] 反思列表被动推荐（V2）

---

## 9. 与现有 design.md 的关系

本方案是 `design.md` 中 Phase 1「自动脉络发现」的具体落地方案。

| design.md 概述 | 本方案细化 |
|----------------|-----------|
| 「自动脉络发现（基于标签和时间窗口）」 | 具体的三条推荐维度 + 评分公式 + 伪代码 |
| 「脉络视图改造」中的自动发现区域 | 独立的快速创建页面，搜索引擎式入口 |
| AI 辅助中的「自动脉络发现」 | 摘要压缩 + LLM prompt 策略 |
| 冷启动问题 | 空状态引导 + 感念不足时退化为手动 |

本方案不涉及 `design.md` 中的 Intent 系统、复盘系统、四模块联动等更大范围的设计，聚焦于「快速创建脉络」这一个功能点。
