## ADDED Requirements

### Requirement: CreatePlanFromReflectionModal 独立组件
系统 SHALL 将 ReflectionsScreen 中的内联弹窗提取为独立 `CreatePlanFromReflectionModal` 组件。

#### Scenario: 打开弹窗
- **WHEN** 用户点击感念详情中的"创建计划任务"按钮
- **THEN** 从底部弹出 CreatePlanFromReflectionModal

#### Scenario: 预设感念上下文
- **WHEN** 弹窗打开
- **THEN** 自动填充任务名称为感念标题+" - 复盘"，并显示该感念的标签为只读 chips

#### Scenario: 必填目标指标
- **WHEN** 渲染弹窗内容
- **THEN** 目标指标字段为必填，placeholder 为"例如：每周复盘3次"

#### Scenario: 取消创建
- **WHEN** 用户点击"取消"按钮
- **THEN** 弹窗关闭，不创建任何记录

#### Scenario: 成功创建
- **WHEN** 用户填写表单后点击"创建"
- **THEN** 系统调用统一 action，创建 plan item，自动关联到该感念，弹窗关闭
- **AND** 感念的 linkedPlanItemId 更新为新创建的 planItem.id

#### Scenario: 创建失败提示
- **WHEN** 创建过程中发生错误
- **THEN** 显示错误提示 toast，弹窗不关闭

#### Scenario: 底部弹出样式
- **WHEN** 弹窗可见
- **THEN** 从屏幕底部滑入，背景半透明遮罩
