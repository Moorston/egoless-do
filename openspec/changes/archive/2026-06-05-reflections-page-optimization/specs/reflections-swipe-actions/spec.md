## ADDED Requirements

### Requirement: 左滑显示快捷操作

系统 SHALL 支持左滑卡片显示编辑和置顶操作按钮。

#### Scenario: 左滑显示操作按钮
- **WHEN** 用户左滑感念卡片超过 60px
- **THEN** 显示编辑和置顶两个操作按钮

#### Scenario: 松手自动吸附
- **WHEN** 用户松开手指
- **THEN** 卡片自动吸附回原位或展开位置

#### Scenario: 点击编辑按钮
- **WHEN** 用户点击左滑显示的编辑按钮
- **THEN** 打开编辑弹窗

#### Scenario: 点击置顶按钮
- **WHEN** 用户点击左滑显示的置顶按钮
- **THEN** 切换该感念的置顶状态

#### Scenario: 点击其他区域收起
- **WHEN** 用户点击左滑操作区域外的任意位置
- **THEN** 左滑操作自动收起

### Requirement: 置顶状态视觉反馈

系统 SHALL 在置顶按钮上显示当前置顶状态。

#### Scenario: 未置顶状态显示
- **WHEN** 感念未置顶
- **THEN** 置顶按钮显示"置顶"文字

#### Scenario: 已置顶状态显示
- **WHEN** 感念已置顶
- **THEN** 置顶按钮显示"取消"文字，颜色变化
