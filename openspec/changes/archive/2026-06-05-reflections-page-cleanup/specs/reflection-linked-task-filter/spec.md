## MODIFIED Requirements

### Requirement: 置顶功能不受影响
感念的置顶功能（Pin 图标、togglePin 操作）SHALL 保持不变，仅移除筛选入口。

#### Scenario: 卡片不再显示置顶图标
- **WHEN** 感念的 `isPinned` 为 true
- **THEN** 卡片上不再显示 Pin 图标（移除徽章）

#### Scenario: 详情页不再显示置顶按钮
- **WHEN** 用户在感念详情页查看操作按钮
- **THEN** 不显示"置顶/取消置顶"按钮，改为显示"创建任务/解绑任务"按钮

### Requirement: 详情页创建任务/解绑任务
感念详情页 SHALL 提供创建任务和解绑任务的操作按钮。

#### Scenario: 未关联感念显示创建任务按钮
- **WHEN** 感念未关联计划任务（`linkedPlanItemId` 为空）
- **THEN** 详情页显示"创建任务"按钮

#### Scenario: 点击创建任务
- **WHEN** 用户在详情页点击"创建任务"按钮
- **THEN** 关闭详情弹窗，打开创建计划任务弹窗

#### Scenario: 已关联感念显示解绑任务按钮
- **WHEN** 感念已关联计划任务（`linkedPlanItemId` 存在）
- **THEN** 详情页显示"解绑任务"按钮

#### Scenario: 点击解绑任务
- **WHEN** 用户在详情页点击"解绑任务"按钮
- **THEN** 弹出确认对话框，确认后删除关联的计划任务并解除关联

### Requirement: 移除左滑手势
感念卡片 SHALL 不再支持左滑手势操作。所有操作通过长按菜单进入。

#### Scenario: 内联卡片无左滑
- **WHEN** 用户在感念列表中对卡片执行左滑
- **THEN** 无响应，不显示操作按钮

#### Scenario: ReflectionCard 无左滑
- **WHEN** 用户在任何使用 ReflectionCard 组件的场景中左滑
- **THEN** 无响应，不显示操作按钮

#### Scenario: 长按菜单仍可用
- **WHEN** 用户长按感念卡片
- **THEN** 显示操作菜单（编辑、创建/解绑任务、分享、删除）
