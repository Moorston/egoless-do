## ADDED Requirements

### Requirement: AI 分析面板合并展示
复盘 tab 的 AI 洞察和复盘引导 SHALL 合并为一个「AI 分析」面板，内部分段切换「洞察 / 引导」两个子 tab。

#### Scenario: 面板默认显示洞察
- **WHEN** 用户进入复盘 tab 且 insightCache 存在
- **THEN** AI 面板默认展开并显示洞察内容

#### Scenario: 仅有引导缓存时默认显示引导
- **WHEN** 用户进入复盘 tab 且仅有 reviewCache（无 insightCache）
- **THEN** AI 面板默认展开并显示引导内容

#### Scenario: 均无缓存时显示生成按钮
- **WHEN** 用户进入复盘 tab 且 insightCache 和 reviewCache 均不存在
- **THEN** AI 面板显示并排的「生成洞察」和「生成引导」按钮

### Requirement: 复盘笔记简洁卡片样式
复盘笔记 SHALL 使用简洁卡片样式展示，不再使用时间线的点线连接。

#### Scenario: 笔记卡片显示引导问题
- **WHEN** 复盘笔记的 source 为 'guided' 且有 guidedQuestion
- **THEN** 卡片顶部显示引导问题作为标题

#### Scenario: 笔记卡片内容截断
- **WHEN** 复盘笔记内容超过 2 行
- **THEN** 卡片截断显示摘要，点击展开全文

### Requirement: 空状态引导
复盘 tab 在无内容时 SHALL 显示引导文案。

#### Scenario: 无复盘笔记时显示引导
- **WHEN** 当前脉络无复盘笔记
- **THEN** 显示居中引导文案和写复盘入口
