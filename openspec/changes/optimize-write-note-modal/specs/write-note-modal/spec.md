## ADDED Requirements

### Requirement: 内容输入区优化
复盘弹窗的内容输入区 SHALL 提供更大的写作空间和字数统计。

#### Scenario: 输入区高度增加
- **WHEN** 用户打开复盘弹窗
- **THEN** 内容输入区 minHeight 为 200px

#### Scenario: 字数统计显示
- **WHEN** 用户在内容输入区输入文字
- **THEN** 输入框右下角实时显示「已写 N 字」

### Requirement: 标签输入优化
复盘弹窗的标签输入 SHALL 合并为单输入框，回车添加。

#### Scenario: 回车添加标签
- **WHEN** 用户在标签输入框输入文字并按回车
- **THEN** 标签被添加到标签列表，输入框清空

#### Scenario: 重复标签不添加
- **WHEN** 用户输入已存在的标签并按回车
- **THEN** 标签不被添加

### Requirement: 心情选择优化
复盘弹窗的心情选择 SHALL 显示 emoji 和文字标签。

#### Scenario: 心情选项显示
- **WHEN** 用户查看心情选择区
- **THEN** 每个选项显示 emoji + 中文标签（如「😊 开心」）

### Requirement: 复盘思路展示
复盘弹窗 SHALL 展示 AI 生成的复盘思路，可折叠。

#### Scenario: 有复盘思路时展示
- **WHEN** 复盘弹窗接收 reviewPerspectives prop 且非空
- **THEN** 显示可折叠的复盘思路区块，默认展开

#### Scenario: 无复盘思路时不展示
- **WHEN** 复盘弹窗未接收 reviewPerspectives 或为空
- **THEN** 不显示复盘思路区块

### Requirement: 引导问题突出展示
引导式复盘时，引导问题 SHALL 作为独立高亮区块展示。

#### Scenario: 引导式复盘的引导问题
- **WHEN** 复盘弹窗有 guidedQuestion prop
- **THEN** 引导问题以大字加粗、独立高亮区块展示

### Requirement: 草稿保护
复盘弹窗 SHALL 在关闭时保护未保存的内容。

#### Scenario: 有内容时关闭确认
- **WHEN** 用户关闭弹窗且内容输入区非空
- **THEN** 弹出确认对话框「放弃当前草稿？」

#### Scenario: 无内容时直接关闭
- **WHEN** 用户关闭弹窗且内容输入区为空
- **THEN** 直接关闭弹窗
