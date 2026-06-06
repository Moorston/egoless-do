## ADDED Requirements

### Requirement: 思路脉络数据模型

系统 SHALL 支持创建和管理思路脉络（ThoughtTrail）。

#### Scenario: 创建思路脉络
- **WHEN** 用户创建新的思路脉络
- **THEN** 系统创建 ThoughtTrail 对象，包含 id、name、description、reflectionIds、createdAt、updatedAt

#### Scenario: 思路脉络命名
- **WHEN** 用户未指定名称
- **THEN** 系统自动使用第一个标签作为名称，无标签时使用内容前 20 字

#### Scenario: 用户修改名称
- **WHEN** 用户修改思路脉络名称
- **THEN** 系统更新 ThoughtTrail 的 name 字段

### Requirement: 关联感念到思路脉络

系统 SHALL 支持将感念关联到思路脉络。

#### Scenario: 添加感念到思路脉络
- **WHEN** 用户将感念添加到思路脉络
- **THEN** 系统将感念 ID 添加到 ThoughtTrail.reflectionIds，并将思路脉络 ID 添加到 MindReflection.thoughtTrailIds

#### Scenario: 从思路脉络移除感念
- **WHEN** 用户从思路脉络移除感念
- **THEN** 系统从 ThoughtTrail.reflectionIds 移除感念 ID，并从 MindReflection.thoughtTrailIds 移除思路脉络 ID

#### Scenario: 一个感念属于多条思路脉络
- **WHEN** 感念已属于某条思路脉络
- **THEN** 系统允许将该感念添加到其他思路脉络

### Requirement: 思路脉络排序

系统 SHALL 支持调整思路脉络中感念的顺序。

#### Scenario: 调整感念顺序
- **WHEN** 用户调整思路脉络中感念的顺序
- **THEN** 系统更新 ThoughtTrail.reflectionIds 的顺序

### Requirement: 删除思路脉络

系统 SHALL 支持删除思路脉络。

#### Scenario: 删除思路脉络
- **WHEN** 用户删除思路脉络
- **THEN** 系统删除 ThoughtTrail 对象，并从所有关联感念的 thoughtTrailIds 中移除该思路脉络 ID

### Requirement: 从感念详情页创建

系统 SHALL 支持从感念详情页创建思路脉络。

#### Scenario: 添加到已有思路脉络
- **WHEN** 用户在感念详情页选择"添加到思路脉络"
- **THEN** 系统显示已有思路脉络列表，用户选择后将感念添加到选中的思路脉络

#### Scenario: 新建思路脉络
- **WHEN** 用户在感念详情页选择"新建思路脉络"
- **THEN** 系统显示新建表单，自动填充名称，用户确认后创建思路脉络并添加当前感念
