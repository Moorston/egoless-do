# on-demand-ai-search Specification

## Purpose
本地优先搜索流程 + AI 按需触发能力。默认只执行 RAG 本地检索，用户主动点击 AI 按钮后才触发 AI 搜索。

## Requirements

### Requirement: 本地优先搜索流程

系统 SHALL 在快速创建脉络页面默认只执行 Phase 1 RAG 本地检索，不自动触发 AI 搜索。

#### Scenario: 输入后仅本地检索
- **WHEN** 用户在搜索输入框中输入查询并点击搜索
- **THEN** 系统仅执行 Phase 1 RAG 本地检索
- **AND** 不自动触发 Phase 2（意图理解）和 Phase 3（语义扩展）

#### Scenario: 本地检索结果展示
- **WHEN** RAG 本地检索完成
- **THEN** 系统展示本地检索结果（标记为 direct）
- **AND** 在左下角显示 AI 搜索按钮

### Requirement: AI 按需触发

系统 SHALL 在左下角提供 AI 搜索悬浮按钮，用户点击后触发 Phase 2 + Phase 3。

#### Scenario: AI 按钮显示时机
- **WHEN** 搜索输入框有内容
- **THEN** 在左下角显示 AI 搜索悬浮按钮

#### Scenario: AI 按钮隐藏时机
- **WHEN** 搜索输入框为空
- **THEN** 隐藏 AI 搜索按钮

#### Scenario: 点击 AI 按钮触发搜索
- **WHEN** 用户点击 AI 搜索按钮
- **THEN** 系统执行 Phase 2（意图理解）+ Phase 3（语义扩展）
- **AND** AI 搜索结果追加到本地结果后面（标记为 extended）
- **AND** 不替换已有的本地检索结果

#### Scenario: AI 按钮加载状态
- **WHEN** AI 搜索正在执行
- **THEN** AI 按钮显示加载动画
- **AND** 按钮不可重复点击
