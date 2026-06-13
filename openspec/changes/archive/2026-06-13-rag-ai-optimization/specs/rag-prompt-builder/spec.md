## ADDED Requirements

### Requirement: RAG Prompt 构建
系统 SHALL 将检索结果和查询上下文组装为精简的 AI prompt，长度控制在 500 字符以内。

#### Scenario: 构建推荐 prompt
- **WHEN** 传入查询 "最近工作状态" 和 5 条检索结果
- **THEN** 系统生成包含角色设定、查询摘要、感念列表的 JSON 输出格式 prompt

#### Scenario: 构建查询解析 prompt
- **WHEN** 传入自然语言查询 "找找上周开心的事"
- **THEN** 系统生成包含查询意图解析指令的 prompt，输出筛选条件 JSON

### Requirement: 感念摘要格式化
系统 SHALL 将感念格式化为紧凑的摘要格式，包含日期、情绪、内容、标签。

#### Scenario: 单条感念格式化
- **WHEN** 传入一条感念 { timestamp: 1718000000000, mood: "开心", content: "今天项目上线", tags: ["工作"] }
- **THEN** 系统输出 "[2026-06-10] 开心 今天项目上线 [工作]"

#### Scenario: 内容截断
- **WHEN** 感念内容超过 100 字符
- **THEN** 系统截断至 100 字符并添加 "..."

### Requirement: Prompt 长度限制
系统 SHALL 确保生成的 prompt 总长度不超过 500 字符，超出时优先截断感念内容。

#### Scenario: 超长感念内容
- **WHEN** 5 条感念内容总长度超过 400 字符
- **THEN** 系统逐条截断感念内容直至总长度符合限制
