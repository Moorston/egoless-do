## ADDED Requirements

### Requirement: AI 自然语言查询解析
系统 SHALL 提供 `parseSmartQuery` 函数，接收用户自然语言输入和感念列表，返回结构化的查询解析结果。

函数签名：
```ts
interface SmartQueryResult {
  filters: {
    timeRange?: 'week' | 'month' | '3months' | 'all';
    tags?: string[];
    moods?: string[];
    keywords?: string[];
  };
  intent: 'filter' | 'analyze' | 'explore';
  question?: string | null;
  topic?: string;
}

function parseSmartQuery(
  reflections: MindReflection[],
  input: string,
  history?: string[],
): Promise<SmartQueryResult>
```

#### Scenario: 解析包含时间和标签的自然语言
- **WHEN** 用户输入 "上个月关于工作的感念"
- **THEN** 系统调用 AI 解析，返回 `{ filters: { timeRange: 'month', tags: ['#工作'] }, intent: 'filter', question: null, topic: '工作相关感念' }`

#### Scenario: 解析抽象意图
- **WHEN** 用户输入 "我最近是不是在进步"
- **THEN** 系统返回 `{ intent: 'analyze', topic: '个人成长进步趋势', filters: { timeRange: 'month' } }`

#### Scenario: 解析模糊描述
- **WHEN** 用户输入 "压力大的感念" 且感念中同时存在 #工作压力 和 #生活压力
- **THEN** 系统返回 `{ question: "你说的压力是指：A.工作压力 B.生活压力 C.都有", intent: 'filter' }`

#### Scenario: AI 不可用时降级
- **WHEN** 用户未配置 AI 或网络不可用
- **THEN** 系统返回 `{ intent: 'filter', filters: {}, question: null, topic: input }`，前端回退到现有本地匹配

### Requirement: 多轮对话追问
系统 SHALL 支持 AI 追问机制。当 AI 返回 `question` 非空时，前端以气泡形式展示追问，用户回答后将对话历史传入下一次调用。

#### Scenario: AI 追问并获得回答
- **WHEN** AI 返回 `question: "你说的缓解是指：A.心情变好 B.事情有进展"` 且用户选择 A
- **THEN** 系统将回答追加到对话历史，再次调用 `parseSmartQuery`，AI 基于上下文更新解析结果

#### Scenario: 对话轮次上限
- **WHEN** 对话历史已达 3 轮
- **THEN** 系统不再展示追问，直接使用当前解析结果执行搜索

#### Scenario: 用户跳过追问
- **WHEN** AI 返回追问但用户直接修改输入框内容并发送
- **THEN** 系统清空对话历史，以新输入重新解析

### Requirement: 解析结果可视化
系统 SHALL 将解析出的过滤器以可编辑标签形式展示在输入框下方。

#### Scenario: 显示解析出的过滤器标签
- **WHEN** AI 返回 `filters: { timeRange: 'month', tags: ['#工作'], moods: ['焦虑'] }`
- **THEN** 输入框下方显示标签 `📅上个月` `🏷#工作` `📈焦虑`

#### Scenario: 移除过滤器标签
- **WHEN** 用户点击某个过滤器标签的关闭按钮
- **THEN** 该标签被移除，对应过滤条件从搜索中排除，结果实时更新

#### Scenario: 手动添加过滤器
- **WHEN** 用户点击过滤器区域的 "+" 按钮
- **THEN** 展开现有的时间/标签/心情下拉选择器，用户手动添加过滤条件

### Requirement: 智能模式切换
QuickCreateTrailScreen 的搜索模式 SHALL 从手动切换（本地/AI）改为智能模式。输入包含自然语言时自动使用 AI 解析，短关键词时使用本地匹配。

#### Scenario: 短关键词走本地匹配
- **WHEN** 用户输入 "工作"（2个字以内）
- **THEN** 系统使用本地 `matchByKeyword` 匹配，不调用 AI

#### Scenario: 自然语言走 AI 解析
- **WHEN** 用户输入超过 6 个字的自然语言
- **THEN** 系统调用 `parseSmartQuery` 进行 AI 解析

#### Scenario: AI 解析失败降级
- **WHEN** `parseSmartQuery` 抛出异常或返回无效结果
- **THEN** 系统回退到本地 `matchByKeyword` 匹配，用户无感知
