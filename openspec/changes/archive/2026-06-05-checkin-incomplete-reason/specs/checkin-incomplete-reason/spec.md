## ADDED Requirements

### Requirement: 未完成项检测
系统 SHALL 在用户点击"完成"按钮时，检测当日是否有未完成的打卡项（practices、inProgress habits、当日 planItems）。

#### Scenario: 全部完成时直接提交
- **WHEN** 用户点击"完成"且所有 practices、habits、planItems 均已完成
- **THEN** 系统直接执行 submitCheckin，不弹窗

#### Scenario: 有未完成项时弹窗
- **WHEN** 用户点击"完成"且存在至少一项未完成
- **THEN** 系统弹出原因选择弹窗，显示未完成项列表

#### Scenario: planItem 自动完成的不算未完成
- **WHEN** planItem 通过 linkedModule 自动完成（autoChecked）
- **THEN** 该项不计入未完成列表

### Requirement: 原因选择弹窗
弹窗 SHALL 显示未完成项列表，并要求用户选择一个统一原因（6 个预设选项），可选填补充说明。

#### Scenario: 选择原因并确认
- **WHEN** 用户在弹窗中选择一个原因（如"时间不够"）并点击"仍然完成"
- **THEN** 系统将 incompleteReason 写入 note JSON，设置 localDone=true，继续提交流程

#### Scenario: 点击返回
- **WHEN** 用户在弹窗中点击"返回继续打卡"
- **THEN** 弹窗关闭，localDone 保持 false/原值，用户可继续编辑打卡内容

#### Scenario: 补充说明必填
- **WHEN** 用户选择原因后不填写补充说明
- **THEN** 系统禁止提交，"仍然完成"按钮置灰不可点击

### Requirement: 原因持久化
系统 SHALL 将 incompleteReason（必填）和 incompleteNote（可选）写入 checkin note JSON 中。

#### Scenario: 新格式 note 包含原因
- **WHEN** 用户因未完成项选择了原因并提交
- **THEN** note JSON 中包含 `incompleteReason: "time"` 和可选的 `incompleteNote: "加班到很晚"`

#### Scenario: 向后兼容
- **WHEN** 旧版本应用读取包含 incompleteReason 的 note
- **THEN** 旧版本 JSON.parse 忽略未知字段，不影响现有功能

### Requirement: 打卡详情展示原因
打卡详情页（CheckinDetail）SHALL 在有 incompleteReason 时展示原因和补充说明。

#### Scenario: 查看有原因的打卡记录
- **WHEN** 用户查看一条包含 incompleteReason 的打卡记录
- **THEN** 详情页显示原因标签（如"⏰ 时间不够"）和补充说明（如有）

#### Scenario: 查看无原因的打卡记录
- **WHEN** 用户查看一条不包含 incompleteReason 的打卡记录
- **THEN** 详情页不显示原因区域

### Requirement: 原因统计
打卡统计弹窗（CheckinStatsModal）SHALL 展示当月未完成原因的分布统计。

#### Scenario: 有原因数据时显示分布
- **WHEN** 当月存在包含 incompleteReason 的打卡记录
- **THEN** 统计弹窗显示原因分布卡片（原因图标 + 名称 + 次数）

#### Scenario: 无原因数据时不显示
- **WHEN** 当月无 incompleteReason 数据
- **THEN** 统计弹窗不显示原因分布区域

### Requirement: Web 端交互统一
Web CheckinPage SHALL 移除 Done/Not Done toggle 和独立提交按钮，改为与 Mobile 一致的"完成"按钮直接提交模式。

#### Scenario: Web 端点击完成
- **WHEN** 用户在 Web CheckinPage 点击"完成"按钮
- **THEN** 系统执行与 Mobile 相同的检测→弹窗→提交流程

#### Scenario: Web 端未完成状态
- **WHEN** 用户不点击"完成"直接关闭页面
- **THEN** 不提交打卡记录（等同于"未完成"）

### Requirement: i18n 支持
系统 SHALL 为所有新增 UI 文本提供中英繁三语翻译。

#### Scenario: 中文环境显示
- **WHEN** 用户语言设置为中文
- **THEN** 弹窗标题、原因选项、按钮文本均显示中文

#### Scenario: 英文环境显示
- **WHEN** 用户语言设置为英文
- **THEN** 弹窗标题、原因选项、按钮文本均显示英文
