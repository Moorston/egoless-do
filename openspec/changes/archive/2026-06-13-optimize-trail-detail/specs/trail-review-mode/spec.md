## ADDED Requirements

### Requirement: 复盘问题内联回答
系统 SHALL 支持用户在复盘引导问题下方直接输入回答，无需弹出独立 Modal。

#### Scenario: 内联回答复盘问题
- **WHEN** 用户点击某个复盘引导问题
- **THEN** 问题下方展开文本输入框，用户可直接输入并保存

### Requirement: 复盘完成度追踪
系统 SHALL 跟踪用户已回答的复盘问题数量，以进度条形式展示。

#### Scenario: 完成度展示
- **WHEN** 复盘区域展开
- **THEN** 显示 "已回答 2/3 个问题" 的进度信息

### Requirement: 多次复盘对比
系统 SHALL 保存历史复盘记录，支持用户查看两次复盘之间的答案变化。

#### Scenario: 对比两次复盘
- **WHEN** 用户点击"对比历史复盘"
- **THEN** 并排显示最近两次复盘的问题和回答
