# trail-detail-layout Specification

## Purpose
TBD - created by archiving change trail-detail-layout-optimize. Update Purpose after archive.
## Requirements
### Requirement: 概览信息以紧凑行内形式展示
概览统计信息（感念数、反思数、日期跨度、心情趋势） SHALL 以单行文本形式展示在 header 下方，不使用独立卡片。

#### Scenario: 有内容时显示统计
- **WHEN** 脉络包含感念或反思
- **THEN** 显示格式为 "{n} 感念 + {m} 反思 · 日期范围 · 跨度 {d} 天 · 心情趋势"

#### Scenario: 无内容时隐藏
- **WHEN** 脉络没有任何感念和反思
- **THEN** 不显示概览行

### Requirement: 时间线置于页面顶部
时间线 SHALL 作为页面第一个主要区块，紧跟概览行之后。

#### Scenario: 进入页面立即可见时间线
- **WHEN** 用户进入脉络详情页
- **THEN** 时间线的第一条记录在首屏可见，无需滚动

### Requirement: 添加入口使用浮动操作按钮
写感念、选已有、写反思三个入口 SHALL 整合为一个浮动操作按钮（FAB），点击后弹出选项菜单。

#### Scenario: FAB 点击展开菜单
- **WHEN** 用户点击 FAB
- **THEN** 展开三个选项：写感念、选已有、写反思

#### Scenario: 选择选项后收起菜单
- **WHEN** 用户选择任一选项
- **THEN** 菜单收起，执行对应操作

#### Scenario: 点击其他区域收起菜单
- **WHEN** 菜单展开时用户点击其他区域
- **THEN** 菜单收起

### Requirement: AI 区域支持折叠
AI 洞察和复盘引导区域 SHALL 支持折叠/展开，默认收起。

#### Scenario: 无内容时显示生成按钮
- **WHEN** AI 洞察或复盘引导没有缓存内容
- **THEN** 显示"生成"按钮，不显示折叠控件

#### Scenario: 有内容时默认收起
- **WHEN** AI 洞察或复盘引导有缓存内容
- **THEN** 默认收起，显示摘要预览（第一行文字）

#### Scenario: 点击展开完整内容
- **WHEN** 用户点击已收起的 AI 区域
- **THEN** 展开显示完整内容

### Requirement: 底部区域紧凑化
关联计划和相关脉络区域 SHALL 使用更紧凑的样式，减少 padding 和 margin。

#### Scenario: 无内容时隐藏区域
- **WHEN** 没有关联计划任务或相关脉络
- **THEN** 对应区域完全隐藏，不显示空状态

#### Scenario: 有内容时紧凑展示
- **WHEN** 有关联计划或相关脉络
- **THEN** 使用较小的 padding（8px）和 margin，标题和内容更紧凑

### Requirement: 修复 trailNote 数据同步
`pullServerData` 方法 SHALL 拉取 `trailNote` 数据并合并到 store。

#### Scenario: 登录后拉取脉络感念
- **WHEN** 用户登录并触发数据同步
- **THEN** 服务器上的 trailNote 数据被拉取并合并到本地 store

