# recommendation-card Specification

## Purpose
TBD - created by archiving change optimize-trail-recommendations. Update Purpose after archive.
## Requirements
### Requirement: 推荐卡片交互

推荐卡片 SHALL 支持整卡点击展开，并在展开后展示推荐理由和操作按钮。

#### Scenario: 整卡点击展开
- **WHEN** 用户点击推荐卡片任意区域
- **THEN** 卡片展开显示详情
- **AND** 再次点击收起详情

#### Scenario: 展开内容
- **WHEN** 卡片处于展开状态
- **THEN** 展示以下内容：
  - 推荐理由区域（带 🤖 图标）
  - 感念数量统计
  - "快速创建"按钮
  - "不感兴趣"按钮

#### Scenario: 按钮点击不触发展开
- **WHEN** 用户点击"快速创建"或"不感兴趣"按钮
- **THEN** 执行按钮对应操作
- **AND** 不触发卡片展开/收起

#### Scenario: 快速创建跳转
- **WHEN** 用户点击"快速创建"按钮
- **THEN** 跳转到 QuickCreateTrailScreen
- **AND** 预选该推荐的 `reflectionIds`

#### Scenario: 不感兴趣反馈
- **WHEN** 用户点击"不感兴趣"按钮
- **THEN** 记录该推荐的模式到用户偏好
- **AND** 该卡片从推荐列表中移除

