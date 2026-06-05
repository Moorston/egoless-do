## ADDED Requirements

### Requirement: 关联任务筛选
感念筛选系统 SHALL 支持按"关联任务"筛选，仅显示已关联计划任务且任务未删除的感念。

#### Scenario: 启用关联任务筛选
- **WHEN** 用户在 FilterDrawer 中点击"关联任务"按钮
- **THEN** 感念列表仅显示 `linkedPlanItemId` 存在且对应 planItem 未被删除的感念

#### Scenario: 关联任务筛选与其他条件组合
- **WHEN** 用户同时启用"关联任务"筛选和标签筛选
- **THEN** 结果为同时满足两个条件的感念（AND 关系）

#### Scenario: 关联任务筛选的动态计数
- **WHEN** FilterDrawer 展示"关联任务"按钮
- **THEN** 按钮旁显示满足该条件的感念数量

### Requirement: 移除已置顶筛选
感念筛选系统 SHALL 移除"已置顶"筛选条件。`ReflectionFilters` 类型中不再包含 `isPinned` 字段。

#### Scenario: FilterDrawer 不显示已置顶按钮
- **WHEN** 用户打开 FilterDrawer
- **THEN** "更多筛选"区域不显示"已置顶"按钮

#### Scenario: 已有 isPinned 筛选状态被忽略
- **WHEN** store 中残留 `isPinned: true` 的筛选状态
- **THEN** `filterReflections()` SHALL 忽略该字段，不做过滤

### Requirement: 置顶功能不受影响
感念的置顶功能（Pin 图标、togglePin 操作）SHALL 保持不变，仅移除筛选入口。

#### Scenario: 卡片仍显示置顶图标
- **WHEN** 感念的 `isPinned` 为 true
- **THEN** 卡片上仍显示 Pin 图标

#### Scenario: 详情页仍可切换置顶
- **WHEN** 用户在感念详情页点击置顶按钮
- **THEN** 置顶状态正常切换
